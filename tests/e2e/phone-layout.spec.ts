import { expect, test } from "@playwright/test";
import { noHorizontalScroll, saveResume } from "./helpers";

test.describe("phone layout", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1000) > 500, "Only meaningful on the phone project");

  for (const route of ["/", "/resume", "/gaps", "/how-it-works", "/resources"]) {
    test(`tab bar visible, no horizontal scroll on ${route}`, async ({ page }) => {
      await page.goto(route);
      const tabs = page.getByRole("navigation", { name: "Main" });
      await expect(tabs).toBeVisible();
      await expect(tabs.getByRole("link", { name: "Jobs" })).toBeVisible();
      await expect(tabs.getByRole("link", { name: "Resume" })).toBeVisible();
      await expect(tabs.getByRole("link", { name: "Gaps" })).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  test("no horizontal scroll on jobs with a resume saved", async ({ page }) => {
    await saveResume(page);
    await page.goto("/jobs");
    await expect(page.locator(".badge").first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});
