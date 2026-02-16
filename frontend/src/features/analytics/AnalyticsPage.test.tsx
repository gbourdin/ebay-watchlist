import { render, screen } from "@testing-library/react";
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
  });
});

test("analytics page renders snapshot metrics and rankings", async () => {
  render(<AnalyticsPage />);

  expect(await screen.findByText("Total Items")).toBeInTheDocument();
  expect(await screen.findByText("120")).toBeInTheDocument();
  expect(await screen.findByText("Top Sellers")).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(await screen.findByText("Electric Guitars")).toBeInTheDocument();
  const metricCard = screen.getByText("Total Items").closest("article");
  expect(metricCard).toHaveClass("dark:bg-slate-900");
});
