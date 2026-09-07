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

        // Local bytes keep the dormant native-player/GIF paths reproducible in
        // CI without relying on another creator's asset or an external codec.
        const videoBytes = await page.evaluate(async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 320; canvas.height = 180;
            const drawing = canvas.getContext("2d");
            drawing.fillStyle = "#303c42"; drawing.fillRect(0, 0, 320, 180);
            const stream = canvas.captureStream(2);
            const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
            const parts = [];
            recorder.ondataavailable = event => parts.push(event.data);
            const stopped = new Promise(resolve => { recorder.onstop = resolve; });
            recorder.start();
            for (let frame = 0; frame < 4; frame++) {
                drawing.fillStyle = "#b5df83"; drawing.fillRect(20 + frame * 60, 85, 40, 10);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            recorder.stop(); await stopped;
            stream.getTracks().forEach(track => track.stop());
            return [...new Uint8Array(await new Blob(parts).arrayBuffer())];
        });
        await context.route("**/media/release-fixture.webm", route => route.fulfill({ contentType: "video/webm", body: Buffer.from(videoBytes) }));
        await context.route("**/images/media/release-fixture.gif", route => route.fulfill({ contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64") }));
        await page.evaluate(async () => {
            const { renderDefinitionWithMedia } = await import("./js/ui/content.js");
            const common = { title: "Local playback fixture", caption: "A test of the native media boundary.", credit: { name: "QA", url: "https://example.com/creator" }, sourceUrl: "https://example.com/source" };
            renderDefinitionWithMedia({ definition: "Before.\n\n{{media:0}}\n\nBetween.\n\n{{media:1}}\n\nAfter.", media: [
                { ...common, type: "video", src: "media/release-fixture.webm", width: 320, height: 180, hasAudio: false },
                { ...common, type: "gif", src: "images/media/release-fixture.gif", width: 1, height: 1, alt: "Static GIF decoding fixture", poster: "images/media/nether-coordinate-scaling.svg" }
            ] }, document.getElementById("term-definition-content"));
        });
        const native = page.locator("#term-definition-content video");
        await native.scrollIntoViewIfNeeded();
        await native.evaluate(video => video.readyState >= 2 ? undefined : new Promise(resolve => video.addEventListener("loadeddata", resolve, { once: true })));
        check(await native.evaluate(video => video.controls && video.paused && !video.autoplay && video.videoWidth === 320), "Native video decodes with controls and no autoplay");
        await native.evaluate(async video => { video.muted = true; await video.play(); });
        await native.evaluate(video => new Promise(resolve => video.requestVideoFrameCallback(resolve)));
        check(await native.evaluate(video => video.currentTime > 0), "Native video plays a decoded frame");
        await native.evaluate(video => video.pause());
        const gif = page.locator(".media-gif-button img");
        await gif.scrollIntoViewIfNeeded(); await gif.evaluate(image => image.decode());
        check(await gif.getAttribute("alt") === "Static GIF decoding fixture" && await gif.getAttribute("loading") === "lazy", "GIF decoding preserves alt text and lazy loading (static test fixture)");
        await page.locator(".media-gif-button").click();
        await page.locator("#media-lightbox").waitFor();
        await page.keyboard.press("Escape");
        check(await page.locator(".media-gif-button").evaluate(button => button === document.activeElement), "GIF lightbox Escape restores focus");
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Native media stays within the phone reading column");
    } finally { await context.close(); }
    return {passed};
}
