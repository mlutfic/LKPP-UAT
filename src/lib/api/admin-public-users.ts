export type AdminPublicUserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  asalInstansi: string;
  namaInstansi: string;
  nik: string;
  provinsi: string;
  kabupatenKota: string;
  photoUrl: string;
  authUserId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  verificationStatus: "verified" | "unverified";
  profileComplete: boolean;
  readyForLogin: boolean;
  createdAt: string;
};

export type AdminPublicUserUpsertPayload = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  asalInstansi?: string;
  namaInstansi?: string;
  nik?: string;
  provinsi?: string;
  kabupatenKota?: string;
};

type AdminPublicUsersResponse = {
  ok?: boolean;
  error?: string;
  items?: AdminPublicUserRecord[];
  user?: AdminPublicUserRecord;
  generatedAt?: string;
};

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as AdminPublicUsersResponse;
}

async function assertResponse(response: Response) {
  const payload = await readJson(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Permintaan pengguna umum admin gagal.");
  }

  return payload;
}

export async function getAdminPublicUsers() {
  const response = await fetch("/api/admin/public-users", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await assertResponse(response);
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
  };
}

export async function createAdminPublicUser(
  payload: AdminPublicUserUpsertPayload,
) {
  const response = await fetch("/api/admin/public-users", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await assertResponse(response);
  if (!result.user) {
    throw new Error("Data pengguna baru tidak ditemukan pada respons.");
  }

  return result.user;
}

export async function updateAdminPublicUser(
  userId: string,
  payload: AdminPublicUserUpsertPayload,
) {
  const response = await fetch(`/api/admin/public-users/${userId}`, {
    method: "PUT",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await assertResponse(response);
  if (!result.user) {
    throw new Error("Data pengguna hasil pembaruan tidak ditemukan.");
  }

  return result.user;
}

export async function deleteAdminPublicUser(userId: string) {
  const response = await fetch(`/api/admin/public-users/${userId}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await assertResponse(response);
  if (!result.user) {
    throw new Error("Data pengguna yang dihapus tidak ditemukan.");
  }

  return result.user;
}
