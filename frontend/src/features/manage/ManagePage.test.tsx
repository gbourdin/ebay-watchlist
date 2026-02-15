import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";

import ManagePage from "./ManagePage";

const {
  fetchWatchlistMock,
  addWatchedSellerMock,
  removeWatchedSellerMock,
  addWatchedCategoryMock,
  removeWatchedCategoryMock,
  fetchWatchlistCategorySuggestionsMock,
} = vi.hoisted(() => ({
  fetchWatchlistMock: vi.fn(),
  addWatchedSellerMock: vi.fn(),
  removeWatchedSellerMock: vi.fn(),
  addWatchedCategoryMock: vi.fn(),
  removeWatchedCategoryMock: vi.fn(),
  fetchWatchlistCategorySuggestionsMock: vi.fn(),
}));

vi.mock("../items/api", () => ({
  fetchWatchlist: fetchWatchlistMock,
  addWatchedSeller: addWatchedSellerMock,
  removeWatchedSeller: removeWatchedSellerMock,
  addWatchedCategory: addWatchedCategoryMock,
  removeWatchedCategory: removeWatchedCategoryMock,
  fetchWatchlistCategorySuggestions: fetchWatchlistCategorySuggestionsMock,
}));

beforeEach(() => {
  fetchWatchlistMock.mockReset();
  addWatchedSellerMock.mockReset();
  removeWatchedSellerMock.mockReset();
  addWatchedCategoryMock.mockReset();
  removeWatchedCategoryMock.mockReset();
  fetchWatchlistCategorySuggestionsMock.mockReset();

  fetchWatchlistMock.mockResolvedValue({
    sellers: ["alice"],
    categories: [{ id: 619, name: "Musical Instruments" }],
    main_category_options: ["Musical Instruments"],
  });
  addWatchedSellerMock.mockResolvedValue(undefined);
  removeWatchedSellerMock.mockResolvedValue(undefined);
  addWatchedCategoryMock.mockResolvedValue(undefined);
  removeWatchedCategoryMock.mockResolvedValue(undefined);
  fetchWatchlistCategorySuggestionsMock.mockResolvedValue({ suggestions: [] });
});

test("manage page loads watchlist and can add seller", async () => {
  const user = userEvent.setup();
  render(<ManagePage />);

  await waitFor(() => expect(fetchWatchlistMock).toHaveBeenCalledTimes(1));
  expect(screen.getByText("alice")).toBeInTheDocument();
  expect(screen.getByText("Musical Instruments")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Seller name"), "new_seller");
  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(addWatchedSellerMock).toHaveBeenCalledWith("new_seller")
  );
  await waitFor(() => expect(fetchWatchlistMock).toHaveBeenCalledTimes(2));
});
