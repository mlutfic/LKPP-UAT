import { z } from "zod";

export const PASSWORD_POLICY_HINT =
  "Minimal 8 karakter, huruf besar, huruf kecil, dan karakter khusus.";

export function getPasswordPolicyError(
  value: string,
  label = "Password",
) {
  const password = String(value ?? "");

  if (password.length < 8) {
    return `${label} minimal 8 karakter.`;
  }

  if (!/[A-Z]/.test(password)) {
    return `${label} harus mengandung huruf besar.`;
  }

  if (!/[a-z]/.test(password)) {
    return `${label} harus mengandung huruf kecil.`;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return `${label} harus mengandung karakter khusus.`;
  }

  return null;
}

export function isStrongPassword(value: string) {
  return getPasswordPolicyError(value) === null;
}

export function createPasswordSchema(label = "Password") {
  return z.string().superRefine((value, context) => {
    const errorMessage = getPasswordPolicyError(value, label);
    if (!errorMessage) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessage,
    });
  });
}
