import assert from "node:assert/strict";

// Deliberate provider/network fixtures protect rendering behavior; real-source
// playback and editorial relevance are reviewed separately in MEDIA_AUDIT.md.
export async function mediaFlows(browser, base) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const passed = [];
    const check = (value, name) => { assert.ok(value, name); passed.push(name); };
    await context.route("https://www.youtube-nocookie.com/**", route => route.abort());
    await context.route("https://clips.twitch.tv/**", route => route.abort());
    try {
        await page.goto(base + "?t=triangulation");
        await page.locator("#term-definition-content iframe").waitFor();
        check(await page.locator("figcaption a").last().isVisible(), "An unavailable video retains its independent, descriptive source link");
        check((await page.locator("figcaption a").last().getAttribute("aria-label")).includes("YouTube"), "Media source links have context-specific accessible names");
        await context.route("**/images/media/stronghold-triangulation.svg", route => route.fulfill({status: 404}));
        await page.reload();
        await page.locator(".media-fallback-link").waitFor();
        check(await page.locator(".media-image-button").count() === 0, "A failed image becomes a usable source link rather than a broken expansion button");
        check((await page.locator(".media-fallback-link").getAttribute("href")).startsWith("https://github.com/"), "Image failure preserves its verified source attribution");
        const fixtures = await page.evaluate(async () => {
            const {renderDefinitionWithMedia} = await import("./js/ui/content.js");
            const common = {title: "Specific community demonstration", caption: "A controlled media rendering fixture.", credit: {name: "QA", url: "https://example.com/creator"}, sourceUrl: "https://example.com/source"};
            const render = item => {const node = document.createElement("div"); renderDefinitionWithMedia({definition: "Before.\n\n{{media:0}}\n\nAfter.", media: [item]}, node); return node;};
            const youtube = render({...common, type: "youtube", src: "JaVyuTyDxxs", start: 28}).querySelector("iframe");
            const twitch = render({...common, type: "twitch", src: "VerifiedClipSlug"}).querySelector("iframe");
            const link = render({...common, type: "link", src: "https://example.com/demo"}).querySelector("a");
            return { youtube: youtube.src, youtubeTitle: youtube.title, twitch: twitch.src, link: link.textContent };
        });
        check(fixtures.youtube.includes("youtube-nocookie.com/embed/JaVyuTyDxxs") && fixtures.youtube.includes("start=28") && !fixtures.youtube.includes("autoplay=1"), "YouTube retains exact timestamps, privacy-enhanced hosting and no autoplay");
        check(fixtures.youtubeTitle === "Specific community demonstration", "Iframes announce the demonstration rather than a generic player");
        const twitch = new URL(fixtures.twitch);
        check(twitch.searchParams.get("parent") === new URL(base).hostname && twitch.searchParams.get("autoplay") === "false", "Twitch uses the current hosting parent and disables autoplay");
        check(fixtures.link.includes("Specific community demonstration"), "External media previews identify their actual content");
    } finally { await context.close(); }
    return {passed};
}
