import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import type { ItemRow } from "../api";
import ItemNoteEditor from "./ItemNoteEditor";

const item: ItemRow = {
  item_id: "1",
  title: "Vintage Telecaster",
  image_url: "https://img.example/item.jpg",
  price: 99,
  currency: "GBP",
  bids: 4,
  seller: "alice",
  category: "Electric Guitars",
  posted_at: "2025-01-01T12:00:00",
  ends_at: "2025-01-02T12:00:00",
  ends_in: "in 2 days",
  web_url: "https://www.ebay.com/itm/1",
  hidden: false,
  favorite: false,
  note_text: "watch this one",
  note_created_at: "2025-01-01T12:00:00",
  note_last_modified: "2025-01-01T12:05:00",
};

test("does not render when no item is selected", () => {
  render(
    <ItemNoteEditor
      item={null}
      saving={false}
      error={null}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />
  );

  expect(screen.queryByRole("dialog", { name: "Edit item note" })).not.toBeInTheDocument();
});

test("renders and saves note text", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(undefined);

  render(
    <ItemNoteEditor
      item={item}
      saving={false}
      error={null}
      onClose={vi.fn()}
      onSave={onSave}
    />
  );

  const textArea = screen.getByLabelText("Personal note");
  await user.clear(textArea);
  await user.type(textArea, "Bid max 120 GBP");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  expect(onSave).toHaveBeenCalledWith(item, "Bid max 120 GBP");
});
