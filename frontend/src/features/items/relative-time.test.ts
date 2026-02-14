import { formatExactDateTime, humanizeDateTime } from "./relative-time";

test("humanizes a past timestamp", () => {
  const now = new Date("2026-02-14T12:00:00Z");
  const result = humanizeDateTime("2026-02-14T11:00:00Z", now);
  expect(result).toMatch(/ago|last/i);
});

test("humanizes a future timestamp", () => {
  const now = new Date("2026-02-14T12:00:00Z");
  const result = humanizeDateTime("2026-02-14T13:00:00Z", now);
  expect(result).toContain("in");
});

test("returns original value for invalid timestamps", () => {
  expect(humanizeDateTime("not-a-date")).toBe("not-a-date");
});

test("formats exact date for tooltip", () => {
  const value = formatExactDateTime("2026-02-14T12:00:00Z");
  expect(value).toContain("2026");
});
