import type { Metadata } from "next";

import { resetPinContent } from "@/content/auth-content";
import { ResetPinForm } from "@/features/auth/components/reset-pin-form";

export const metadata: Metadata = {
  title: resetPinContent.pageTitle,
};

export default async function ResetPinRoute({
  searchParams,
}: {
  searchParams: Promise<{
    challengeId?: string;
    verificationToken?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <ResetPinForm
      challengeId={params.challengeId}
      verificationToken={params.verificationToken}
      emailFromCallback={params.email}
    />
  );
}
