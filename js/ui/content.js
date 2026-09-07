import { classifyMediaItem, splitDefinitionBlocks, stripMediaSlots, safeHTTPSURL } from "../content/media.js";

export function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function plainText(html) {
    const el = document.createElement("div");
    el.innerHTML = html;
    return el.textContent || "";
}

// wraps matched query text in <mark> for highlight styling
export function highlightMatch(text, query) {
    if (!query) return escapeHTML(text);
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return String(text).split(new RegExp(`(${safe})`, "gi"))
        .map((part, index) => index % 2 ? `<mark>${escapeHTML(part)}</mark>` : escapeHTML(part)).join("");
}

const parseSafeHTTPSURL = safeHTTPSURL;

function createExternalLink(url, label, className = "") {
    const safeURL = parseSafeHTTPSURL(url);
    if (!safeURL) return null;
    const link = document.createElement("a");
    link.href = safeURL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    if (className) link.className = className;
    return link;
}

let lightboxReturnFocus = null;

function getMediaLightbox() {
    let dialog = document.getElementById("media-lightbox");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "media-lightbox";
    dialog.className = "media-lightbox";
    dialog.setAttribute("aria-labelledby", "media-lightbox-caption");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "media-lightbox-close";
    closeButton.setAttribute("aria-label", "Close expanded image");
    closeButton.textContent = "×";

    const image = document.createElement("img");
    image.id = "media-lightbox-image";
    image.alt = "";

    const caption = document.createElement("p");
    caption.id = "media-lightbox-caption";

    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
        lightboxReturnFocus?.focus?.();
        lightboxReturnFocus = null;
    });
    dialog.append(closeButton, image, caption);
    document.body.appendChild(dialog);
    return dialog;
}

function openMediaLightbox(item, trigger) {
    const dialog = getMediaLightbox();
    const image = dialog.querySelector("img");
    const caption = dialog.querySelector("p");
    image.src = item.src;
    image.alt = item.alt;
    image.width = item.width;
    image.height = item.height;
    const captionText = item.caption.trim().replace(/[.!?]+$/, "");
    caption.textContent = `${captionText} by ${item.credit.name}`;
    lightboxReturnFocus = trigger;
    dialog.showModal();
}

function createMediaBody(item) {
    if (item.type === "youtube") {
        const frame = document.createElement("iframe");
        const params = new URLSearchParams({ rel: "0" });
        if (item.start) params.set("start", String(item.start));
        frame.src = `https://www.youtube-nocookie.com/embed/${item.src}?${params}`;
        frame.title = item.title;
        frame.loading = "eager";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.allowFullscreen = true;
        return frame;
    }

    if (item.type === "twitch") {
        const frame = document.createElement("iframe");
        const parent = window.location.hostname || "localhost";
        frame.src = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(item.src)}&parent=${encodeURIComponent(parent)}&autoplay=false`;
        frame.title = item.title;
        frame.loading = "eager";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allowFullscreen = true;
        return frame;
    }

    if (item.type === "image") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "media-image-button";
        button.setAttribute("aria-label", `Expand image: ${item.title}`);
        button.style.aspectRatio = `${item.width} / ${item.height}`;
        const image = document.createElement("img");
        image.src = item.src;
        image.alt = item.alt;
        image.width = item.width;
        image.height = item.height;
        image.loading = "lazy";
        image.decoding = "async";
        button.appendChild(image);
        button.addEventListener("click", () => openMediaLightbox(item, button));
        return button;
    }

    if (item.type === "gif") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "media-image-button media-gif-button";
        button.setAttribute("aria-label", `Expand animation: ${item.title}`);
        button.style.aspectRatio = `${item.width} / ${item.height}`;
        const image = document.createElement("img");
        image.src = item.src;
        image.alt = item.alt;
        image.width = item.width;
        image.height = item.height;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
            if (item.poster && image.getAttribute("src") !== item.poster) image.src = item.poster;
        }, { once: true });
        button.appendChild(image);
        button.addEventListener("click", () => openMediaLightbox(item, button));
        return button;
    }

    if (item.type === "video") {
        const video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.width = item.width;
        video.height = item.height;
        video.style.aspectRatio = `${item.width} / ${item.height}`;
        if (item.poster) video.poster = item.poster;
        const source = document.createElement("source");
        source.src = item.src;
        source.type = item.src.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
        video.appendChild(source);
        if (item.captions) {
            const track = document.createElement("track");
            track.kind = "captions";
            track.src = item.captions;
            track.srclang = "en";
            track.label = "English";
            track.default = true;
            video.appendChild(track);
        }
        video.append("Your browser does not support HTML5 video.");
        return video;
    }

    if (item.type === "link") {
        const link = createExternalLink(item.src, "Open this example in a new tab ↗", "media-link-preview");
        if (link) link.setAttribute("aria-label", `${item.title} (opens in a new tab)`);
        return link;
    }

    return null;
}

function createMediaFallback(item, index, fallbackURL = "") {
    const sourceURL = fallbackURL || parseSafeHTTPSURL(item?.sourceUrl) || parseSafeHTTPSURL(item?.src);
    if (!sourceURL) return null;
    const title = typeof item?.title === "string" && item.title.trim()
        ? item.title.trim()
        : `Media example ${index + 1}`;
    return createExternalLink(sourceURL, `${title} — open source ↗`, "media-fallback-link");
}

function createMediaFigure(item, index, presentation = classifyMediaItem(item)) {
    const body = presentation.kind === "media"
        ? createMediaBody(item)
        : presentation.kind === "fallback"
            ? createMediaFallback(item, index, presentation.fallbackURL)
            : null;
    if (!body) return null;

    const figure = document.createElement("figure");
    figure.className = `media-card media-card-${presentation.kind === "media" ? item.type : "fallback"}`;
    figure.appendChild(body);

    if (presentation.kind === "media") {
        const caption = document.createElement("figcaption");
        const captionText = item.caption.trim().replace(/[.!?]+$/, "");
        caption.append(captionText);
        const credit = createExternalLink(item.credit.url, item.credit.name);
        if (credit) caption.append(" by ", credit);
        const providerLabel = item.type === "youtube"
            ? "YouTube"
            : item.type === "twitch"
                ? "Twitch"
                : "Source";
        const source = createExternalLink(item.sourceUrl, providerLabel);
        if (source) caption.append(" · ", source);
        figure.appendChild(caption);
    }
    return figure;
}

export function renderDefinitionWithMedia(term, container) {
    if (!container) return 0;
    const fragment = document.createDocumentFragment();
    let renderedCount = 0;
    for (const block of splitDefinitionBlocks(term.definition)) {
        if (block.type === "text") {
            const template = document.createElement("template");
            template.innerHTML = parseDefinition(block.value);
            fragment.appendChild(template.content);
        } else {
            const item = term.media?.[block.index];
            const figure = createMediaFigure(item, block.index);
            if (figure) {
                fragment.appendChild(figure);
                renderedCount += 1;
            }
        }
    }
    container.replaceChildren(fragment);
    return renderedCount;
}

export function parseDefinition(raw) {
    if (!raw) return "";

    raw = String(raw).replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, "");
    if (!window.marked?.parse || !window.DOMPurify?.sanitize) {
        return `<p>${escapeHTML(raw).replace(/\n/g, "<br>")}</p>`;
    }

    const sanitized = window.DOMPurify.sanitize(window.marked.parse(raw), {
        ALLOWED_TAGS: ["a", "blockquote", "br", "code", "del", "em", "h2", "h3", "h4", "h5", "h6", "hr", "li", "mark", "ol", "p", "pre", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul"],
        ALLOWED_ATTR: ["href", "title"],
        ALLOW_ARIA_ATTR: false,
        ALLOW_DATA_ATTR: false,
        FORBID_ATTR: ["style"]
    });

    const template = document.createElement("template");
    template.innerHTML = sanitized;
    template.content.querySelectorAll("a[href]").forEach(link => {
        try {
            const url = new URL(link.getAttribute("href"), window.location.href);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsafe link protocol");
            if (url.origin !== window.location.origin) {
                link.target = "_blank";
                link.rel = "noopener noreferrer nofollow";
            }
        } catch {
            link.removeAttribute("href");
        }
    });

    return template.innerHTML;
}

const definitionPreviewCache = new WeakMap();
export function getDefinitionPreview(term, maxLength = 220) {
    let text = definitionPreviewCache.get(term);
    if (text === undefined) {
        text = plainText(parseDefinition(stripMediaSlots(term?.definition || ""))).replace(/\s+/g, " ").trim();
        definitionPreviewCache.set(term, text);
    }
    if (text.length <= maxLength) return text;
    const shortened = text.slice(0, maxLength + 1).replace(/\s+\S*$/, "").trim();
    return `${shortened || text.slice(0, maxLength).trim()}…`;
}
