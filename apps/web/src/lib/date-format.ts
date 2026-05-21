const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(value: string | Date) {
  return DATE_FORMATTER.format(normalizeDate(value));
}

export function formatDateTime(value: string | Date) {
  return DATE_TIME_FORMATTER.format(normalizeDate(value));
}

function normalizeDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}
