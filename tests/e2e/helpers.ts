import { expect, type Page } from "@playwright/test";

/** Synthetic resume. No real person (ADR 0004). */
export const SYNTHETIC_RESUME = `Pat Example
Staff Accountant, 4 years of experience
Skills: GAAP, Excel, accounts payable, accounts receivable, month-end close, reconciliations, QuickBooks
Education: Bachelor of Science in Accounting
`;

export const JOBS_RESPONSE_TIMEOUT = 15_000;

export async function saveResume(page: Page): Promise<void> {
  await page.goto("/resume");
  await page.getByLabel("Resume text").fill(SYNTHETIC_RESUME);
  await page.getByRole("button", { name: "See my matches" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your resume" })).toBeVisible({ timeout: JOBS_RESPONSE_TIMEOUT });
}

export const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => (document.scrollingElement?.scrollWidth ?? 0) <= window.innerWidth);
