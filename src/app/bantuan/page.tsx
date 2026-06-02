import type { Metadata } from "next";
import { cookies } from "next/headers";

import { PublicUserSupportPage } from "@/features/marketing/components/public-user-support-page";
import { UserFeaturePage } from "@/features/user/components/user-feature-page";
import {
  MOCK_AUTH_COOKIE_NAME,
  parseMockSessionCookieValue,
} from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Bantuan",
};

export default async function UserHelpRoute() {
  const cookieStore = await cookies();
  const session = parseMockSessionCookieValue(
    cookieStore.get(MOCK_AUTH_COOKIE_NAME)?.value ?? null,
  );

  if (session?.variant === "user") {
    return <UserFeaturePage page="bantuan" />;
  }

  return <PublicUserSupportPage page="bantuan" />;
}
