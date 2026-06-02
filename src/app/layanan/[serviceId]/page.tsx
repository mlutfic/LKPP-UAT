import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getBookingServiceBySlug } from "@/content/service-booking-content";
import { ServiceBookingPage } from "@/features/services/components/service-booking-page";
import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}): Promise<Metadata> {
  const { serviceId } = await params;
  const service = getBookingServiceBySlug(serviceId);

  return {
    title: service ? `Lengkapi keperluan · ${service.title}` : "Lengkapi keperluan",
  };
}

export default async function ServiceBookingRoute({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = getBookingServiceBySlug(serviceId);

  if (!service) {
    notFound();
  }

  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
  );

  if (!session || session.variant !== "user") {
    const searchParams = new URLSearchParams({
      next: `/layanan/${serviceId}`,
    });
    redirect(`/login?${searchParams.toString()}`);
  }

  return <ServiceBookingPage service={service} />;
}
