import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";

import AnalyticsPage from "./AnalyticsPage";

const { fetchAnalyticsSnapshotMock } = vi.hoisted(() => ({
  fetchAnalyticsSnapshotMock: vi.fn(),
}));

vi.mock("../items/api", () => ({
  fetchAnalyticsSnapshot: fetchAnalyticsSnapshotMock,
}));

beforeEach(() => {
  fetchAnalyticsSnapshotMock.mockReset();
  fetchAnalyticsSnapshotMock.mockResolvedValue({
    metrics: {
      total_items: 120,
      active_items: 98,
      ending_soon_items: 7,
      new_last_7_days: 31,
      hidden_items: 2,
      favorite_items: 12,
    },
    top_sellers: [
      { name: "alice", count: 40 },
      { name: "bob", count: 20 },
    ],
    top_categories: [
      { name: "Electric Guitars", count: 33 },
      { name: "Laptops", count: 12 },
    ],
    distributions: {
      posted_by_month: [
        { label: "Jan", count: 44 },
        { label: "Feb", count: 76 },
      ],
      posted_by_weekday: [
        { label: "Mon", count: 12 },
        { label: "Tue", count: 18 },
        { label: "Wed", count: 20 },
        { label: "Thu", count: 15 },
        { label: "Fri", count: 17 },
        { label: "Sat", count: 21 },
        { label: "Sun", count: 17 },
      ],
      posted_by_hour: Array.from({ length: 24 }, (_, hour) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        count: hour % 3 === 0 ? 7 : 3,
      })),
    },
  });
});

test("analytics page renders snapshot metrics and rankings", async () => {
  render(<AnalyticsPage />);

  expect(await screen.findByText("Total Items")).toBeInTheDocument();
  expect(await screen.findByText("120")).toBeInTheDocument();
  expect(await screen.findByText("Top Sellers")).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(await screen.findByText("Electric Guitars")).toBeInTheDocument();
  expect(await screen.findByText("Items Posted per Month")).toBeInTheDocument();
  expect(await screen.findByText("Items Posted by Day of Week")).toBeInTheDocument();
  expect(await screen.findByText("Items Posted by Hour of Day (UTC)")).toBeInTheDocument();
  expect(await screen.findByText("Feb")).toBeInTheDocument();
  expect(await screen.findByText("06:00")).toBeInTheDocument();
  expect(await screen.findByTestId("distribution-bars-posted-by-month")).toHaveClass("items-end");
  expect(await screen.findByTestId("distribution-bars-posted-by-hour")).toHaveClass(
    "h-48",
    "sm:h-56"
  );
  const metricCard = screen.getByText("Total Items").closest("article");
  expect(metricCard).toHaveClass("dark:bg-slate-900");
});

test("each distribution can switch between counts and percentages", async () => {
  const user = userEvent.setup();
  render(<AnalyticsPage />);

  const monthChart = await screen.findByTestId("distribution-card-posted-by-month");
  expect(within(monthChart).getByTitle("Feb: 76")).toBeInTheDocument();

  await user.click(
    within(monthChart).getByRole("button", {
      name: "Show percentages for Items Posted per Month",
    })
  );
  expect(within(monthChart).getByTitle("Feb: 63.3%")).toBeInTheDocument();

  const weekdayChart = screen.getByTestId("distribution-card-posted-by-weekday");
  expect(within(weekdayChart).queryByTitle("Fri: 14.2%")).not.toBeInTheDocument();
  await user.click(
    within(weekdayChart).getByRole("button", {
      name: "Show percentages for Items Posted by Day of Week",
    })
  );
  expect(within(weekdayChart).getByTitle("Fri: 14.2%")).toBeInTheDocument();
});
