import { NextResponse } from "next/server";

import { getEnvStatus, getPublicEnv, getServerEnv } from "@/lib/env";

type SupabaseDiskUtilResponse = {
  timestamp: string;
  metrics: {
    fs_size_bytes: number;
    fs_avail_bytes: number;
    fs_used_bytes: number;
  };
};

type SupabaseStorageConfigResponse = {
  fileSizeLimit: number;
  features?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  external?: Record<string, unknown>;
  migrationVersion?: string;
  databasePoolMode?: string;
};

function resolveProjectRef() {
  const serverEnv = getServerEnv();
  if (serverEnv.supabaseProjectRef.trim()) {
    return serverEnv.supabaseProjectRef.trim();
  }

  const publicEnv = getPublicEnv();
  if (!publicEnv.supabaseUrl) {
    return "";
  }

  try {
    return new URL(publicEnv.supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function buildRuntimeSnapshot() {
  const publicEnv = getPublicEnv();
  const envStatus = getEnvStatus();

  return {
    ok: true,
    appUrl: publicEnv.appUrl,
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    functionName: publicEnv.supabaseFunctionName,
    backendBaseUrl: publicEnv.supabaseUrl
      ? `${publicEnv.supabaseUrl}/functions/v1/${publicEnv.supabaseFunctionName}`
      : "",
    turnstileSiteKey: publicEnv.turnstileSiteKey,
    status: envStatus,
  };
}

async function fetchManagementSnapshot(projectRef: string, accessToken: string) {
  const baseUrl = `https://api.supabase.com/v1/projects/${projectRef}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  const [diskResponse, storageResponse] = await Promise.all([
    fetch(`${baseUrl}/config/disk/util`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/config/storage`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
  ]);

  if (!diskResponse.ok) {
    throw new Error(`Disk util Supabase gagal dibaca (${diskResponse.status}).`);
  }

  if (!storageResponse.ok) {
    throw new Error(`Konfigurasi storage Supabase gagal dibaca (${storageResponse.status}).`);
  }

  const disk = (await diskResponse.json()) as SupabaseDiskUtilResponse;
  const storage = (await storageResponse.json()) as SupabaseStorageConfigResponse;

  const totalBytes = Number(disk?.metrics?.fs_size_bytes ?? 0);
  const usedBytes = Number(disk?.metrics?.fs_used_bytes ?? 0);
  const availableBytes = Number(disk?.metrics?.fs_avail_bytes ?? 0);

  return {
    projectRef,
    timestamp: disk?.timestamp ?? new Date().toISOString(),
    disk: {
      totalBytes,
      usedBytes,
      availableBytes,
      usedRatio: totalBytes > 0 ? usedBytes / totalBytes : 0,
    },
    storage: {
      fileSizeLimitBytes: Number(storage?.fileSizeLimit ?? 0),
      features: storage?.features ?? {},
      capabilities: storage?.capabilities ?? {},
      external: storage?.external ?? {},
      migrationVersion: storage?.migrationVersion ?? "",
      databasePoolMode: storage?.databasePoolMode ?? "",
    },
  };
}

export async function GET() {
  const serverEnv = getServerEnv();
  const runtime = buildRuntimeSnapshot();
  const projectRef = resolveProjectRef();

  if (!serverEnv.supabaseAccessToken || !projectRef) {
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      runtime,
      health: {
        ok: true,
        service: "lkpp-web",
        timestamp: new Date().toISOString(),
        env: getEnvStatus(),
      },
      storage: null,
      warning: "Token management Supabase atau project ref belum tersedia.",
    });
  }

  try {
    const storage = await fetchManagementSnapshot(projectRef, serverEnv.supabaseAccessToken);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      runtime,
      health: {
        ok: true,
        service: "lkpp-web",
        timestamp: new Date().toISOString(),
        env: getEnvStatus(),
      },
      storage,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      runtime,
      health: {
        ok: true,
        service: "lkpp-web",
        timestamp: new Date().toISOString(),
        env: getEnvStatus(),
      },
      storage: null,
      warning:
        error instanceof Error
          ? error.message
          : "Gagal membaca telemetry Supabase.",
    });
  }
}
