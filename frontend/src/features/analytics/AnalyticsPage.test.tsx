import { render, screen, waitFor } from "@testing-library/react";
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

  await waitFor(() => expect(fetchAnalyticsSnapshotMock).toHaveBeenCalledTimes(1));

  expect(screen.getByText("Total Items")).toBeInTheDocument();
  expect(screen.getByText("120")).toBeInTheDocument();
  expect(screen.getByText("Top Sellers")).toBeInTheDocument();
  expect(screen.getByText("alice")).toBeInTheDocument();
  expect(screen.getByText("Electric Guitars")).toBeInTheDocument();
});
