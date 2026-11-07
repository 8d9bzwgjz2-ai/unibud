import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const svg = "/workspace/public/favicon.svg";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function shot(size, out) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(svg).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: out, type: "png", omitBackground: false });
  await page.close();
  console.log("wrote", out, size);
}
await shot(32, "/workspace/.grok/favicon-32.png");
await shot(16, "/workspace/.grok/favicon-16.png");
await browser.close();
