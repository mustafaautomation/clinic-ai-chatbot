import { expect, test } from "@playwright/test";

test("record the clinic demo", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("launcher-teaser").waitFor({ timeout: 8000 });
  await page.screenshot({ path: "docs/screenshots/home.png", fullPage: false });
  await page.getByTestId("consent").click();
  await page.getByTestId("try-asking").getByRole("button", { name: "What should I bring?" }).click();
  await expect(page.getByTestId("card-checklist")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "docs/screenshots/cited-answer.png" });
  await page.getByTestId("composer").fill("I'm a new patient. Do you accept Blue Cross Blue Shield?");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("card-quote")).toBeVisible();
  await page.getByTestId("composer").fill("Show openings for Dr. Alvarez");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("slot-chips")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "docs/screenshots/booking.png" });
  await page.getByTestId("handoff-button").click();
  await expect(page.getByTestId("chat-header")).toContainText(/human|Sam Okonkwo/, { timeout: 8000 });
  await page.screenshot({ path: "docs/screenshots/widget.png" });
});
