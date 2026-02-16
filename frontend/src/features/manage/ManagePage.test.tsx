import { render, screen, waitFor, within } from "@testing-library/react";
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
  fetchWatchlistMock
    .mockResolvedValueOnce({
      sellers: ["alice"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    })
    .mockResolvedValueOnce({
      sellers: ["alice", "new_seller"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    });

  render(<ManagePage />);

  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(await screen.findByText("Musical Instruments")).toBeInTheDocument();
  const sellersCard = screen.getByRole("heading", { name: "Watched Sellers" }).closest("article");
  expect(sellersCard).toHaveClass("dark:bg-slate-900");

  await user.type(screen.getByLabelText("Seller name"), "new_seller");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Seller added.")).toBeInTheDocument();
  expect(await screen.findByText("new_seller")).toBeInTheDocument();
  expect(screen.getByLabelText("Seller name")).toHaveValue("");
});

test("shows empty state placeholders when watchlist has no sellers or categories", async () => {
  fetchWatchlistMock.mockResolvedValueOnce({
    sellers: [],
    categories: [],
    main_category_options: [],
  });

  render(<ManagePage />);

  expect(await screen.findByText("No watched sellers yet.")).toBeInTheDocument();
  expect(await screen.findByText("No watched categories yet.")).toBeInTheDocument();
});

test("shows load error when initial watchlist fetch fails", async () => {
  fetchWatchlistMock.mockRejectedValueOnce(new Error("upstream unavailable"));

  render(<ManagePage />);

  expect(await screen.findByText("upstream unavailable")).toBeInTheDocument();
  expect(screen.queryByText("Watched Sellers")).not.toBeInTheDocument();
});

test("remove seller updates list and shows success flash", async () => {
  const user = userEvent.setup();
  fetchWatchlistMock
    .mockResolvedValueOnce({
      sellers: ["alice", "bob"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    })
    .mockResolvedValueOnce({
      sellers: ["bob"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    });

  render(<ManagePage />);

  const aliceRow = (await screen.findByText("alice")).closest("li");
  expect(aliceRow).not.toBeNull();
  await user.click(within(aliceRow as HTMLElement).getByRole("button", { name: "Remove" }));

  expect(await screen.findByText("Seller removed.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("alice")).not.toBeInTheDocument());
  expect(screen.getByText("bob")).toBeInTheDocument();
});

test("shows fallback remove seller error when thrown value is not an Error instance", async () => {
  const user = userEvent.setup();
  removeWatchedSellerMock.mockRejectedValueOnce("boom");

  render(<ManagePage />);

  const aliceRow = (await screen.findByText("alice")).closest("li");
  expect(aliceRow).not.toBeNull();
  await user.click(within(aliceRow as HTMLElement).getByRole("button", { name: "Remove" }));

  expect(await screen.findByText("Could not remove seller")).toBeInTheDocument();
});

test("can add category from fetched suggestion and shows success flash", async () => {
  const user = userEvent.setup();
  fetchWatchlistCategorySuggestionsMock.mockResolvedValue({
    suggestions: [
      {
        id: "182150",
        name: "Electric Guitars",
        path: "Musical Instruments > Guitars",
      },
    ],
  });
  fetchWatchlistMock
    .mockResolvedValueOnce({
      sellers: ["alice"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    })
    .mockResolvedValueOnce({
      sellers: ["alice"],
      categories: [
        { id: 619, name: "Musical Instruments" },
        { id: 182150, name: "Electric Guitars" },
      ],
      main_category_options: ["Musical Instruments"],
    });

  render(<ManagePage />);
  await screen.findByText("Musical Instruments");

  await user.type(screen.getByLabelText("Category name or ID"), "Electric Guitars");
  await user.click(screen.getByRole("button", { name: "Add category" }));

  expect(await screen.findByText("Category added.")).toBeInTheDocument();
  expect(await screen.findByText("Electric Guitars")).toBeInTheDocument();
  expect(screen.getByLabelText("Category name or ID")).toHaveValue("");
});

test("shows add category fallback error when thrown value is not an Error instance", async () => {
  const user = userEvent.setup();
  addWatchedCategoryMock.mockRejectedValueOnce("broken payload");

  render(<ManagePage />);
  await screen.findByText("Musical Instruments");

  await user.type(screen.getByLabelText("Category name or ID"), "58058");
  await user.click(screen.getByRole("button", { name: "Add category" }));

  expect(await screen.findByText("Could not add category")).toBeInTheDocument();
});

test("remove category updates list and shows success flash", async () => {
  const user = userEvent.setup();
  fetchWatchlistMock
    .mockResolvedValueOnce({
      sellers: ["alice"],
      categories: [
        { id: 619, name: "Musical Instruments" },
        { id: 58058, name: "Computers" },
      ],
      main_category_options: ["Musical Instruments"],
    })
    .mockResolvedValueOnce({
      sellers: ["alice"],
      categories: [{ id: 619, name: "Musical Instruments" }],
      main_category_options: ["Musical Instruments"],
    });

  render(<ManagePage />);
  const computersLabel = await screen.findByText("Computers");
  const computersRow = computersLabel.closest("li");
  expect(computersRow).not.toBeNull();
  await user.click(within(computersRow as HTMLElement).getByRole("button", { name: "Remove" }));

  expect(await screen.findByText("Category removed.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("Computers")).not.toBeInTheDocument());
});
