import { expect, test } from "@playwright/test";

async function consent(page: import("@playwright/test").Page) {
  const button = page.getByTestId("consent");
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }
}

test("widget opens from the host page", async ({ page }) => {
  await page.goto("/embed-demo");
  const launcher = page.getByRole("button", { name: "Open Cedar Grove chat" });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(launcher).toHaveAttribute("aria-expanded", "true");
  const frame = page.frameLocator('iframe[title="Cedar Grove Family Clinic chat"]');
  await expect(frame.getByText("Grove guide")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/widget.png" });
  await page.keyboard.press("Escape");
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
});

test("a knowledge question shows a citation", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  await page.getByTestId("composer").fill("What are your hours?");
  await page.getByTestId("send").click();
  const answer = page.getByTestId("assistant-message").last();
  await expect(answer).toContainText("8:00 a.m. to 5:00 p.m.");
  await expect(answer.getByTestId("citation")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/cited-answer.png" });
});

test("new patient booking reaches a confirmation", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  const send = page.getByTestId("send");
  await page.getByTestId("composer").fill("I'm a new patient. Do you accept Blue Cross Blue Shield?");
  await send.click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("in network");
  await page.getByTestId("composer").fill("Family medicine, Spanish speaking please.");
  await send.click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("Alvarez");
  await page.getByTestId("composer").fill("Show openings for Dr. Alvarez");
  await send.click();
  await page.getByTestId("suggestion").first().click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("callback number");
  await page.getByTestId("composer").fill("Jordan Lee, 555-0148");
  await send.click();
  await expect(page.getByTestId("assistant-message").last()).toContainText(/CG-\d{4}/);
});

test("asking for a person creates a handoff", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  await page.getByTestId("handoff-button").click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("front desk");
});

test("mobile home page does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /policy manual/i })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(overflow).toBeFalsy();
  await page.screenshot({ path: "docs/screenshots/mobile-home.png", fullPage: true });
});
