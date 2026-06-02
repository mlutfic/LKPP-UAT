function normalizeQueueNumber(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export function formatQueueNumberForDisplay(value: unknown) {
  const normalized = normalizeQueueNumber(value);
  if (!normalized) {
    return "";
  }

  const parts = normalized.split("-");
  if (parts.length < 4) {
    return normalized;
  }

  const dateSegment = parts.at(-2) || "";
  const sequenceSegment = parts.at(-1) || "";
  if (!/^\d{6}$/.test(dateSegment) || !/^\d{3,}$/.test(sequenceSegment)) {
    return normalized;
  }

  return [...parts.slice(0, -2), sequenceSegment].join("-");
}

export function buildQueueNumberSearchTokens(value: unknown) {
  const normalized = normalizeQueueNumber(value);
  const formatted = formatQueueNumberForDisplay(normalized);

  return Array.from(new Set([normalized, formatted].filter(Boolean)));
}

export function matchesQueueNumberReference(
  candidate: unknown,
  reference: unknown,
) {
  const normalizedReference = normalizeQueueNumber(reference);
  if (!normalizedReference) {
    return false;
  }

  return buildQueueNumberSearchTokens(candidate).includes(normalizedReference);
}

export function buildQueueNumberLookupPattern(value: unknown) {
  const normalized = normalizeQueueNumber(value);
  if (!normalized) {
    return null;
  }

  const parts = normalized.split("-");
  if (parts.length < 3) {
    return null;
  }

  const sequenceSegment = parts.at(-1) || "";
  const previousSegment = parts.at(-2) || "";
  if (!/^\d{3,}$/.test(sequenceSegment) || /^\d{6}$/.test(previousSegment)) {
    return null;
  }

  return `${parts.slice(0, -1).join("-")}-*-${sequenceSegment}`;
}
