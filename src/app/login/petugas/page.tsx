import type { Metadata } from "next";

import { loginContent } from "@/content/auth-content";
import { LoginForm } from "@/features/auth/components/login-form";
import { isInternalRole } from "@/lib/mock-auth";

export const metadata: Metadata = {
  title: loginContent.staff.pageTitle,
};

export default async function StaffLoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedRole = isInternalRole(resolvedSearchParams.role)
    ? resolvedSearchParams.role
    : undefined;

  return <LoginForm variant="staff" selectedRole={selectedRole} />;
}
