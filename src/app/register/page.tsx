import type { Metadata } from "next";

import { registerContent } from "@/content/auth-content";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: registerContent.pageTitle,
};

export default async function RegisterRoute({
  searchParams,
}: {
  searchParams: Promise<{
    challengeId?: string;
    verificationToken?: string;
    email?: string;
    phone?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <RegisterForm
      challengeId={params.challengeId}
      verificationToken={params.verificationToken}
      emailFromCallback={params.email}
      phoneFromCallback={params.phone}
    />
  );
}
