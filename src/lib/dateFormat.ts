const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const DEFAULT_LOCALE = "en-GB";

export function formatDate(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
}

