const CACHE_NAME = "lkpp-antrian-shell-v3";
const PUSH_CALLING_PARAM = "push";
const PUSH_CALLING_VALUE = "calling";
const PUSH_CALLING_ID_PARAM = "callingId";
const PUSH_CALLING_SIGNATURE_PARAM = "callingSig";
const PUSH_CALLING_CLIENT_MESSAGE_TYPE = "lkpp-calling-push";
const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/favicon.ico?v=lkpp-20260614",
  "/manifest.webmanifest",
  "/brand/logo-lkpp.png",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.destination === "image" || request.destination === "manifest") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clonedResponse = response.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkResponse;
      }),
    );
  }
});

function normalizePushAppointment(payload) {
  const appointment =
    payload &&
    typeof payload === "object" &&
    payload.appointment &&
    typeof payload.appointment === "object"
      ? payload.appointment
      : payload;

  if (!appointment || typeof appointment !== "object") {
    return null;
  }

  const id = typeof appointment.id === "string" ? appointment.id.trim() : "";
  const title = typeof appointment.title === "string" ? appointment.title.trim() : "";
  const body = typeof appointment.body === "string" ? appointment.body.trim() : "";

  if (!id || !title || !body) {
    return null;
  }

  const tag =
    typeof appointment.tag === "string" && appointment.tag.trim()
      ? appointment.tag.trim()
      : `lkpp-calling-${id}`;
  const url =
    typeof appointment.url === "string" && appointment.url.trim()
      ? appointment.url.trim()
      : "/jadwal-saya";
  const queueNumber =
    typeof appointment.queueNumber === "string" ? appointment.queueNumber.trim() : "";
  const serviceTitle =
    typeof appointment.serviceTitle === "string" ? appointment.serviceTitle.trim() : "";
  const unitLabel =
    typeof appointment.unitLabel === "string" ? appointment.unitLabel.trim() : "";
  const callCount =
    typeof appointment.callCount === "number" && Number.isFinite(appointment.callCount)
      ? appointment.callCount
      : 0;
  const counterId =
    typeof appointment.counterId === "number" && Number.isFinite(appointment.counterId)
      ? appointment.counterId
      : undefined;

  return {
    id,
    title,
    body,
    tag,
    url,
    queueNumber,
    serviceTitle,
    unitLabel,
    callCount,
    counterId,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isCallingNotificationTag(tag) {
  return typeof tag === "string" && tag.trim().startsWith("lkpp-calling-");
}

async function closeCallingNotifications(exceptTag) {
  const notifications = await self.registration.getNotifications().catch(() => []);
  notifications.forEach((notification) => {
    const currentTag =
      typeof notification.tag === "string" ? notification.tag.trim() : "";
    if (!isCallingNotificationTag(currentTag)) {
      return;
    }

    if (exceptTag && currentTag === exceptTag) {
      return;
    }

    notification.close();
  });
}

function extractCallingSignatureFromTag(tag) {
  const normalizedTag = typeof tag === "string" ? tag.trim() : "";
  if (!normalizedTag.startsWith("lkpp-calling-")) {
    return "";
  }

  return normalizedTag.slice("lkpp-calling-".length).trim();
}

function extractAppointmentIdFromPath(path) {
  const match =
    typeof path === "string" ? path.match(/\/jadwal-saya\/([^/?#]+)/i) : null;
  return match && typeof match[1] === "string" ? match[1].trim() : "";
}

function buildNotificationTargetUrl(path, tag) {
  const targetUrl = new URL(path, self.location.origin);
  const appointmentId = extractAppointmentIdFromPath(targetUrl.pathname);
  const signature = extractCallingSignatureFromTag(tag);

  targetUrl.searchParams.set(PUSH_CALLING_PARAM, PUSH_CALLING_VALUE);
  if (appointmentId) {
    targetUrl.searchParams.set(PUSH_CALLING_ID_PARAM, appointmentId);
  }
  if (signature) {
    targetUrl.searchParams.set(PUSH_CALLING_SIGNATURE_PARAM, signature);
  }

  return targetUrl.toString();
}

async function fetchCurrentCallingAppointment() {
  const retryDelays = [0, 250, 700, 1400];

  for (const retryDelay of retryDelays) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }

    const response = await fetch(new URL("/api/push/current-calling", self.location.origin), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);

    if (!response || !response.ok) {
      continue;
    }

    const payload = await response.json().catch(() => null);
    const appointment = normalizePushAppointment(payload);
    if (appointment) {
      return appointment;
    }
  }

  return null;
}

function broadcastCallingAppointmentToClients(clients, appointment) {
  clients.forEach((client) => {
    if (typeof client?.postMessage === "function") {
      client.postMessage({
        type: PUSH_CALLING_CLIENT_MESSAGE_TYPE,
        appointment,
      });
    }
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let appointment = null;

      try {
        appointment = normalizePushAppointment(event.data?.json());
      } catch {
        appointment = null;
      }

      if (!appointment) {
        appointment = await fetchCurrentCallingAppointment();

        if (!appointment) {
          return;
        }
      }

      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      broadcastCallingAppointmentToClients(windowClients, appointment);

      const tag = appointment.tag;
      await closeCallingNotifications();

      await self.registration.showNotification(appointment.title, {
        body: appointment.body,
        icon: "/pwa/icon-192.png",
        badge: "/pwa/icon-192.png",
        tag,
        requireInteraction: true,
        renotify: true,
        vibrate: [200, 120, 200, 120, 320],
        data: { url: appointment.url, appointment },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath =
    typeof event.notification.data?.url === "string" && event.notification.data.url
      ? event.notification.data.url
      : "/dashboard";
  const appointment = normalizePushAppointment(event.notification.data?.appointment);
  const targetUrl = buildNotificationTargetUrl(targetPath, event.notification.tag);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client && client.url === targetUrl) {
            return client.focus().then(() => {
              if (appointment && typeof client.postMessage === "function") {
                client.postMessage({
                  type: PUSH_CALLING_CLIENT_MESSAGE_TYPE,
                  appointment,
                  openedFromNotification: true,
                });
              }
            });
          }

          if ("navigate" in client && "focus" in client) {
            return client.navigate(targetUrl).then(() =>
              client.focus().then(() => {
                if (appointment && typeof client.postMessage === "function") {
                  client.postMessage({
                    type: PUSH_CALLING_CLIENT_MESSAGE_TYPE,
                    appointment,
                    openedFromNotification: true,
                  });
                }
              }),
            );
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
