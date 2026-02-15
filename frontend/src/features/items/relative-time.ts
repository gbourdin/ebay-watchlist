const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

export function humanizeDateTime(value: string, now: Date = new Date()): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteSeconds < SECONDS_PER_MINUTE) {
    return relativeFormatter.format(diffSeconds, "second");
  }

  if (absoluteSeconds < SECONDS_PER_HOUR) {
    return relativeFormatter.format(
      Math.round(diffSeconds / SECONDS_PER_MINUTE),
      "minute"
    );
  }

  if (absoluteSeconds < SECONDS_PER_DAY) {
    return relativeFormatter.format(Math.round(diffSeconds / SECONDS_PER_HOUR), "hour");
  }

  if (absoluteSeconds < SECONDS_PER_MONTH) {
    return relativeFormatter.format(Math.round(diffSeconds / SECONDS_PER_DAY), "day");
  }

  if (absoluteSeconds < SECONDS_PER_YEAR) {
    return relativeFormatter.format(Math.round(diffSeconds / SECONDS_PER_MONTH), "month");
  }

  return relativeFormatter.format(Math.round(diffSeconds / SECONDS_PER_YEAR), "year");
}

export function formatExactDateTime(value: string): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(target);
}
