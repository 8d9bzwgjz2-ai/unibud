import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const html = "/workspace/.grok/og-card.html";
const out = "/workspace/.grok/card-raw.png";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle", timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: out, type: "png", omitBackground: false });
await browser.close();
console.log("wrote", out);
