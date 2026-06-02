import { readMockSession } from "@/lib/mock-auth";

export const MOCK_USER_PROFILE_STORAGE_KEY = "lkpp-user-profile-mock";
export const MOCK_USER_PROFILE_EVENT = "lkpp-user-profile-updated";

export type MockUserProfile = {
  name: string;
  email: string;
  phone: string;
  asalInstansi: string;
  namaInstansi: string;
  nik: string;
  provinsi: string;
  kabupatenKota: string;
};

export const USER_PROFILE_REQUIRED_LABELS = {
  name: "Nama Lengkap",
  phone: "Nomor WhatsApp",
  asalInstansi: "Kategori Instansi",
  namaInstansi: "Nama Instansi",
  nik: "NIK",
  provinsi: "Provinsi",
  kabupatenKota: "Kabupaten/Kota",
} as const;

export const USER_ASAL_INSTANSI_OPTIONS = [
  "ASN / TNI / Polri",
  "Penyedia / Pengusaha",
  "Mahasiswa",
  "Organisasi Masyarakat",
  "Lainnya",
] as const;

export const USER_REGION_OPTIONS: Record<string, string[]> = {
  Aceh: [
    "Banda Aceh",
    "Aceh Besar",
    "Langsa",
    "Lhokseumawe",
    "Sabang",
  ],
  "Sumatera Utara": [
    "Medan",
    "Binjai",
    "Deli Serdang",
    "Pematangsiantar",
    "Tapanuli Utara",
  ],
  "Sumatera Barat": [
    "Padang",
    "Bukittinggi",
    "Payakumbuh",
    "Padang Pariaman",
    "Solok",
  ],
  Riau: [
    "Pekanbaru",
    "Dumai",
    "Kampar",
    "Indragiri Hilir",
    "Siak",
  ],
  "Kepulauan Riau": [
    "Batam",
    "Tanjung Pinang",
    "Bintan",
    "Karimun",
    "Natuna",
  ],
  Jambi: [
    "Kota Jambi",
    "Muaro Jambi",
    "Tanjung Jabung Barat",
    "Tanjung Jabung Timur",
    "Batanghari",
  ],
  "Sumatera Selatan": [
    "Palembang",
    "Lubuklinggau",
    "Prabumulih",
    "Musi Banyuasin",
    "Ogan Ilir",
  ],
  Bengkulu: [
    "Kota Bengkulu",
    "Bengkulu Tengah",
    "Rejang Lebong",
    "Mukomuko",
    "Seluma",
  ],
  Lampung: [
    "Bandar Lampung",
    "Metro",
    "Lampung Selatan",
    "Lampung Tengah",
    "Tulang Bawang",
  ],
  "Kepulauan Bangka Belitung": [
    "Pangkal Pinang",
    "Bangka",
    "Belitung",
    "Belitung Timur",
    "Bangka Tengah",
  ],
  "DKI Jakarta": [
    "Jakarta Pusat",
    "Jakarta Barat",
    "Jakarta Selatan",
    "Jakarta Timur",
    "Jakarta Utara",
    "Kepulauan Seribu",
  ],
  "Jawa Barat": [
    "Kabupaten Bandung",
    "Bandung",
    "Bekasi",
    "Bogor",
    "Depok",
    "Cimahi",
    "Cirebon",
    "Karawang",
    "Purwakarta",
    "Sukabumi",
  ],
  Banten: [
    "Kabupaten Tangerang",
    "Tangerang",
    "Tangerang Selatan",
    "Serang",
    "Cilegon",
    "Lebak",
    "Pandeglang",
  ],
  "Jawa Tengah": [
    "Semarang",
    "Surakarta",
    "Magelang",
    "Purwokerto",
    "Salatiga",
    "Tegal",
    "Pekalongan",
    "Klaten",
  ],
  "DI Yogyakarta": [
    "Kota Yogyakarta",
    "Sleman",
    "Bantul",
    "Kulon Progo",
    "Gunungkidul",
  ],
  "Jawa Timur": [
    "Surabaya",
    "Malang",
    "Sidoarjo",
    "Madiun",
    "Kediri",
    "Jember",
    "Gresik",
    "Banyuwangi",
  ],
  Bali: [
    "Denpasar",
    "Badung",
    "Gianyar",
    "Tabanan",
    "Buleleng",
  ],
  "Nusa Tenggara Barat": [
    "Mataram",
    "Lombok Barat",
    "Lombok Tengah",
    "Sumbawa",
    "Bima",
  ],
  "Nusa Tenggara Timur": [
    "Kupang",
    "Manggarai",
    "Ende",
    "Sikka",
    "Belu",
  ],
  "Kalimantan Barat": [
    "Pontianak",
    "Singkawang",
    "Kubu Raya",
    "Ketapang",
    "Sambas",
  ],
  "Kalimantan Tengah": [
    "Palangka Raya",
    "Kotawaringin Barat",
    "Kotawaringin Timur",
    "Kapuas",
    "Barito Selatan",
  ],
  "Kalimantan Selatan": [
    "Banjarmasin",
    "Banjarbaru",
    "Banjar",
    "Tanah Laut",
    "Kotabaru",
  ],
  "Kalimantan Timur": [
    "Samarinda",
    "Balikpapan",
    "Bontang",
    "Kutai Kartanegara",
    "Berau",
  ],
  "Kalimantan Utara": [
    "Tarakan",
    "Bulungan",
    "Nunukan",
    "Malinau",
    "Tana Tidung",
  ],
  "Sulawesi Utara": [
    "Manado",
    "Bitung",
    "Tomohon",
    "Minahasa",
    "Bolaang Mongondow",
  ],
  Gorontalo: [
    "Kota Gorontalo",
    "Gorontalo",
    "Bone Bolango",
    "Boalemo",
    "Pohuwato",
  ],
  "Sulawesi Tengah": [
    "Palu",
    "Donggala",
    "Parigi Moutong",
    "Poso",
    "Morowali",
  ],
  "Sulawesi Barat": [
    "Mamuju",
    "Majene",
    "Polewali Mandar",
    "Mamasa",
    "Pasangkayu",
  ],
  "Sulawesi Selatan": [
    "Makassar",
    "Parepare",
    "Palopo",
    "Gowa",
    "Maros",
    "Bone",
  ],
  "Sulawesi Tenggara": [
    "Kendari",
    "Baubau",
    "Kolaka",
    "Muna",
    "Buton",
  ],
  Maluku: [
    "Ambon",
    "Tual",
    "Maluku Tengah",
    "Buru",
    "Seram Bagian Barat",
  ],
  "Maluku Utara": [
    "Ternate",
    "Tidore Kepulauan",
    "Halmahera Barat",
    "Halmahera Tengah",
    "Morotai",
  ],
  Papua: [
    "Jayapura",
    "Keerom",
    "Sarmi",
    "Biak Numfor",
    "Kepulauan Yapen",
  ],
  "Papua Barat": [
    "Manokwari",
    "Sorong",
    "Fakfak",
    "Kaimana",
    "Raja Ampat",
  ],
  "Papua Selatan": [
    "Merauke",
    "Boven Digoel",
    "Mappi",
    "Asmat",
  ],
  "Papua Tengah": [
    "Nabire",
    "Mimika",
    "Paniai",
    "Dogiyai",
    "Intan Jaya",
  ],
  "Papua Pegunungan": [
    "Jayawijaya",
    "Yahukimo",
    "Pegunungan Bintang",
    "Lanny Jaya",
    "Mamberamo Tengah",
  ],
  "Papua Barat Daya": [
    "Kota Sorong",
    "Sorong",
    "Raja Ampat",
    "Tambrauw",
    "Maybrat",
  ],
};

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "pengguna";
  return titleCase(localPart.replace(/[._-]+/g, " "));
}

function buildDefaultProfile(): MockUserProfile {
  const session = readMockSession();
  const email =
    session?.variant === "user" ? session.email : "pengguna.lkpp@email.com";
  const name =
    session?.variant === "user" && session.displayName?.trim()
      ? session.displayName.trim()
      : deriveNameFromEmail(email);

  return {
    name,
    email,
    phone: "0812-3456-7890",
    asalInstansi: "",
    namaInstansi: "",
    nik: "",
    provinsi: "",
    kabupatenKota: "",
  };
}

export function getMockUserProfile(): MockUserProfile {
  if (typeof window === "undefined") {
    return buildDefaultProfile();
  }

  const raw = window.localStorage.getItem(MOCK_USER_PROFILE_STORAGE_KEY);
  if (!raw) {
    const fallback = buildDefaultProfile();
    window.localStorage.setItem(
      MOCK_USER_PROFILE_STORAGE_KEY,
      JSON.stringify(fallback),
    );
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MockUserProfile>;
    return {
      ...buildDefaultProfile(),
      ...parsed,
    };
  } catch {
    const fallback = buildDefaultProfile();
    window.localStorage.setItem(
      MOCK_USER_PROFILE_STORAGE_KEY,
      JSON.stringify(fallback),
    );
    return fallback;
  }
}

export function getMockUserProfileCompletionStatus(profile: MockUserProfile) {
  const missingLabels: string[] = [];

  if (!profile.name.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.name);
  }
  if (!profile.phone.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.phone);
  }
  if (!profile.asalInstansi.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.asalInstansi);
  }
  if (!profile.namaInstansi.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.namaInstansi);
  }
  if (profile.nik.replace(/\D/g, "").length !== 16) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.nik);
  }
  if (!profile.provinsi.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.provinsi);
  }
  if (!profile.kabupatenKota.trim()) {
    missingLabels.push(USER_PROFILE_REQUIRED_LABELS.kabupatenKota);
  }

  return {
    isComplete: missingLabels.length === 0,
    missingLabels,
  };
}

export function persistMockUserProfile(profile: MockUserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MOCK_USER_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
  window.dispatchEvent(new Event(MOCK_USER_PROFILE_EVENT));
}

export function syncMockUserProfileFromLiveUser(
  user: unknown,
  options?: { persist?: boolean },
) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const source = user as Record<string, unknown>;
  const existingProfile = typeof window !== "undefined" ? getMockUserProfile() : buildDefaultProfile();
  const fallbackProfile = buildDefaultProfile();
  const readField = (keys: string[], fallback: string) => {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        return String(source[key] ?? "").trim();
      }
    }

    return fallback;
  };
  const nextProfile: MockUserProfile = {
    name: readField(["name"], existingProfile.name) || fallbackProfile.name,
    email: readField(["email"], existingProfile.email) || fallbackProfile.email,
    phone: readField(["phone"], existingProfile.phone) || fallbackProfile.phone,
    asalInstansi: readField(["asalInstansi", "asal_instansi"], existingProfile.asalInstansi),
    namaInstansi: readField(
      ["namaInstansi", "nama_instansi"],
      existingProfile.namaInstansi,
    ),
    nik: readField(["nik"], existingProfile.nik),
    provinsi: readField(["provinsi"], existingProfile.provinsi),
    kabupatenKota: readField(
      ["kabupatenKota", "kabupaten_kota"],
      existingProfile.kabupatenKota,
    ),
  };

  if (options?.persist !== false) {
    persistMockUserProfile(nextProfile);
  }
  return nextProfile;
}
