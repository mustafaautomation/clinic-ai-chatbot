import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function consent(page: import("@playwright/test").Page) {
  const button = page.getByTestId("consent");
  if (await button.isVisible().catch(() => false)) await button.click();
}

test("launcher shows a dismissible teaser and nudge pills", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("chat-launcher")).toBeVisible();
  await expect(page.getByTestId("launcher-nudge").first()).toBeVisible();
  await expect(page.getByTestId("launcher-teaser")).toContainText("Need a visit", { timeout: 8000 });
  await page.getByRole("button", { name: "Dismiss teaser" }).click();
  await expect(page.getByTestId("launcher-teaser")).toBeHidden();
});

test("empty widget has starters, demo pill, and labelled actions after a reply", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  await expect(page.getByTestId("engine-pill")).toHaveText("Demo mode");
  await expect(page.getByText("Do you accept Blue Cross?")).toBeVisible();
  await page.getByTestId("composer").fill("What are your hours?");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("phase-indicator")).toBeVisible();
  const answer = page.getByTestId("assistant-message").last();
  await expect(answer).toContainText("8:00 a.m. to 5:00 p.m.");
  await expect(answer.getByTestId("message-actions").getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(answer.getByTestId("citation-chip").first()).toBeVisible();
  await expect(page.getByTestId("quick-reply").first()).toBeVisible();
});

test("booking shows only returned slot chips and a lead card", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  const send = page.getByTestId("send");
  await page.getByTestId("composer").fill("I'm a new patient. Do you accept Blue Cross Blue Shield?");
  await send.click();
  await expect(page.getByTestId("card-quote")).toBeVisible();
  await page.getByTestId("composer").fill("Family medicine, Spanish speaking please.");
  await send.click();
  await expect(page.getByTestId("card-carousel")).toBeVisible();
  await page.getByTestId("composer").fill("Show openings for Dr. Alvarez");
  await send.click();
  await expect(page.getByTestId("slot-chips")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("slot-note")).toHaveText("Only times the booking system returned");
  await page.getByTestId("lead-link").click();
  await expect(page.getByTestId("lead-card")).toBeVisible();
});

test("handoff names a person and the desk can resume the guide", async ({ page }) => {
  await page.goto("/chat");
  await consent(page);
  await page.getByTestId("handoff-button").click();
  await expect(page.getByTestId("assistant-message").last()).toContainText("front desk");
  await expect(page.getByTestId("chat-header")).toContainText(/Sam Okonkwo|human/, { timeout: 8000 });
  await page.goto("/admin");
  await page.getByLabel("Desk key").fill("cedar-demo");
  await page.getByRole("main").getByRole("button", { name: "Open the desk" }).click();
  await page.getByRole("tab", { name: "Chats" }).click();
  await expect(page.getByTestId("resume-bot").first()).toBeVisible();
  await page.getByTestId("resume-bot").first().click();
  await expect(page.getByText("The guide is available on that chat again.")).toBeVisible();
});

test("landing hero, trust panel, and disclaimer are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /policy manual/i })).toBeVisible();
  await expect(page.getByTestId("landing-hero-chat").getByTestId("composer")).toBeVisible();
  await expect(page.getByTestId("trust-panel")).toContainText("What it won't do");
  await expect(page.getByTestId("metrics-strip")).toContainText("27");
  await expect(page.getByText("Portfolio demo by Quvantic - fictional brand, not a real business / not client work").first()).toBeVisible();
  await page.getByTestId("try-asking").getByRole("button", { name: "What should I bring?" }).click();
  await expect(page.getByTestId("landing-hero-chat").getByTestId("card-checklist")).toBeVisible();
});

test("embed demo loads the script launcher", async ({ page }) => {
  await page.goto("/embed-demo");
  const launcher = page.getByRole("button", { name: "Open Cedar Grove chat" });
  await expect(launcher).toBeVisible();
  await expect(page.getByTestId("launcher-nudge").first()).toContainText("Check insurance");
  await launcher.click();
  await expect(launcher).toHaveAttribute("aria-expanded", "true");
});

test("home and embed have no serious axe violations", async ({ page }) => {
  for (const path of ["/", "/embed-demo"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  }
});
