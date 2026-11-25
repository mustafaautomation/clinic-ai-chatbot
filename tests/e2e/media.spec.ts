import { expect, test } from "@playwright/test";

test("record the clinic demo", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "docs/screenshots/home.png", fullPage: false });
  await page.getByTestId("consent").click();
  await page.getByTestId("composer").fill("What are your hours?");
  await page.getByTestId("send").click();
  const answer = page.getByTestId("assistant-message").last();
  await expect(answer).toContainText("8:00 a.m. to 5:00 p.m.", { timeout: 15000 });
  await answer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/screenshots/cited-answer.png" });
  await page.getByTestId("composer").fill("I'm a new patient. Do you accept Blue Cross Blue Shield?");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("in network");
  await page.getByTestId("composer").fill("Family medicine, Spanish speaking please.");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("Alvarez");
  await page.getByTestId("assistant-message").last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "docs/screenshots/booking.png" });
});
