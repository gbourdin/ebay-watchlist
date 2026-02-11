import { expect, test } from "@playwright/test";

test("homepage shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByText("Watched Listings")).toBeVisible();
  await expect(page.getByTestId("results-main")).toBeVisible();
  await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
});
