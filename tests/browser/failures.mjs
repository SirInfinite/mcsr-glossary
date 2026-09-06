import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function failureFlows(browser, base) {
    const terms = JSON.parse(await readFile(new URL("../../data/terms.json", import.meta.url), "utf8")).terms;
    const checks = [];
    const check = (value, label) => { assert.ok(value, label); checks.push(label); };
    async function environment(prepare = async () => {}) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
        const page = await context.newPage();
        await context.route("**/*", route => route.continue());
        await context.route("**/rest/v1/rpc/**", route => route.fulfill({ json: terms.map(term => ({ term_id: term.id, upvotes: 0, downvotes: 0, current_vote: 0 })) }));
        await prepare(context, page);
        return { context, page };
    }
    for (const [label, response] of [
        ["missing terms.json", { status: 404, body: "Not found" }],
        ["invalid JSON", { contentType: "application/json", body: "{invalid" }],
        ["invalid content schema", { json: { terms: [{ id: '<img src=x onerror=alert(1)>', name: "Bad term" }] } }]
    ]) {
        const { context, page } = await environment(context => context.route("**/data/terms.json", route => route.fulfill(response)));
        try {
            await page.goto(base);
            await page.locator(".data-error").waitFor();
            check(await page.locator("#search-input").isDisabled(), `${label} fails safely with a useful content error`);
            await page.locator('.nav-btn[data-page="about"]').click();
            check(await page.locator("#page-about h1").isVisible(), `${label} preserves independent site navigation`);
        } finally { await context.close(); }
    }
    for (const [label, response] of [
        ["Supabase outage", { status: 503, body: "unavailable" }],
        ["malformed vote response", { json: [{ term_id: terms[0].id, upvotes: -1, downvotes: 0, current_vote: 2 }] }]
    ]) {
        const { context, page } = await environment(context => context.route("**/rest/v1/rpc/**", route => route.fulfill(response)));
        try {
            await page.goto(base + "?t=bastion");
            await page.waitForFunction(() => !document.querySelector("#vote-status")?.textContent.includes("Loading"));
            check(await page.locator("#vote-up").isDisabled(), `${label} disables unverified writes`);
            await page.keyboard.press("/");
            await page.locator("#search-input").fill("1 cycle");
            check((await page.locator("#terms").innerText()).includes("One Cycle"), `${label} preserves search`);
        } finally { await context.close(); }
    }
    {
        const { context, page } = await environment(context => context.route("**/CHANGELOG.md", route => route.fulfill({ status: 503, body: "unavailable" })));
        try {
            await page.goto(base + "?page=changelog");
            await page.locator(".changelog-error a").waitFor();
            check((await page.locator(".changelog-error").innerText()).includes("GitHub"), "Unavailable local release notes provide a safe source link");
        } finally { await context.close(); }
    }
    {
        const { context, page } = await environment(context => context.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked storage fixture"); } })));
        try {
            await page.goto(base);
            await page.locator("#terms article").first().waitFor();
            check(await page.locator("#terms article").count() === terms.length, "Unavailable localStorage does not block startup");
            await page.locator("#theme-toggle").click();
            check(await page.locator("html").getAttribute("data-theme") === "light", "Theme switching works without persistence");
        } finally { await context.close(); }
    }
    {
        const { context, page } = await environment();
        try {
            await page.goto(base + "?t=does-not-exist");
            await page.getByRole("heading", { name: "Term not found" }).waitFor();
            check(await page.getByRole("button", { name: "Browse glossary", exact: true }).isVisible(), "Invalid direct routes have an explicit recovery");
            await page.getByRole("button", { name: "Browse glossary", exact: true }).click();
            await page.locator('#terms .term-name-link[aria-label="View Bastion"]').click();
            await page.reload();
            check(await page.locator("#page-term h1").innerText() === "Bastion", "Direct term routes survive reload at the Pages subpath");
            await page.goBack();
            await page.goForward();
            check(await page.locator("#page-term h1").innerText() === "Bastion", "Back and forward preserve route identity");
            const security = await page.evaluate(async () => {
                const { parseDefinition, highlightMatch } = await import("./js/ui/content.js");
                const attacks = [
                    '<script>window.attack=true</script><p>Safe</p>',
                    '<img src=x onerror="window.attack=true">',
                    '[bad](javascript:alert(1))',
                    '<svg><a onload="window.attack=true">x</a></svg>',
                    '<iframe src="https://evil.example"></iframe>',
                    '<p style="background:url(javascript:alert(1))" onclick="window.attack=true">safe</p>',
                    '<style>body{display:none}</style><math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">'
                ];
                return attacks.map(source => {
                    const target = document.createElement("div");
                    target.innerHTML = parseDefinition(source);
                    return !target.querySelector("script,style,iframe,img,svg,math,[style],[onclick],[onerror],[onload],[href^='javascript:']");
                }).concat(highlightMatch('<img src=x onerror=alert(1)>', 'img').includes('&lt;'));
            });
            check(security.every(Boolean), "The shared sanitizer rejects scripts, event handlers, SVG, iframe, malformed markup, unsafe URLs and CSS injection");
        } finally { await context.close(); }
    }
    {
        let finish;
        let writes = 0;
        const { context, page } = await environment(context => context.route("**/rest/v1/rpc/set_glossary_vote", async route => {
            writes++;
            await new Promise(resolve => { finish = resolve; });
            await route.fulfill({ json: [{ upvotes: 1, downvotes: 0, current_vote: 1, changed: true }] });
        }));
        try {
            await page.goto(base + "?t=bastion");
            await page.waitForFunction(() => document.querySelector("#vote-up")?.disabled === false);
            await page.locator("#vote-up").click();
            await page.locator('.nav-btn[data-page="home"]').click();
            await page.locator('#terms .term-name-link[aria-label="View Bastion"]').click();
            check(await page.locator("#vote-up").isDisabled(), "Reopening the same term cannot bypass its pending vote guard");
            await page.locator("#vote-up").dispatchEvent("click");
            check(writes === 1, "Synthetic duplicate clicks cannot create an overlapping write");
            finish();
            await page.waitForFunction(() => !document.querySelector("#vote-row").hasAttribute("aria-busy"));
            check(await page.locator("#vote-up-count").innerText() === "1", "The current same-term view receives the authoritative completed vote");
        } finally { finish?.(); await context.close(); }
    }
    {
        let finish;
        const { context, page } = await environment(context => context.route("**/rest/v1/rpc/submit_glossary_term", async route => {
            await new Promise(resolve => { finish = resolve; });
            await route.fulfill({ json: [{ submission_id: "10000000-0000-4000-8000-000000000002", submission_status: "pending" }] });
        }));
        try {
            await page.goto(base);
            await page.locator("#submit-trigger").click();
            await page.locator("#sub-name").fill("Old form fixture");
            await page.locator("#sub-category").selectOption("technique");
            await page.locator("#sub-definition").fill("A valid old form awaiting its delayed response.");
            await page.locator("#sub-submit").click();
            await page.locator("#submit-modal-close").click();
            await page.locator("#submit-trigger").click();
            await page.locator("#sub-name").fill("New form must survive");
            check(await page.locator("#sub-submit").isDisabled(), "Reopening a pending proposal does not permit another request");
            finish();
            await page.waitForFunction(() => !document.querySelector("#sub-submit").disabled);
            check(await page.locator("#sub-name").inputValue() === "New form must survive", "A stale moderation result cannot reset a new form");
            await page.waitForTimeout(1900);
            check(await page.locator("#submit-modal").isVisible(), "A stale success timer cannot close a new dialog");
        } finally { finish?.(); await context.close(); }
    }
    return { result: "PASS", checks: checks.length, passed: checks };
}
