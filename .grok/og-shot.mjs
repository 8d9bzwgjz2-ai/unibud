import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto("file:///workspace/.grok/og-card.html", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "/workspace/.grok/og-raw.png",
    type: "png",
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
} finally {
  await browser.close();
}
