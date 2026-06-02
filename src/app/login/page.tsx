import type { Metadata } from "next";

import { loginContent } from "@/content/auth-content";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: loginContent.user.pageTitle,
};

export default function LoginRoute() {
  return <LoginForm variant="user" />;
}
