(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isEmailLookup(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isQueueReferenceLookup(value) {
    return /^[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,}$/i.test(value);
  }

  function statusToneClass(status) {
    switch (status) {
      case "dipanggil":
        return "bg-sky-50 text-sky-700";
      case "selesai":
        return "bg-emerald-50 text-emerald-700";
      case "dibatalkan":
        return "bg-rose-50 text-rose-700";
      case "tidak-hadir":
      case "warning":
        return "bg-amber-50 text-amber-800";
      case "danger":
        return "bg-rose-50 text-rose-700";
      case "aktif":
        return "bg-role-accent-soft text-role-accent-strong";
      case "diproses":
      case "dijadwalkan":
      case "menunggu":
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function renderNotice(title, description, tone) {
    var toneClass =
      tone === "warning"
        ? "bg-amber-50/80 text-amber-800"
        : tone === "danger"
          ? "bg-rose-50/80 text-rose-700"
          : "bg-role-accent-soft/80 text-role-accent-strong";

    return (
      '<div class="flex items-start gap-3 rounded-[var(--radius-xl)] px-4 py-3 text-sm ' +
      toneClass +
      '">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 size-4 shrink-0"><path d="M20 6 9 17l-5-5"></path><path d="M14 6h6v6"></path></svg>' +
      '<div class="space-y-1">' +
      '<p class="font-semibold">' + escapeHtml(title) + "</p>" +
      '<p class="leading-6 opacity-90">' + escapeHtml(description) + "</p>" +
      "</div>" +
      "</div>"
    );
  }

  function renderLoading(lookup) {
    return (
      '<div class="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-5 py-8 text-center">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="size-6 animate-spin text-role-accent"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-20"></circle><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" class="opacity-90"></path></svg>' +
      '<div class="space-y-1">' +
      '<p class="font-semibold text-foreground">Memeriksa status antrean</p>' +
      '<p class="text-sm leading-6 text-muted-foreground">Mohon tunggu, kami sedang mencari antrean untuk ' +
      escapeHtml(lookup) +
      ".</p>" +
      "</div>" +
      "</div>"
    );
  }

  function renderMatches(matches) {
    var primary = matches[0];
    var history = matches.slice(1);
    var historyVisible = history.slice(0, 4);

    function renderPrimaryCard(item) {
      var callText =
        item.status === "calling" && item.counterId
          ? "Sedang dipanggil ke loket " + escapeHtml(item.counterId)
          : item.callCount > 0
            ? escapeHtml(item.callCount) + " kali panggilan"
            : "Belum ada panggilan";

      return (
        '<div class="rounded-[var(--radius-2xl)] border border-border bg-surface-container-low px-5 py-5">' +
        '<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">' +
        '<div class="space-y-1">' +
        '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-role-accent">Antrean utama</p>' +
        '<p class="font-heading text-2xl font-bold tracking-tight text-foreground">' +
        escapeHtml(item.queueNumber) +
        "</p>" +
        '<p class="text-sm font-semibold leading-6 text-foreground">' +
        escapeHtml(item.serviceTitle) +
        "</p>" +
        '<p class="text-sm leading-6 text-muted-foreground">' +
        escapeHtml(item.unitLabel) +
        " • " +
        escapeHtml(item.dateLabel) +
        " • " +
        escapeHtml(item.timeRange) +
        "</p>" +
        "</div>" +
        '<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' +
        statusToneClass(item.statusBadge) +
        '">' +
        escapeHtml(item.statusLabel) +
        "</span>" +
        "</div>" +
        '<div class="mt-4 grid gap-3 md:grid-cols-3">' +
        '<div class="rounded-[var(--radius-xl)] border border-border bg-surface-container-lowest px-4 py-3">' +
        '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</p>' +
        '<p class="mt-2 text-sm leading-6 text-foreground">' +
        escapeHtml(item.summaryNote) +
        "</p>" +
        "</div>" +
        '<div class="rounded-[var(--radius-xl)] border border-border bg-surface-container-lowest px-4 py-3">' +
        '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Kehadiran</p>' +
        '<p class="mt-2 text-sm leading-6 text-foreground">' +
        (item.checkedIn ? "Sudah check-in" : "Belum check-in") +
        "</p>" +
        "</div>" +
        '<div class="rounded-[var(--radius-xl)] border border-border bg-surface-container-lowest px-4 py-3">' +
        '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Panggilan</p>' +
        '<p class="mt-2 text-sm leading-6 text-foreground">' +
        callText +
        "</p>" +
        "</div>" +
        "</div>" +
        "</div>"
      );
    }

    function renderHistoryRow(item) {
      return (
        '<div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">' +
        '<div class="space-y-1">' +
        '<p class="font-semibold text-foreground">' +
        escapeHtml(item.queueNumber) +
        "</p>" +
        '<p class="text-sm leading-6 text-foreground">' +
        escapeHtml(item.serviceTitle) +
        "</p>" +
        '<p class="text-sm leading-6 text-muted-foreground">' +
        escapeHtml(item.dateLabel) +
        " • " +
        escapeHtml(item.timeRange) +
        "</p>" +
        "</div>" +
        '<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' +
        statusToneClass(item.statusBadge) +
        '">' +
        escapeHtml(item.statusLabel) +
        "</span>" +
        "</div>"
      );
    }

    return (
      '<div class="space-y-4">' +
      renderPrimaryCard(primary) +
      (history.length > 0
        ? '<div class="rounded-[var(--radius-2xl)] border border-border bg-surface-container-lowest">' +
          '<div class="border-b border-border px-4 py-3">' +
          '<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Riwayat antrean lainnya</p>' +
          '<p class="mt-1 text-sm leading-6 text-muted-foreground">Antrean lain milik email ini yang jatuh pada hari ini tetap ditampilkan agar tidak tertukar dengan antrean yang sedang aktif atau terbaru.</p>' +
          (history.length > historyVisible.length
            ? '<p class="mt-1 text-xs leading-5 text-muted-foreground">Menampilkan ' +
              historyVisible.length +
              ' dari ' +
              history.length +
              ' antrean lainnya.</p>'
            : '') +
          "</div>" +
          '<div class="divide-y divide-border">' +
          historyVisible.map(renderHistoryRow).join("") +
          "</div>" +
          "</div>"
        : "") +
      "</div>"
    );
  }

  window.initLandingQueueLookup = function initLandingQueueLookup() {
    var root = document.getElementById("landing-queue-check-root");
    if (!root || root.__lkppLookupBound === true) {
      return;
    }

    root.__lkppLookupBound = true;

    var form = root.querySelector("[data-landing-queue-form]");
    var input = root.querySelector("#landing-queue-lookup");
    var error = root.querySelector("[data-landing-queue-error]");
    var submitButton = root.querySelector("[data-landing-queue-submit]");
    var dialog = root.querySelector("#landing-queue-dialog");
    var dialogTitle = root.querySelector("#landing-queue-dialog-title");
    var dialogDescription = root.querySelector("#landing-queue-dialog-description");
    var dialogBody = root.querySelector("#landing-queue-dialog-body");
    var closeButtons = root.querySelectorAll("[data-landing-queue-close]");

    if (!form || !input || !error || !submitButton || !dialog || !dialogTitle || !dialogDescription || !dialogBody) {
      return;
    }

    var defaultButtonContent = submitButton.innerHTML;

    function openDialog() {
      dialog.classList.remove("hidden");
      dialog.classList.add("flex");
      dialog.setAttribute("aria-hidden", "false");
      document.body.classList.add("overflow-hidden");
    }

    function closeDialog() {
      dialog.classList.add("hidden");
      dialog.classList.remove("flex");
      dialog.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overflow-hidden");
    }

    function clearError() {
      error.textContent = "";
      error.classList.add("hidden");
      input.setAttribute("aria-invalid", "false");
    }

    function setError(message) {
      error.textContent = message;
      error.classList.remove("hidden");
      input.setAttribute("aria-invalid", "true");
    }

    function setButtonLoading(loading) {
      submitButton.disabled = loading;
      submitButton.setAttribute("aria-busy", loading ? "true" : "false");
      submitButton.innerHTML = loading
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="size-4 animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-20"></circle><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" class="opacity-90"></path></svg><span>Memeriksa...</span>'
        : defaultButtonContent;
    }

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeDialog);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dialog.getAttribute("aria-hidden") === "false") {
        closeDialog();
      }
    });

    input.addEventListener("input", clearError);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var normalized = String(input.value || "").trim().replace(/\s+/g, " ");
      var shouldLimitToToday = isEmailLookup(normalized);
      clearError();

      if (!normalized) {
        setError("Masukkan email terdaftar atau nomor antrean terlebih dahulu.");
        return;
      }

      if (!isEmailLookup(normalized) && !isQueueReferenceLookup(normalized)) {
        setError("Gunakan email terdaftar atau nomor antrean yang valid.");
        return;
      }

      openDialog();
      dialogTitle.textContent = "Hasil cek antrean";
      dialogDescription.textContent = "Sedang memeriksa data untuk " + normalized + "...";
      dialogBody.innerHTML = renderLoading(normalized);
      setButtonLoading(true);

      try {
        var response = await fetch("/api/public/queue-lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            lookup: normalized,
            todayOnly: shouldLimitToToday,
          }),
        });

        var payload = await response.json().catch(function () {
          return {};
        });

        if (!response.ok || !payload.ok) {
          dialogDescription.textContent = "Status antrean belum bisa ditampilkan.";
          dialogBody.innerHTML = renderNotice(
            "Cek antrean belum berhasil",
            payload.error || "Gagal memeriksa status antrean.",
            "warning",
          );
          return;
        }

        if (Array.isArray(payload.matches) && payload.matches.length > 0) {
          dialogDescription.textContent = "Hasil untuk " + normalized;
          dialogBody.innerHTML = renderMatches(payload.matches);
          return;
        }

        dialogDescription.textContent = shouldLimitToToday
          ? "Belum ada antrean untuk hari ini pada email tersebut."
          : "Belum ada antrean yang cocok dengan data yang Anda masukkan.";
        dialogBody.innerHTML = renderNotice(
          "Antrean belum ditemukan",
          shouldLimitToToday
            ? "Email terdaftar belum memiliki antrean pada hari ini. Periksa kembali email atau coba nomor antrean jika ingin melihat jadwal tertentu."
            : "Periksa kembali email terdaftar atau nomor antrean Anda, lalu coba cek lagi.",
          "warning",
        );
      } catch (error) {
        dialogDescription.textContent = "Status antrean belum bisa ditampilkan.";
        dialogBody.innerHTML = renderNotice(
          "Cek antrean belum berhasil",
          error instanceof Error ? error.message : "Gagal memeriksa status antrean.",
          "warning",
        );
      } finally {
        setButtonLoading(false);
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.initLandingQueueLookup();
    });
  } else {
    window.initLandingQueueLookup();
  }
})();
