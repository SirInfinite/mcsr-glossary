import assert from "node:assert/strict";

// These checks use RPC/provider fixtures. Hosted authorization, playback and
// migration parity are independent release gates, never inferred from this file.
export async function releaseGates(browser, base) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const checks = [];
    const check = (value, label) => { assert.ok(value, label); checks.push(label); };
    const terms = (await (await context.request.get(base + "data/terms.json")).json()).terms;
    const votes = new Map(terms.map(term => [term.id, 0]));
    const moderationRequests = [];
    let moderationResponse = "success";
    await context.addInitScript(() => {
        localStorage.setItem("mcsr_browser_id", "corrupt release fixture");
        localStorage.setItem("mcsr_vote_snapshot", "{invalid JSON");
        localStorage.setItem("theme", "invalid theme");
    });
    await context.route("**/*", route => route.continue());
    await context.route(/https:\/\/(www.youtube-nocookie.com|clips.twitch.tv)\//, route => route.fulfill({ body: "<!doctype html><title>Provider fixture</title>", contentType: "text/html" }));
    await context.route("**/rest/v1/rpc/**", route => {
        const name = route.request().url().split("/").pop();
        const body = route.request().postDataJSON();
        if (name.startsWith("submit_")) {
            moderationRequests.push({ name, body });
            if (moderationResponse === "outage") return route.fulfill({ status: 503, json: { message: "Deliberate service outage" } });
            if (moderationResponse === "rejected") return route.fulfill({ status: 400, json: { message: "Deliberate backend rejection", code: "22023" } });
            if (moderationResponse === "duplicate") return route.fulfill({ status: 409, json: { message: "Duplicate pending proposal", code: "23505" } });
            if (moderationResponse === "malformed") return route.fulfill({ json: [{}] });
            return route.fulfill({ json: name.includes("report")
                ? [{ report_id: "10000000-0000-4000-8000-000000000002", report_status: "pending", created: true }]
                : [{ submission_id: "10000000-0000-4000-8000-000000000001", submission_status: "pending" }] });
        }
        const state = term => ({ term_id: term.id, upvotes: votes.get(term.id) === 1 ? 1 : 0, downvotes: votes.get(term.id) === -1 ? 1 : 0, current_vote: votes.get(term.id) });
        if (name === "set_glossary_vote") {
            votes.set(body.p_term_id, body.p_vote);
            return route.fulfill({ json: [{ ...state(terms.find(t => t.id === body.p_term_id)), changed: true }] });
        }
        return route.fulfill({ json: terms.map(state) });
    });
    try {
        await page.goto(base);
        await page.locator("#terms article").first().waitFor();
        check(await page.evaluate(() => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(localStorage.getItem("mcsr_browser_id"))), "Corrupt voter identity self-heals before any vote request");
        check(["dark", "light"].includes(await page.locator("html").getAttribute("data-theme")), "Invalid stored theme resets to a supported theme");
        await page.locator("#filter-btn").click();
        for (const category of await page.locator("#category-filters [data-value]").evaluateAll(items => items.map(item => item.dataset.value))) {
            await page.locator(`#category-filters [data-value="${category}"]`).click();
            check(await page.locator("#terms article").count() === terms.filter(t => category === "all" || t.category === category).length, `Every visible category resolves: ${category}`);
        }
        await page.locator("#clear-all-filters").click();
        await page.locator("#tag-dropdown-btn").click();
        for (const tag of await page.locator("#tag-dropdown-list input").evaluateAll(items => items.map(item => item.value))) {
            const control = page.locator(`#tag-dropdown-list input[value="${tag}"]`);
            await control.check();
            check(await page.locator("#terms article").count() === terms.filter(t => t.tags.includes(tag)).length, `Every visible tag resolves: ${tag}`);
            await control.uncheck();
        }
        await page.locator("#filter-btn").click();
        const search = page.locator("#search-input");
        for (const [query, first] of [["One Cycle", "One Cycle"], ["1 cycle", "One Cycle"], ["oNe CyClE", "One Cycle"], ["One Cy", "One Cycle"], ["Any%", "Any%"], ["Ninbot", "Ninjabrain Bot"]]) {
            await search.fill(query);
            await page.waitForFunction(name => document.querySelector("#terms article .term-name")?.textContent === name, first);
            check((await page.locator("#terms article").first().innerText()).includes(first), `Canonical/alias/prefix/punctuation ranking: ${query}`);
        }
        for (const query of ["technique", "nether", "perching", "cycle"]) {
            await search.fill(query);
            await page.waitForFunction(() => document.querySelectorAll("#terms article").length > 0);
            check(await page.locator("#terms article").count() > 0, `Category/tag/definition/substring search: ${query}`);
        }
        await search.fill("bastion");
        await page.getByRole("link", { name: "View Bastion", exact: true }).click();
        await page.locator('#page-term h1').waitFor();
        for (let i = 0; i < 3; i++) {
            await page.goBack();
            await search.waitFor();
            check(await search.inputValue() === "bastion", `Back preserves search query (${i + 1})`);
            await page.goForward();
            await page.waitForFunction(() => document.querySelector("#page-term h1")?.textContent === "Bastion");
            check((await page.locator("#page-term h1").innerText()) === "Bastion", `Forward restores matching term (${i + 1})`);
        }
        const waitVote = () => page.waitForFunction(() => !document.querySelector("#vote-up").disabled && !document.querySelector("#vote-row").hasAttribute("aria-busy"));
        await waitVote();
        for (const [button, value] of [["up", 1], ["up", 0], ["down", -1], ["down", 0], ["up", 1], ["down", -1], ["up", 1]]) {
            await page.locator(`#vote-${button}`).focus();
            await page.keyboard.press("Enter");
            await waitVote();
            check(await page.locator("#vote-up").getAttribute("aria-pressed") === String(value === 1) && await page.locator("#vote-down").getAttribute("aria-pressed") === String(value === -1), `Keyboard vote transition to ${value} via ${button}`);
        }
        check(await page.locator("#vote-up .vote-symbol").evaluate(el => getComputedStyle(el).fill) === "rgb(255, 68, 0)", "Selected upvote icon uses the required color and solid fill");
        await page.locator("#vote-down").click(); await waitVote();
        check(await page.locator("#vote-down .vote-symbol").evaluate(el => getComputedStyle(el).fill) === "rgb(146, 147, 254)", "Selected downvote icon uses the required color and solid fill");
        // Every route, including exceptional statuses and the longest entries,
        // is opened fresh rather than trusting the index's own click handler.
        for (const term of terms) {
            await page.goto(base + "?t=" + term.id);
            await page.waitForFunction(name => document.querySelector("#page-term h1")?.textContent === name, term.name);
            check(await page.locator("#term-definition-content").innerText() !== "" && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `UUID direct route resolves without phone overflow: ${term.name}`);
        }
        await page.goto(base + "?t=bastion");
        await page.waitForFunction(() => document.querySelector("#page-term h1")?.textContent === "Bastion");
        // Test a genuinely unavailable clipboard, rather than interpreting a
        // copied fallback as successful delivery to moderation.
        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
        for (const mode of ["edit", "report", "new"]) {
            for (const response of ["outage", "rejected", "malformed", "duplicate", "success"]) {
                moderationResponse = response;
                if (mode === "new") {
                    await page.locator('.nav-btn[data-page="home"]').click();
                    await page.locator("#submit-trigger").click();
                    await page.locator("#sub-name").fill("Release audit fixture");
                    await page.locator("#sub-category").selectOption("technique");
                } else await page.locator(mode === "edit" ? "#suggest-edit-btn" : "#report-term-btn").click();
                const field = mode === "report" ? "#report-details" : "#sub-definition";
                const status = mode === "report" ? "#report-status" : "#sub-status";
                const modal = mode === "report" ? "#report-modal" : "#submit-modal";
                if (mode === "report") await page.locator("#report-reason").selectOption("broken_media");
                await page.locator(field).fill("Release QA fixture: source-backed correction requiring manual review.");
                await page.locator(mode === "report" ? "#report-submit" : "#sub-submit").click();
                await page.locator(status).waitFor();
                if (response === "success") {
                    check(/submitted|sent|successfully/i.test(await page.locator(status).innerText()), `${mode}: a valid pending receipt acknowledges delivery`);
                    if (mode === "edit") check(moderationRequests.at(-1).body.p_name === "Bastion" && moderationRequests.at(-1).body.p_tags.includes("correction"), "The currently enabled edit compatibility path retains canonical context and the correction marker");
                    await page.locator(modal).waitFor({ state: "hidden" });
                } else {
                    check((await page.locator(field).inputValue()).startsWith("Release QA fixture") && /kept|not confirmed/i.test(await page.locator(status).innerText()), `${mode}: ${response} with unavailable clipboard retains the form without claiming delivery`);
                    await page.keyboard.press("Escape");
                }
            }
        }
        await page.locator("#submit-trigger").click();
        await page.locator("#sub-name").fill("Honeypot fixture");
        await page.locator("#sub-category").selectOption("technique");
        await page.locator("#sub-definition").fill("A deliberately invalid proposal testing the honeypot boundary.");
        await page.locator("#sub-website").evaluate(input => { input.value = "spam.invalid"; });
        const beforeHoneypot = moderationRequests.length;
        await page.locator("#sub-submit").click();
        await page.locator("#sub-status").waitFor();
        check(moderationRequests.length === beforeHoneypot && (await page.locator("#sub-status").innerText()).includes("rejected"), "Filled honeypot is rejected before issuing a moderation request");
        await page.keyboard.press("Escape");
        const flagged = structuredClone(terms);
        flagged[0].needsUpdating = true;
        await context.route("**/data/terms.json", route => route.fulfill({ json: { terms: flagged } }));
        await page.goto(base + "?t=" + flagged[0].id);
        await page.waitForFunction(() => document.querySelector("#page-term")?.textContent.includes("Needs Updating"));
        await page.reload();
        await page.waitForFunction(() => document.querySelector("#page-term")?.textContent.includes("Needs Updating"));
        check(await page.locator("#page-term").innerText().then(text => text.includes("Needs Updating")), "Needs Updating survives a fresh direct route and reload (no such published records)");
    } finally { await context.close(); }
    return { result: "PASS", checks: checks.length, passed: checks };
}
