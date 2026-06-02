function normalizedDigits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export function maskEmail(value: string) {
  const email = String(value ?? "").trim();
  const [localPart, domain = ""] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(
    Math.max(localPart.length - 2, 3),
  )}@${domain}`;
}

export function maskPhone(value: string) {
  const digits = normalizedDigits(value);
  if (!digits) {
    return "";
  }

  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 4)}${"*".repeat(
    Math.max(digits.length - 7, 3),
  )}${digits.slice(-3)}`;
}

export function maskNik(value: string) {
  const digits = normalizedDigits(value);
  if (!digits) {
    return "";
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}${"*".repeat(Math.max(digits.length - 2, 2))}`;
  }

  return `${digits.slice(0, 4)}${"*".repeat(
    Math.max(digits.length - 8, 6),
  )}${digits.slice(-4)}`;
}
