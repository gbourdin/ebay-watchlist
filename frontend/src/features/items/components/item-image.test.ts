import { describe, expect, test } from "vitest";

import {
  handleItemImageError,
  ITEM_IMAGE_PLACEHOLDER_DARK_SRC,
  ITEM_IMAGE_PLACEHOLDER_LIGHT_SRC,
  resolveItemImageSrc,
} from "./item-image";

describe("item-image", () => {
  test("returns the original image URL when present", () => {
    expect(resolveItemImageSrc("https://img.example/item.jpg")).toBe(
      "https://img.example/item.jpg"
    );
  });

  test("uses light placeholder when src is missing in light mode", () => {
    document.documentElement.classList.remove("dark");

    expect(resolveItemImageSrc("")).toBe(ITEM_IMAGE_PLACEHOLDER_LIGHT_SRC);
  });

  test("uses dark placeholder when src is missing in dark mode", () => {
    document.documentElement.classList.add("dark");

    expect(resolveItemImageSrc("")).toBe(ITEM_IMAGE_PLACEHOLDER_DARK_SRC);
  });

  test("uses theme-matching placeholder when image load fails", () => {
    const image = document.createElement("img");
    image.src = "https://img.example/item.jpg";

    document.documentElement.classList.add("dark");
    handleItemImageError({ currentTarget: image } as never);
    expect(image.src).toContain(ITEM_IMAGE_PLACEHOLDER_DARK_SRC);

    image.src = "https://img.example/item.jpg";
    image.onerror = () => {};
    document.documentElement.classList.remove("dark");
    handleItemImageError({ currentTarget: image } as never);
    expect(image.src).toContain(ITEM_IMAGE_PLACEHOLDER_LIGHT_SRC);
  });
});
