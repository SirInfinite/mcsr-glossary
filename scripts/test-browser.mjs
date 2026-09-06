import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { serve } from "./serve.mjs";
import { productFlows } from "../tests/browser/product-flows.mjs";
import { failureFlows } from "../tests/browser/failures.mjs";
import { visualAudit } from "../tests/browser/visual-audit.mjs";

const output = new URL("../output/structural/final/", import.meta.url);
await mkdir(output, { recursive: true });
const server = await serve({ port: 0 });
const base = `http://127.0.0.1:${server.address().port}/mcsr-glossary/`;
const browser = await chromium.launch({ headless: true, ...(process.env.QA_BROWSER_CHANNEL ? { channel: process.env.QA_BROWSER_CHANNEL } : {}) });
try {
    const page = await browser.newPage();
    const product = await productFlows(page, base);
    const failures = await failureFlows(browser, base);
    const visual = await visualAudit(browser, base);
    const result = { product, failures, visual };
    await writeFile(new URL("browser.json", output), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}
