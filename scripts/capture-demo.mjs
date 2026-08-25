import { chromium } from "playwright";
import { mkdir, copyFile } from "node:fs/promises";

const PRODUCT_URL = process.env.ATLAS_PRODUCT_URL ?? "https://atlas-sac-ui.vercel.app";
const outputDir = "demo-artifacts";
const viewport = { width: 1440, height: 900 };

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function smoothScroll(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
}

async function saveRecordedContext(context, page, target) {
  const video = page.video();
  await context.close();
  if (!video) throw new Error("Playwright video recording was not created.");
  const source = await video.path();
  await copyFile(source, target);
}

async function captureLongDemo() {
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: `${outputDir}/raw-long`, size: viewport },
  });
  const page = await context.newPage();

  await page.goto(PRODUCT_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  const simulate = page.getByRole("button", { name: "Executar simulação" });
  await simulate.click();
  await page.waitForFunction(
    () => document.querySelector(".engine-status")?.textContent?.includes("Ao vivo"),
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(3000);

  await smoothScroll(page, "#evidencias");
  await page.waitForTimeout(3500);

  await smoothScroll(page, "#trilha");
  await page.waitForTimeout(6500);

  await smoothScroll(page, "#metodologia");
  await page.locator("#metodologia summary").click();
  await page.waitForTimeout(3500);

  const aiButton = page.getByRole("button", { name: "Executar contraditório" });
  await aiButton.click();
  try {
    await page.locator(".review-result").waitFor({ state: "visible", timeout: 45000 });
  } catch {
    // Safe-degradation is itself a governed state. Keep recording instead of fabricating success.
  }
  await page.waitForTimeout(5000);

  await smoothScroll(page, "#revisao");
  await page.waitForTimeout(4500);

  await page.goto(`${PRODUCT_URL}/micro`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: /Com lacunas/ }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Executar no motor V8" }).click();
  try {
    await page.getByText("Resultado calculado pelo motor ATLAS Micro V8.").waitFor({
      state: "visible",
      timeout: 20000,
    });
  } catch {
    // The UI exposes protected preview fallback if the backend cannot be reached.
  }
  await page.waitForTimeout(4500);

  await page.getByText("Nenhuma decisão de crédito foi produzida.").scrollIntoViewIfNeeded();
  await page.waitForTimeout(5000);

  await saveRecordedContext(context, page, `${outputDir}/atlas-demo-long.webm`);
}

async function captureGifDemo() {
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: `${outputDir}/raw-gif`, size: viewport },
  });
  const page = await context.newPage();

  await page.goto(PRODUCT_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2200);

  await smoothScroll(page, "#trilha");
  await page.waitForTimeout(3300);

  await smoothScroll(page, "#revisao");
  await page.waitForTimeout(2600);

  await page.goto(`${PRODUCT_URL}/micro`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /Com lacunas/ }).click();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Executar no motor V8" }).click();
  try {
    await page.getByText("Resultado calculado pelo motor ATLAS Micro V8.").waitFor({
      state: "visible",
      timeout: 15000,
    });
  } catch {
    // Keep the truthful UI state if the live engine is unavailable.
  }
  await page.waitForTimeout(2200);
  await page.getByText("Nenhuma decisão de crédito foi produzida.").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);

  await saveRecordedContext(context, page, `${outputDir}/atlas-demo-gif.webm`);
}

try {
  await captureLongDemo();
  await captureGifDemo();
} finally {
  await browser.close();
}
