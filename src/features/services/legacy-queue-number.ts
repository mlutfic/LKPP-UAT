type QueueLikeRecord = {
  serviceId: string;
  date?: string;
  queueNumber: string;
};

function buildQueueDateCode(dateKey?: string) {
  const normalized = `${dateKey || ""}`.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  return `${match[1].slice(-2)}${match[2]}${match[3]}`;
}

function parseLegacyQueueSequence(queueNumber: string, serviceId: string) {
  const normalizedPrefix = `${serviceId}`.trim().toUpperCase();
  const normalizedQueue = `${queueNumber}`.trim().toUpperCase();

  if (!normalizedPrefix || !normalizedQueue.startsWith(`${normalizedPrefix}-`)) {
    return null;
  }

  const sequence = normalizedQueue.split("-").at(-1);
  if (!sequence || !/^\d+$/.test(sequence)) {
    return null;
  }

  return Number(sequence);
}

export function buildLegacyQueueNumber(
  serviceId: string,
  existingQueueNumbers: string[] = [],
  dateKey?: string,
) {
  const normalizedPrefix = `${serviceId}`.trim().toUpperCase();
  const dateCode = buildQueueDateCode(dateKey);
  const queuePrefix = dateCode ? `${normalizedPrefix}-${dateCode}-` : `${normalizedPrefix}-`;
  const nextSequence =
    existingQueueNumbers.reduce((highest, queueNumber) => {
      const sequence = parseLegacyQueueSequence(queueNumber, normalizedPrefix);
      return sequence && sequence > highest ? sequence : highest;
    }, 0) + 1;

  return `${queuePrefix}${String(nextSequence).padStart(3, "0")}`;
}

export function buildLegacyQueueNumberForService(
  serviceId: string,
  appointments: QueueLikeRecord[],
  dateKey?: string,
) {
  const matchingQueueNumbers = appointments
    .filter((appointment) => {
      if (`${appointment.serviceId}`.trim().toUpperCase() !== `${serviceId}`.trim().toUpperCase()) {
        return false;
      }

      if (!dateKey) {
        return true;
      }

      return `${appointment.date || ""}`.trim() === dateKey.trim();
    })
    .map((appointment) => appointment.queueNumber);

  return buildLegacyQueueNumber(serviceId, matchingQueueNumbers, dateKey);
}
