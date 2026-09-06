import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function visualAudit(browser, base) {
    const source = await readFile(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
    const terms = JSON.parse(await readFile(new URL("../../data/terms.json", import.meta.url), "utf8")).terms;
    const viewports = [[1440,900],[1024,768],[768,1024],[390,844],[360,800]];
    const errors = [];
    const violations = [];
    let scans = 0;
    let layouts = 0;
    for (const theme of ["dark", "light"]) for (const [width,height] of viewports) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
        const page = await context.newPage();
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => { if (message.type() === "error" && message.location().url.startsWith(base)) errors.push(message.text()); });
        page.on("response", response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`); });
        await context.addInitScript(value => localStorage.setItem("theme", value), theme);
        await context.route("**/*", route => route.continue());
        await context.route("**/rest/v1/rpc/**", route => route.fulfill({ json: terms.map(term => ({ term_id: term.id, upvotes: 0, downvotes: 0, current_vote: 0 })) }));
        await context.route("**/qa/axe.js", route => route.fulfill({ contentType: "text/javascript", body: source }));
        // Embedded third parties are inspected separately; this deterministic
        // audit checks the host's real iframe geometry and CSP without provider ads.
        await context.route(/https:\/\/(www.youtube-nocookie.com|clips.twitch.tv)\//, route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Media provider QA fixture</title>" }));
        try {
            for (const [name, query] of [["home",""],["term","?t=bastion"],["media","?t=triangulation"],["stats","?page=stats"],["changelog","?page=changelog"],["about","?page=about"]]) {
                await page.goto(base+query);
                await page.locator("#terms article").first().waitFor({ state: "attached" });
                if (name === "changelog") await page.locator(".changelog-release").first().waitFor();
                await page.evaluate(() => document.fonts.ready);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${name} ${width} must not overflow`);
                layouts++;
                if (width === 1440 || width === 390) {
                    await page.addScriptTag({ url: base+"qa/axe.js" });
                    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21aa","best-practice"] } }));
                    violations.push(...result.violations.map(item => ({ id: item.id, theme, name, width, nodes: item.nodes.map(node => node.target) })));
                    scans++;
                }
                if ([1440,390,360].includes(width)) {
                    await page.locator("h1:visible").evaluate(element => element.blur());
                    await page.screenshot({ path: `output/structural/final/${theme}-${name}-${width}.png` });
                }
            }
            for (const kind of ["submit", "edit", "report"]) {
                await page.goto(base + (kind === "submit" ? "" : "?t=bastion"));
                await page.locator("#terms article").first().waitFor({ state: "attached" });
                await page.locator(kind === "submit" ? "#submit-trigger" : kind === "edit" ? "#suggest-edit-btn" : "#report-term-btn").click();
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${kind} dialog at ${width} must not overflow`);
                layouts++;
                if (width === 1440 || width === 390) {
                    await page.addScriptTag({ url: base+"qa/axe.js" });
                    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21aa","best-practice"] } }));
                    violations.push(...result.violations.map(item => ({ id: item.id, theme, name: kind, width, nodes: item.nodes.map(node => node.target) })));
                    scans++;
                    await page.screenshot({ path: `output/structural/final/${theme}-${kind}-${width}.png` });
                }
            }
        } finally { await context.close(); }
    }
    assert.deepEqual(errors, [], "No application exceptions, console errors or failed local requests");
    assert.deepEqual(violations, [], "No accessibility violations in the redesigned host UI");
    return { result: "PASS", layouts, scans, viewports, errors, violations };
}
