import { expect, test } from "@playwright/test";
import { saveResume } from "./helpers";

test.describe("job seeker journey", () => {
  test("resume to scores, detail, gaps, info pages", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Staff Accountant/ }).first()).toBeVisible();

    await saveResume(page);
    await page.getByRole("link", { name: "Jobs", exact: true }).last().click();
    const badge = page.locator(".badge").first();
    await expect(badge).toBeVisible();

    await page.getByRole("link", { name: /Staff Accountant/ }).first().click();
    await expect(page.getByRole("heading", { name: "Why this score" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What to do next" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your match score" })).toBeVisible();

    await page.getByRole("link", { name: "Gaps", exact: true }).last().click();
    await expect(page.getByRole("heading", { level: 1, name: "Skill gaps" })).toBeVisible();
    await expect(page.getByText(/Asked for in \d+ jobs?/).first()).toBeVisible();

    const header = page.getByRole("banner");
    await header.getByRole("link", { name: "How it Works" }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("contentinfo").getByRole("link", { name: "Resources" }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.locator('a[href="https://mcp-api.netlify.app/"]')).toBeVisible();
    await expect(page.locator('a[href="/guide/"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://github.com/isaacbredy27-cloud/Isaac_Agent_Team"]').first()).toBeVisible();

    const guide = await request.get("/guide/");
    expect(guide.status()).toBe(200);
    expect(await guide.text()).toMatch(/guide/i);
    await page.goto("/guide/");
    await expect(page).toHaveURL(/\/guide\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
