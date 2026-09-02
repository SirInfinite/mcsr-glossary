import { TERM_CONTRACT, isValidEditorialDate, slugifyTermName as slugify } from "./content-contract.js";
import { classifyMediaItem, getVoteTarget, normalizeVoteValue, projectVoteTotals } from "./glossary-core.js";

const GITHUB_REPO = "SirInfinite/mcsr-glossary";
const REQUEST_TIMEOUT_MS = 8000;

const runtimeConfig = window.MCSR_CONFIG || {};

function normalizeSupabaseURL(value) {
    const raw = String(value || "").trim().replace(/\/$/, "");
    if (!raw) return "";

    try {
        const url = new URL(raw);
        const localDevelopment = ["localhost", "127.0.0.1"].includes(url.hostname);
        if (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:")) return "";
        return url.origin;
    } catch {
        return "";
    }
}

function decodeLegacyKeyRole(key) {
    const parts = key.split(".");
    if (parts.length !== 3) return "";

    try {
        const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
        return String(JSON.parse(atob(padded)).role || "");
    } catch {
        return "";
    }
}

function assessSupabaseKey(value) {
    const key = String(value || "").trim();
    if (!key) return { key: "", error: "Supabase is not configured." };
    if (key.startsWith("sb_secret_")) return { key: "", error: "A privileged Supabase key was rejected." };
    if (key.startsWith("sb_publishable_")) return { key, error: "" };

    const legacyRole = decodeLegacyKeyRole(key);
    if (legacyRole === "service_role") return { key: "", error: "A privileged Supabase key was rejected." };
    if (legacyRole === "anon") return { key, error: "" };
    return { key: "", error: "Only a Supabase publishable key or legacy anon key is allowed." };
}

const configuredSupabaseURL = String(runtimeConfig.supabaseUrl || "").trim();
const SUPABASE_URL = normalizeSupabaseURL(configuredSupabaseURL);
const assessedSupabaseKey = assessSupabaseKey(runtimeConfig.supabasePublishableKey);
const SUPABASE_PUBLISHABLE_KEY = assessedSupabaseKey.key;
const SUPABASE_CONFIG_ERROR = configuredSupabaseURL && !SUPABASE_URL
    ? "The Supabase project URL is invalid."
    : assessedSupabaseKey.error;

let data = { terms: [], titleString: "MCSR Glossary", aboutParagraph: "" };
let dataLoadFailed = false;

// page state
let currentPage = "home";
let activeIndexLetter = "ALL";
let searchQuery = "";
let tooltipFocusIdx = -1;
let tooltipItems = [];

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

const sb = {
    get enabled() {
        return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
    },
    get configurationError() {
        return SUPABASE_CONFIG_ERROR;
    },
    async request(path, options = {}) {
        if (!this.enabled) throw new Error(this.configurationError || "Supabase is unavailable.");

        const response = await fetchWithTimeout(`${SUPABASE_URL}${path}`, {
            ...options,
            headers: {
                apikey: SUPABASE_PUBLISHABLE_KEY,
                ...options.headers
            }
        });
        const contentType = response.headers.get("content-type") || "";
        let payload = null;
        if (contentType.includes("application/json")) {
            try { payload = await response.json(); } catch { payload = null; }
        }

        if (!response.ok) {
            const error = new Error(payload?.message || `Supabase request failed (${response.status}).`);
            error.status = response.status;
            error.code = payload?.code || "";
            throw error;
        }
        return payload;
    },
    async rpc(functionName, body) {
        return this.request(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    }
};

const filterState = {
    category: "all",
    tags: new Set(),
    tagMatch: "any"
};

// helper funcs
function toLower(val) {
    return String(val || "").toLowerCase(); // works w/ null + undef
}

function sortTerms(terms) {
    return [...terms].sort((a, b) => toLower(a.name).localeCompare(toLower(b.name)));
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function readStoredJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function writeStoredJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function plainText(html) {
    const el = document.createElement("div");
    el.innerHTML = html;
    return el.textContent || "";
}

// wraps matched query text in <mark> for highlight styling
function highlightMatch(text, query) {
    if (!query) return escapeHTML(text);
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escapeHTML(text).replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
}

function parseSafeHTTPSURL(value) {
    try {
        const url = new URL(String(value || "").trim());
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

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
    caption.textContent = `${item.title} — ${item.caption}`;
    lightboxReturnFocus = trigger;
    dialog.showModal();
}

function createProviderPlaceholder(item, providerName, loadEmbed) {
    const placeholder = document.createElement("div");
    placeholder.className = "media-provider-placeholder";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-load-button";
    button.setAttribute("aria-label", `Load ${item.title} from ${providerName}`);

    const play = document.createElement("span");
    play.className = "media-play-mark";
    play.setAttribute("aria-hidden", "true");
    play.textContent = "▶";

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const note = document.createElement("small");
    note.textContent = `Load from ${providerName}`;
    copy.append(title, note);
    button.append(play, copy);

    button.addEventListener("click", () => {
        const embed = loadEmbed();
        if (embed) placeholder.replaceChildren(embed);
    }, { once: true });
    placeholder.appendChild(button);
    return placeholder;
}

function createMediaBody(item) {
    if (item.type === "youtube") {
        return createProviderPlaceholder(item, "YouTube (privacy-enhanced)", () => {
            const frame = document.createElement("iframe");
            const params = new URLSearchParams({ rel: "0" });
            if (item.start) params.set("start", String(item.start));
            frame.src = `https://www.youtube-nocookie.com/embed/${item.src}?${params}`;
            frame.title = item.title;
            frame.loading = "lazy";
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            frame.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share";
            frame.allowFullscreen = true;
            return frame;
        });
    }

    if (item.type === "twitch") {
        return createProviderPlaceholder(item, "Twitch", () => {
            const frame = document.createElement("iframe");
            const parent = window.location.hostname || "localhost";
            frame.src = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(item.src)}&parent=${encodeURIComponent(parent)}`;
            frame.title = item.title;
            frame.loading = "lazy";
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            frame.allowFullscreen = true;
            return frame;
        });
    }

    if (item.type === "image") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "media-image-button";
        button.setAttribute("aria-label", `Expand image: ${item.title}`);
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
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", `Play animation: ${item.title}`);
        const image = document.createElement("img");
        image.src = item.poster;
        image.alt = `${item.alt} (animation paused)`;
        image.width = item.width;
        image.height = item.height;
        image.loading = "lazy";
        const stateLabel = document.createElement("span");
        stateLabel.className = "media-gif-state";
        stateLabel.textContent = "Play GIF";
        button.append(image, stateLabel);
        button.addEventListener("click", () => {
            const playing = button.getAttribute("aria-pressed") === "true";
            button.setAttribute("aria-pressed", String(!playing));
            button.setAttribute("aria-label", `${playing ? "Play" : "Pause"} animation: ${item.title}`);
            image.src = playing ? item.poster : item.src;
            image.alt = playing ? `${item.alt} (animation paused)` : item.alt;
            stateLabel.textContent = playing ? "Play GIF" : "Pause GIF";
        });
        return button;
    }

    if (item.type === "video") {
        const video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.width = item.width;
        video.height = item.height;
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
    const link = createExternalLink(sourceURL, `${title} — open source ↗`, "media-fallback-link");
    if (!link) return null;
    const note = document.createElement("p");
    note.textContent = "This media type is not available here, so the original source is linked instead.";
    const fallback = document.createElement("div");
    fallback.className = "media-fallback";
    fallback.append(link, note);
    return fallback;
}

function createMediaFigure(item, index) {
    const presentation = classifyMediaItem(item);
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
        const heading = document.createElement("h3");
        heading.textContent = item.title;
        const description = document.createElement("p");
        description.textContent = item.caption;
        const attribution = document.createElement("p");
        attribution.className = "media-attribution";
        attribution.append("Credit: ");
        const credit = createExternalLink(item.credit.url, item.credit.name);
        if (credit) attribution.appendChild(credit);
        const source = createExternalLink(item.sourceUrl, "Original source");
        if (source) attribution.append(" · ", source);
        caption.append(heading, description, attribution);
        figure.appendChild(caption);
    }
    return figure;
}

function renderMediaGallery(items, container) {
    if (!container || !Array.isArray(items)) return 0;
    container.replaceChildren();
    let renderedCount = 0;
    items.forEach((item, index) => {
        const figure = createMediaFigure(item, index);
        if (!figure) return;
        container.appendChild(figure);
        renderedCount += 1;
    });
    return renderedCount;
}

function parseDefinition(raw) {
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

function showToast(msg) {
    let toast = document.querySelector(".copy-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "copy-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to the textarea fallback.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch { /* Storage is optional. */ }

    const icon = document.querySelector("#theme-toggle img");
    if (icon) {
        icon.src = isDark ? "images/dark-mode.png" : "images/light-mode.png";
    }

    const logo = document.getElementById("logo");
    if (logo) logo.src = isDark ? "images/logo.png" : "images/logo-dark.png";

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
        toggle.style.background = isDark ? "#11151f" : "#75b5ff";
        toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
}

function handleURLRouting() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    const page = params.get("page");

    if (t) {
        const term = data.terms.find(term => slugify(term.name) === t || term.id === t);
        if (term) { showPage("term", term.id); return; }
    }

    if (page && ["stats", "changelog", "credits", "home"].includes(page)) {
        showPage(page); return;
    }

    showPage("home");
}

function setURLParams(updates, { replace = false } = {}) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value != null && value !== "") params.set(key, value);
        else params.delete(key);
    }
    const newURL = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    const state = { mcsr: true, from: replace ? null : window.location.href };
    history[replace ? "replaceState" : "pushState"](state, "", newURL);
}

function showPage(page, termId) {
    currentPage = page;

    document.querySelectorAll(".page").forEach(el => el.style.display = "none");
    const target = document.getElementById(`page-${page}`);
    if (target) target.style.display = "block";

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.removeAttribute("aria-current");
        if (btn.dataset.page === page) btn.setAttribute("aria-current", "page");
    });

    if (page === "term" && termId) renderTermDetail(termId);
    if (page === "stats") renderStats();
    if (page === "changelog") renderChangelog();

    if (page !== "term") {
        const titles = { home: "MCSR Glossary", stats: "Stats | MCSR Glossary", changelog: "Changelog | MCSR Glossary", credits: "Credits | MCSR Glossary" };
        document.title = titles[page] || "MCSR Glossary";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigateToTerm(term) {
    if (!term) return;
    setURLParams({ t: slugify(term.name), page: null });
    showPage("term", term.id);
}

function buildTermCard(term, delay = 0) {
    const card = document.createElement("div");
    card.className = "term";
    card.setAttribute("role", "listitem");
    card.setAttribute("id", `term-${term.id}`);
    card.style.animationDelay = `${delay}ms`;

    const cardHead = document.createElement("div");
    cardHead.className = "card-head";

    const headerLeft = document.createElement("div");
    headerLeft.className = "term-header-left";
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "term-name term-name-link";
    nameButton.textContent = term.name || "";
    nameButton.setAttribute("aria-label", `View ${term.name}`);
    nameButton.addEventListener("click", () => navigateToTerm(term));
    const category = document.createElement("span");
    category.className = "term-category";
    category.textContent = term.category || "";
    headerLeft.append(nameButton, category);
    cardHead.appendChild(headerLeft);

    if (term.aliases?.length) {
        const aka = document.createElement("span");
        aka.className = "term-aka";
        aka.textContent = `(a.k.a. ${term.aliases.join(", ")})`;
        cardHead.appendChild(aka);
    }

    card.appendChild(cardHead);

    if (term.tags?.length || term.needsUpdating) {
        const tagsDiv = document.createElement("div");
        tagsDiv.className = "term-tags";

        (term.tags || []).forEach(tag => {
            const badge = document.createElement("span");
            badge.className = "term-tag";
            badge.textContent = tag;
            tagsDiv.appendChild(badge);
        });

        if (term.needsUpdating) {
            const warn = document.createElement("span");
            warn.className = "term-tag update-tag";
            warn.textContent = "⚠️ Needs updating";
            tagsDiv.appendChild(warn);
        }

        card.appendChild(tagsDiv);
    }

    const defDiv = document.createElement("div");
    defDiv.className = "term-content";
    defDiv.innerHTML = parseDefinition(term.definition, { includeMedia: false });
    card.appendChild(defDiv);

    card.addEventListener("click", event => {
        if (event.target.closest("a, button, input, iframe, video")) return;
        navigateToTerm(term);
    });
    return card;
}

function renderTermsList(terms) {
    const container = document.getElementById("terms");
    if (!container) return;

    container.innerHTML = "";

    if (!terms.length) {
        const msg = document.createElement("div");
        msg.id = "no-results";
        msg.setAttribute("role", "status");
        msg.textContent = "No matching terms found.";
        container.appendChild(msg);
        return;
    }

    terms.forEach((term, i) => container.appendChild(buildTermCard(term, i * 18)));
}

function renderTermDetail(id) {
    const term = data.terms.find(t => t.id === id);
    const page = document.getElementById("page-term");
    if (!term || !page) return;

    const votes = getVotes(term.id);
    const currentVote = getVoteState(term.id);
    const votingEnabled = sb.enabled && voteServiceAvailable;
    const voteNote = !sb.enabled
        ? (sb.configurationError || "Voting is not configured.")
        : !voteServiceAvailable
            ? `${voteServiceMessage} Displayed totals may be cached.`
            : currentVote === 1
                ? "Your upvote is saved. Select Upvote again to remove it, or choose Downvote to switch."
                : currentVote === -1
                    ? "Your downvote is saved. Select Downvote again to remove it, or choose Upvote to switch."
                    : "Choose a reaction. One current vote is stored per persistent browser ID.";
    const updatedDate = term.updatedDate ? new Date(`${term.updatedDate}T00:00:00`) : null;
    const dateStr = updatedDate && !Number.isNaN(updatedDate.getTime())
        ? updatedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
    const relatedTerms = (term.relatedTerms || [])
        .map(name => data.terms.find(candidate => toLower(candidate.name) === toLower(name)))
        .filter((related, index, items) => related && items.findIndex(item => item?.id === related.id) === index);

    page.innerHTML = `
        <div class="container" style="padding-top:1em;">
            <button class="back-btn" id="detail-back" type="button">
                <i class="fa-solid fa-arrow-left"></i> Back
            </button>
            <div class="term-detail-header">
                <h1 class="term-detail-name">${escapeHTML(term.name)}</h1>
                <div class="term-detail-meta">
                    <span class="term-category">${escapeHTML(term.category || "")}</span>
                    ${term.aliases?.length ? `<span>· aka ${term.aliases.map(escapeHTML).join(", ")}</span>` : ""}
                    ${dateStr ? `<span>· Updated ${dateStr}</span>` : ""}
                    <button class="term-share-btn" id="share-btn" type="button">
                        <i class="fa-solid fa-link"></i> Copy link
                    </button>
                </div>
                ${term.tags?.length || term.needsUpdating ? `
                <div class="term-tags" style="margin-top:0.6em;">
                    ${(term.tags || []).map(t => `<span class="term-tag">${escapeHTML(t)}</span>`).join("")}
                    ${term.needsUpdating ? `<span class="term-tag update-tag">⚠️ Needs updating</span>` : ""}
                </div>` : ""}
            </div>
            <div class="term-detail-body term-content">
                ${parseDefinition(term.definition)}
            </div>
            <section class="term-media" id="term-media" aria-labelledby="term-media-title">
                <h2 id="term-media-title">Examples &amp; media</h2>
                <div class="media-gallery" id="term-media-gallery"></div>
            </section>
            ${relatedTerms.length ? `
            <div class="related-terms">
                <h3>Related Terms</h3>
                ${relatedTerms.map(related => `<button class="related-tag" type="button" data-id="${related.id}">${escapeHTML(related.name)}</button>`).join("")}
            </div>` : ""}
            <div class="vote-section">
                <h2>Was this definition useful?</h2>
                <div class="vote-row" id="vote-row">
                    <button class="vote-btn upvote ${currentVote === 1 ? 'voted' : ''}" id="vote-up" type="button" aria-label="Upvote ${escapeHTML(term.name)}" aria-pressed="${currentVote === 1}" ${votingEnabled ? '' : 'disabled'}>
                        ▲ <span id="vote-up-count">${votes.up}</span>
                    </button>
                    <button class="vote-btn downvote ${currentVote === -1 ? 'voted' : ''}" id="vote-down" type="button" aria-label="Downvote ${escapeHTML(term.name)}" aria-pressed="${currentVote === -1}" ${votingEnabled ? '' : 'disabled'}>
                        ▼ <span id="vote-down-count">${votes.down}</span>
                    </button>
                </div>
                <p class="vote-note" id="vote-status" role="status" aria-live="polite">${escapeHTML(voteNote)}</p>
            </div>
        </div>
    `;
    document.title = `${term.name} | MCSR Glossary`;

    const renderedMedia = renderMediaGallery(term.media, document.getElementById("term-media-gallery"));
    if (!renderedMedia) document.getElementById("term-media")?.remove();

    document.getElementById("detail-back")?.addEventListener("click", () => {
        if (history.state?.from) {
            history.back();
            return;
        }
        setURLParams({ t: null, page: null }, { replace: true });
        showPage("home");
    });

    document.getElementById("share-btn")?.addEventListener("click", async () => {
        const url = `${location.origin}${location.pathname}?t=${slugify(term.name)}`;
        showToast(await copyText(url) ? "Link copied!" : "Could not copy the link.");
    });

    function updateVoteControls(vote, totals, enabled = true) {
        const upButton = document.getElementById("vote-up");
        const downButton = document.getElementById("vote-down");
        const upCount = document.getElementById("vote-up-count");
        const downCount = document.getElementById("vote-down-count");
        if (!upButton || !downButton || !upCount || !downCount) return;

        upButton.classList.toggle("voted", vote === 1);
        downButton.classList.toggle("voted", vote === -1);
        upButton.setAttribute("aria-pressed", String(vote === 1));
        downButton.setAttribute("aria-pressed", String(vote === -1));
        upButton.disabled = !enabled;
        downButton.disabled = !enabled;
        upCount.textContent = String(totals.up);
        downCount.textContent = String(totals.down);
    }

    let voteRequestPending = false;
    async function handleVote(direction) {
        if (voteRequestPending) return;
        voteRequestPending = true;

        const voteRow = document.getElementById("vote-row");
        const status = document.getElementById("vote-status");
        const previousVote = getVoteState(term.id);
        const previousTotals = getVotes(term.id);
        const targetVote = getVoteTarget(previousVote, direction);
        const optimisticTotals = projectVoteTotals(previousTotals, previousVote, targetVote);

        votesCache[term.id] = optimisticTotals;
        writeStoredJSON("mcsr_vote_totals", votesCache);
        rememberVote(term.id, targetVote);
        updateVoteControls(targetVote, optimisticTotals, false);
        voteRow?.setAttribute("aria-busy", "true");
        status.textContent = "Saving vote…";

        const result = await setVote(term.id, targetVote);
        voteRow?.removeAttribute("aria-busy");
        voteRequestPending = false;

        if (!result.ok) {
            votesCache[term.id] = previousTotals;
            writeStoredJSON("mcsr_vote_totals", votesCache);
            rememberVote(term.id, previousVote);
            updateVoteControls(previousVote, previousTotals, sb.enabled && voteServiceAvailable);
            status.textContent = result.reason || "Vote could not be saved.";
            showToast(status.textContent);
            return;
        }

        const authoritativeTotals = { up: result.upvotes, down: result.downvotes };
        updateVoteControls(result.currentVote, authoritativeTotals, true);
        status.textContent = result.currentVote === 1
            ? "Your upvote is saved. Select Upvote again to remove it, or choose Downvote to switch."
            : result.currentVote === -1
                ? "Your downvote is saved. Select Downvote again to remove it, or choose Upvote to switch."
                : "Your vote was removed. You can vote again at any time.";
        renderFeatured();
        showToast(result.currentVote === 0 ? "Vote removed." : result.currentVote === 1 ? "Upvote saved." : "Downvote saved.");
    }

    document.getElementById("vote-up")?.addEventListener("click", () => handleVote(1));
    document.getElementById("vote-down")?.addEventListener("click", () => handleVote(-1));

    page.querySelectorAll(".related-tag[data-id]").forEach(el => {
        el.addEventListener("click", () => {
            const related = data.terms.find(t => t.id === el.dataset.id);
            navigateToTerm(related);
        });
    });
}

function goToRandomTerm() {
    if (!data.terms.length) {
        showToast("No terms are available yet.");
        return;
    }
    const term = data.terms[Math.floor(Math.random() * data.terms.length)];
    navigateToTerm(term);
}

function positionTooltip() {
    const input = document.getElementById("search-input");
    const tooltip = document.getElementById("search-tooltip");
    if (!input || !tooltip) return;
    const rect = input.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 6}px`;
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.width = `${rect.width}px`;
}

function showSearchTooltip(query) {
    const tooltip = document.getElementById("search-tooltip");
    const inner = document.getElementById("search-tooltip-inner");
    if (!tooltip || !inner) return;

    if (!query) { hideSearchTooltip(); return; }

    const results = filterAndSearch().slice(0, 7);
    tooltipItems = results;
    tooltipFocusIdx = -1;

    if (!results.length) { hideSearchTooltip(); return; }

    inner.innerHTML = "";
    results.forEach(term => {
        const item = document.createElement("div");
        item.className = "tooltip-item";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.id = `search-option-${term.id}`;
        const preview = plainText(parseDefinition(term.definition, { includeMedia: false })).slice(0, 120);
        item.innerHTML = `
            <span class="tooltip-name">${highlightMatch(term.name, query)}</span>
            <span class="tooltip-category">${escapeHTML(term.category || "")}</span>
            <span class="tooltip-preview">${escapeHTML(preview)}…</span>
        `;
        // mousedown fires before blur, so we prevent default to stop input losing focus
        item.addEventListener("mousedown", e => { e.preventDefault(); selectTooltipItem(term); });
        inner.appendChild(item);
    });

    positionTooltip();
    tooltip.style.display = "block";
    document.getElementById("search-input")?.setAttribute("aria-expanded", "true");
}

function hideSearchTooltip() {
    const tooltip = document.getElementById("search-tooltip");
    if (tooltip) tooltip.style.display = "none";
    const input = document.getElementById("search-input");
    input?.setAttribute("aria-expanded", "false");
    input?.removeAttribute("aria-activedescendant");
    tooltipFocusIdx = -1;
}

function selectTooltipItem(term) {
    hideSearchTooltip();
    navigateToTerm(term);
}

// moves keyboard focus up/down through tooltip results
function moveFocus(dir) {
    const items = document.querySelectorAll("#search-tooltip-inner .tooltip-item");
    if (!items.length) return;
    items.forEach(i => {
        i.classList.remove("tooltip-focused");
        i.setAttribute("aria-selected", "false");
    });
    tooltipFocusIdx = (tooltipFocusIdx + dir + items.length) % items.length;
    items[tooltipFocusIdx].classList.add("tooltip-focused");
    items[tooltipFocusIdx].setAttribute("aria-selected", "true");
    document.getElementById("search-input")?.setAttribute("aria-activedescendant", items[tooltipFocusIdx].id);
    items[tooltipFocusIdx].scrollIntoView({ block: "nearest" });
}

function buildIndex() {
    const container = document.getElementById("index");
    if (!container) return;
    container.innerHTML = "";

    const usedLetters = new Set(data.terms.map(t => (t.name || "").charAt(0).toUpperCase()));

    const allLink = document.createElement("button");
    allLink.type = "button";
    allLink.className = "index-letter active";
    allLink.textContent = "ALL";
    allLink.addEventListener("click", () => setIndexLetter("ALL"));
    container.appendChild(allLink);

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        const a = document.createElement("button");
        a.type = "button";
        const exists = usedLetters.has(letter);
        a.className = "index-letter" + (exists ? "" : " inactive");
        a.textContent = letter;
        if (exists) {
            a.addEventListener("click", () => setIndexLetter(letter));
        } else a.disabled = true;
        container.appendChild(a);
    }
}

function setIndexLetter(letter) {
    activeIndexLetter = letter;

    searchQuery = "";
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    const clearBtn = document.getElementById("search-clear");
    if (clearBtn) clearBtn.style.display = "none";

    hideSearchTooltip();
    renderTermsList(filterAndSearch());
    updateIndexHighlights();
}

function updateIndexHighlights() {
    document.querySelectorAll(".index-letter").forEach(el => {
        el.classList.toggle("active", el.textContent === activeIndexLetter);
    });
}

let tagDropdownOpen = false;

function buildCategoryFilters() {
    const container = document.getElementById("category-filters");
    if (!container) return;

    container.querySelectorAll(".chip:not([data-value='all'])").forEach(chip => chip.remove());
    const usedCategories = new Set(data.terms.map(term => term.category));
    const categories = TERM_CONTRACT.categories.filter(category => usedCategories.has(category));
    categories.forEach(category => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.dataset.value = category;
        chip.textContent = category.replace(/\b\w/g, letter => letter.toUpperCase());
        container.appendChild(chip);
    });
}

function buildTagDropdown() {
    const allTags = [...new Set(data.terms.flatMap(t => (t.tags || []).map(toLower)))].sort();
    const container = document.getElementById("tag-dropdown-list");
    if (!container) return;
    container.innerHTML = "";

    allTags.forEach(tag => {
        const item = document.createElement("label");
        item.className = "tag-dropdown-item";
        item.innerHTML = `<input type="checkbox" name="tag" value="${escapeHTML(tag)}"> <span>${escapeHTML(tag)}</span>`;
        const cb = item.querySelector("input");
        cb.addEventListener("change", () => {
            if (cb.checked) filterState.tags.add(tag);
            else filterState.tags.delete(tag);
            updateTagDropdownLabel();
            applyFilterAndSearch();
        });
        container.appendChild(item);
    });
}

function updateTagDropdownLabel() {
    const btn = document.getElementById("tag-dropdown-btn");
    if (!btn) return;
    const count = filterState.tags.size;
    btn.textContent = count > 0 ? `Tags (${count} selected)` : "Tags";
}

function initTagDropdown() {
    const btn = document.getElementById("tag-dropdown-btn");
    const dropdown = document.getElementById("tag-dropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", e => {
        e.stopPropagation();
        tagDropdownOpen = !tagDropdownOpen;
        dropdown.style.display = tagDropdownOpen ? "block" : "none";
        btn.setAttribute("aria-expanded", String(tagDropdownOpen));
    });

    document.addEventListener("click", e => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            tagDropdownOpen = false;
            dropdown.style.display = "none";
            btn.setAttribute("aria-expanded", "false");
        }
    });

    buildTagDropdown();
}

function initFilters() {
    document.querySelectorAll(".filter-chips[data-group]").forEach(group => {
        const groupName = group.dataset.group;
        group.querySelectorAll(".chip").forEach(chip => {
            chip.addEventListener("click", () => {
                group.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                filterState[groupName] = chip.dataset.value;
                applyFilterAndSearch();
            });
        });
    });

    document.querySelectorAll("input[name='tag-match']").forEach(radio => {
        radio.addEventListener("change", () => {
            filterState.tagMatch = radio.value;
            applyFilterAndSearch();
        });
    });

    initTagDropdown();

    const filterBtn = document.getElementById("filter-btn");
    const filtersEl = document.getElementById("filters");
    if (filterBtn && filtersEl) {
        filterBtn.addEventListener("click", () => {
            const open = filtersEl.style.display !== "none";
            filtersEl.style.display = open ? "none" : "flex";
            filterBtn.setAttribute("aria-expanded", String(!open));
        });
    }
}

function applyFilterAndSearch() {
    renderTermsList(filterAndSearch());
    updateIndexHighlights();
}

function filterAndSearch() {
    const query = toLower(searchQuery.trim());

    const filtered = data.terms.filter(term => {
        const category = toLower(term.category);
        const tags = (term.tags || []).map(toLower);

        if (filterState.category !== "all" && category !== filterState.category) return false;

        if (filterState.tags.size > 0) {
            const termTagSet = new Set(tags);
            const selected = [...filterState.tags];
            if (filterState.tagMatch === "all" && !selected.every(t => termTagSet.has(t))) return false;
            if (filterState.tagMatch === "any" && !selected.some(t => termTagSet.has(t))) return false;
            if (filterState.tagMatch === "none" && selected.some(t => termTagSet.has(t))) return false;
        }

        if (!query && activeIndexLetter !== "ALL") {
            if ((term.name || "").charAt(0).toUpperCase() !== activeIndexLetter) return false;
        }

        if (query) {
            const aliases = (term.aliases || []).map(toLower);
            return (
                toLower(term.name).includes(query) ||
                category.includes(query) ||
                aliases.some(a => a.includes(query)) ||
                tags.some(t => t.includes(query)) ||
                toLower(term.definition).includes(query)
            );
        }

        return true;
    });

    return sortTerms(filtered);
}

function parseCommaSeparatedList(value, { label, maxItems, maxItemLength, lowercase = false }) {
    const items = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
    if (items.length > maxItems) throw new Error(`${label} may contain at most ${maxItems} entries.`);
    if (items.some(item => item.length > maxItemLength)) {
        throw new Error(`Each ${label.toLowerCase()} entry must be ${maxItemLength} characters or fewer.`);
    }

    const seen = new Set();
    return items.reduce((result, item) => {
        const normalized = lowercase ? item.toLowerCase() : item;
        const key = normalized.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(normalized);
        }
        return result;
    }, []);
}

function buildSubmissionCopy(row) {
    return [
        "MCSR Glossary term submission",
        "",
        `Name: ${row.name}`,
        `Category: ${row.category}`,
        `Aliases: ${row.aliases.join(", ") || "None"}`,
        `Tags: ${row.tags.join(", ") || "None"}`,
        "",
        "Definition:",
        row.definition
    ].join("\n");
}

function formatServiceFailure(error, action) {
    if ([400, 409, 422].includes(error?.status)) return `${action} was rejected by the server.`;
    if ([401, 403].includes(error?.status)) return `${action} is not enabled for public access.`;
    return `${action} is temporarily unavailable.`;
}

let cachedBrowserID = "";

function createBrowserID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getBrowserID() {
    if (cachedBrowserID) return cachedBrowserID;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let storedID = "";
    try { storedID = localStorage.getItem("mcsr_browser_id") || ""; } catch { /* Storage is optional. */ }
    cachedBrowserID = uuidPattern.test(storedID) ? storedID : createBrowserID();
    try { localStorage.setItem("mcsr_browser_id", cachedBrowserID); } catch { /* Use the in-memory ID. */ }
    return cachedBrowserID;
}

async function submitTerm(formData) {
    let row;
    try {
        row = {
            name: String(formData.name || "").trim(),
            category: String(formData.category || "").trim(),
            aliases: parseCommaSeparatedList(formData.aliases, {
                label: "Aliases",
                maxItems: TERM_CONTRACT.limits.aliasesMax,
                maxItemLength: TERM_CONTRACT.limits.aliasMax
            }),
            tags: parseCommaSeparatedList(formData.tags, {
                label: "Tags",
                maxItems: TERM_CONTRACT.limits.tagsMax,
                maxItemLength: TERM_CONTRACT.limits.tagMax,
                lowercase: true
            }),
            definition: String(formData.definition || "").trim(),
            website: String(formData.website || "").trim()
        };
    } catch (error) {
        return { ok: false, sent: false, reason: error.message };
    }

    if (row.website) return { ok: false, sent: false, reason: "Submission was rejected." };
    if (row.name.length < TERM_CONTRACT.limits.nameMin || row.name.length > TERM_CONTRACT.limits.nameMax) {
        return { ok: false, sent: false, reason: `Term name must be between ${TERM_CONTRACT.limits.nameMin} and ${TERM_CONTRACT.limits.nameMax} characters.` };
    }
    if (!TERM_CONTRACT.categories.includes(row.category)) return { ok: false, sent: false, reason: "Choose a supported category." };
    if (row.definition.length < TERM_CONTRACT.limits.definitionMin || row.definition.length > TERM_CONTRACT.limits.definitionMax) {
        return { ok: false, sent: false, reason: `Definition must be between ${TERM_CONTRACT.limits.definitionMin} and ${TERM_CONTRACT.limits.definitionMax} characters.` };
    }

    if (sb.enabled) {
        try {
            const result = await sb.rpc("submit_glossary_term", {
                p_browser_id: getBrowserID(),
                p_name: row.name,
                p_category: row.category,
                p_aliases: row.aliases,
                p_tags: row.tags,
                p_definition: row.definition,
                p_website: row.website
            });
            const response = Array.isArray(result) ? result[0] : result;
            if (!response?.submission_id || response.submission_status !== "pending") {
                throw new Error("Unexpected submission response.");
            }
            return { ok: true, sent: true, submissionID: response.submission_id };
        } catch (error) {
            const copied = await copyText(buildSubmissionCopy(row));
            return { ok: copied, sent: false, reason: formatServiceFailure(error, "Online submission") };
        }
    }

    const copied = await copyText(buildSubmissionCopy(row));
    return { ok: copied, sent: false, reason: sb.configurationError || "Online submission is not configured." };
}

let votesCache = readStoredJSON("mcsr_vote_totals", {});
if (!votesCache || typeof votesCache !== "object" || Array.isArray(votesCache)) votesCache = {};
const storedVoteStates = readStoredJSON("mcsr_vote_states", {});
const voteStates = storedVoteStates && typeof storedVoteStates === "object" && !Array.isArray(storedVoteStates)
    ? storedVoteStates
    : {};
let voteServiceAvailable = false;
let voteServiceMessage = sb.configurationError || "Voting is not configured.";

async function loadVotes() {
    if (!sb.enabled) return false;

    try {
        const rows = await sb.rpc("get_glossary_vote_state", {
            p_browser_id: getBrowserID()
        });
        if (!Array.isArray(rows)) throw new Error("Unexpected vote response.");
        votesCache = {};
        rows.forEach(row => {
            votesCache[row.term_id] = {
                up: Number(row.upvotes) || 0,
                down: Number(row.downvotes) || 0
            };
            voteStates[row.term_id] = normalizeVoteValue(row.current_vote);
        });
        writeStoredJSON("mcsr_vote_totals", votesCache);
        writeStoredJSON("mcsr_vote_states", voteStates);
        voteServiceAvailable = true;
        voteServiceMessage = "";
        return true;
    } catch (error) {
        voteServiceAvailable = false;
        voteServiceMessage = formatServiceFailure(error, "Voting");
        return false;
    }
}

function rememberVote(termId, vote) {
    const normalized = normalizeVoteValue(vote);
    if (normalized) voteStates[termId] = normalized;
    else delete voteStates[termId];
    writeStoredJSON("mcsr_vote_states", voteStates);
}

async function setVote(termId, vote) {
    const normalizedVote = normalizeVoteValue(vote);
    if (normalizedVote !== Number(vote)) return { ok: false, reason: "Invalid vote value." };
    if (!sb.enabled || !voteServiceAvailable) return { ok: false, reason: voteServiceMessage || "Voting is temporarily unavailable." };

    try {
        const result = await sb.rpc("set_glossary_vote", {
            p_term_id: termId,
            p_browser_id: getBrowserID(),
            p_vote: normalizedVote
        });
        const response = Array.isArray(result) ? result[0] : result;
        if (!response || typeof response.changed !== "boolean") throw new Error("Unexpected vote response.");

        const upvotes = Number(response.upvotes) || 0;
        const downvotes = Number(response.downvotes) || 0;
        const currentVote = normalizeVoteValue(response.current_vote);
        votesCache[termId] = { up: upvotes, down: downvotes };
        writeStoredJSON("mcsr_vote_totals", votesCache);
        rememberVote(termId, currentVote);
        return { ok: true, changed: response.changed, currentVote, upvotes, downvotes };
    } catch (error) {
        if (!error.status || error.status >= 500) {
            voteServiceAvailable = false;
            voteServiceMessage = formatServiceFailure(error, "Voting");
        }
        return { ok: false, reason: formatServiceFailure(error, "Vote") };
    }
}

function getVotes(termId) {
    const votes = votesCache[termId] || {};
    return { up: Number(votes.up) || 0, down: Number(votes.down) || 0 };
}

function getVoteState(termId) {
    return normalizeVoteValue(voteStates[termId]);
}

// top N terms by upvotes
function getFeaturedTerms(n = 5) {
    return [...data.terms]
        .filter(t => {
            const v = getVotes(t.id);
            return v.up > 0;
        })
        .sort((a, b) => {
            const va = getVotes(a.id);
            const vb = getVotes(b.id);
            return (vb.up - vb.down) - (va.up - va.down);
        })
        .slice(0, n);
}

function renderStats() {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const cards = [
        { label: "Total Terms", value: data.terms.length },
        { label: "Needs Updating", value: data.terms.filter(t => t.needsUpdating).length }
    ];

    cards.forEach(({ label, value }) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.innerHTML = `<span class="stat-number">${value}</span><span class="stat-label">${escapeHTML(label)}</span>`;
        grid.appendChild(card);
    });
}

async function renderChangelog() {
    const content = document.getElementById("changelog-content");
    if (!content) return;

    if (!GITHUB_REPO?.includes("/")) {
        content.innerHTML = `<p class="changelog-error">Release notes are not available yet.</p>`;
        return;
    }

    content.innerHTML = `<p class="changelog-error">Loading commits…</p>`;

    try {
        const resp = await fetchWithTimeout(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=30`);
        if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);

        const commits = await resp.json();
        if (!Array.isArray(commits) || !commits.length) {
            content.innerHTML = `<p class="changelog-error">No release notes are available yet.</p>`;
            return;
        }

        content.innerHTML = "";
        commits.forEach(commit => {
            if (!commit?.commit?.message || !commit?.sha) return;
            const author = commit.commit.author || {};
            const date = author.date ? new Date(author.date) : null;
            const dateLabel = date && !Number.isNaN(date.getTime())
                ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : "Date unavailable";
            const entry = document.createElement("div");
            entry.className = "changelog-entry";
            entry.innerHTML = `
                <a class="changelog-sha" href="${escapeHTML(commit.html_url || `https://github.com/${GITHUB_REPO}/commit/${commit.sha}`)}" target="_blank" rel="noopener noreferrer">${escapeHTML(commit.sha.slice(0, 7))}</a>
                <div class="changelog-message">${escapeHTML(commit.commit.message.split("\n")[0])}</div>
                <div class="changelog-meta">${escapeHTML(author.name || "Unknown author")} · ${dateLabel}</div>
            `;
            content.appendChild(entry);
        });
    } catch {
        content.innerHTML = `<p class="changelog-error" role="status">The changelog is temporarily unavailable. Please try again later.</p>`;
    }
}

function renderFeatured() {
    const section = document.getElementById("featured-section");
    if (!section) return;

    const featured = getFeaturedTerms(5);

    if (!featured.length) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    const list = document.getElementById("featured-list");
    list.innerHTML = "";

    featured.forEach(term => {
        const v = getVotes(term.id);
        const card = document.createElement("button");
        card.type = "button";
        card.className = "featured-card";
        card.innerHTML = `
            <div class="featured-card-name">${escapeHTML(term.name)}</div>
            <div class="featured-card-category">${escapeHTML(term.category)}</div>
            <div class="featured-card-votes">▲ ${v.up}</div>
        `;
        card.addEventListener("click", () => navigateToTerm(term));
        list.appendChild(card);
    });
}

function initBTT() {
    const btn = document.getElementById("btt-btn");
    if (!btn) return;
    window.addEventListener("scroll", () => {
        btn.classList.toggle("visible", window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function normalizeTermData(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.terms)) {
        throw new Error("Invalid glossary data: terms must be an array.");
    }

    const categories = new Set(TERM_CONTRACT.categories);
    payload.terms.forEach((term, index) => {
        const label = typeof term?.name === "string" && term.name.trim() ? term.name : `entry ${index + 1}`;
        if (!term || typeof term !== "object" || Array.isArray(term)) {
            throw new Error(`Invalid glossary data: ${label} must be an object.`);
        }
        const missing = TERM_CONTRACT.requiredFields.filter(field => !Object.hasOwn(term, field));
        if (missing.length) throw new Error(`Invalid glossary data: ${label} is missing ${missing.join(", ")}.`);

        for (const field of ["id", "name", "category", "definition", ...TERM_CONTRACT.dateFields]) {
            if (typeof term[field] !== "string") throw new Error(`Invalid glossary data: ${label}.${field} must be a string.`);
        }
        for (const field of TERM_CONTRACT.arrayFields) {
            if (!Array.isArray(term[field])) throw new Error(`Invalid glossary data: ${label}.${field} must be an array.`);
        }
        if (!categories.has(term.category)) throw new Error(`Invalid glossary data: ${label} has an unsupported category.`);
        if (typeof term.needsUpdating !== "boolean") throw new Error(`Invalid glossary data: ${label}.needsUpdating must be boolean.`);
        for (const field of TERM_CONTRACT.dateFields) {
            if (!isValidEditorialDate(term[field])) throw new Error(`Invalid glossary data: ${label}.${field} is not YYYY-MM-DD.`);
        }
    });

    return { ...data, ...payload, terms: sortTerms(payload.terms) };
}

function populateSubmissionCategories() {
    const select = document.getElementById("sub-category");
    if (!select) return;
    select.replaceChildren(new Option("Choose a category", ""));
    for (const category of TERM_CONTRACT.categories) {
        select.appendChild(new Option(category.replace(/\b\w/g, letter => letter.toUpperCase()), category));
    }
}

async function init() {
    let storedTheme = "dark";
    try { storedTheme = localStorage.getItem("theme") || "dark"; } catch { /* Use the default. */ }
    applyTheme(storedTheme === "light" ? "light" : "dark");

    if (!history.state?.mcsr) history.replaceState({ mcsr: true, from: null }, "", window.location.href);

    initBTT();
    populateSubmissionCategories();

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = btn.dataset.page;
            hideSearchTooltip();
            setURLParams({ page: page === "home" ? null : page, t: null });
            showPage(page);
        });
    });

    document.getElementById("theme-toggle")?.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        applyTheme(current === "dark" ? "light" : "dark");
    });
    document.getElementById("random-btn")?.addEventListener("click", goToRandomTerm);
    window.addEventListener("popstate", handleURLRouting);

    const searchInput = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear");
    if (searchInput && clearBtn) {
        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value;
            clearBtn.style.display = searchQuery ? "block" : "none";
            if (searchQuery) activeIndexLetter = "ALL";
            applyFilterAndSearch();
            showSearchTooltip(searchQuery.trim().toLowerCase());
        });

        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchQuery = "";
            clearBtn.style.display = "none";
            hideSearchTooltip();
            applyFilterAndSearch();
            searchInput.focus();
        });

        searchInput.addEventListener("keydown", event => {
            const tooltipOpen = document.getElementById("search-tooltip")?.style.display !== "none";
            if (event.key === "ArrowDown" && tooltipOpen) { event.preventDefault(); moveFocus(1); }
            else if (event.key === "ArrowUp" && tooltipOpen) { event.preventDefault(); moveFocus(-1); }
            else if (event.key === "Enter" && tooltipItems[tooltipFocusIdx]) { event.preventDefault(); selectTooltipItem(tooltipItems[tooltipFocusIdx]); }
            else if (event.key === "Escape") hideSearchTooltip();
        });

        searchInput.addEventListener("focus", () => {
            if (searchQuery.trim()) showSearchTooltip(searchQuery.trim().toLowerCase());
        });
        searchInput.addEventListener("blur", () => setTimeout(hideSearchTooltip, 180));
    }

    window.addEventListener("resize", () => {
        const tooltip = document.getElementById("search-tooltip");
        if (tooltip?.style.display !== "none") positionTooltip();
    });

    const submitTrigger = document.getElementById("submit-trigger");
    const submitModal = document.getElementById("submit-modal");
    const submitModalClose = document.getElementById("submit-modal-close");
    const submitBackdrop = document.getElementById("submit-modal-backdrop");
    const submitForm = document.getElementById("submit-form");
    const submitButton = document.getElementById("sub-submit");
    const submitStatus = document.getElementById("sub-status");
    let returnFocus = null;

    if (!sb.enabled) {
        document.getElementById("submit-modal-description").textContent = "Online review is temporarily unavailable. Complete the form to copy a formatted submission you can share with the project maintainer.";
        submitButton.textContent = "Copy Submission";
    }

    function openSubmitModal() {
        if (!submitModal) return;
        returnFocus = document.activeElement;
        submitModal.hidden = false;
        document.body.style.overflow = "hidden";
        submitStatus.hidden = true;
        document.getElementById("sub-name")?.focus();
    }

    function closeSubmitModal() {
        if (!submitModal) return;
        submitModal.hidden = true;
        document.body.style.overflow = "";
        submitStatus.hidden = true;
        returnFocus?.focus?.();
    }

    submitTrigger?.addEventListener("click", openSubmitModal);
    submitModalClose?.addEventListener("click", closeSubmitModal);
    submitBackdrop?.addEventListener("click", closeSubmitModal);

    document.addEventListener("keydown", event => {
        if (!submitModal || submitModal.hidden) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeSubmitModal();
            return;
        }
        if (event.key !== "Tab") return;

        const focusable = [...submitModal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    submitForm?.addEventListener("submit", async event => {
        event.preventDefault();
        if (!submitForm.reportValidity()) return;

        submitButton.disabled = true;
        submitButton.textContent = sb.enabled ? "Submitting…" : "Copying…";
        const result = await submitTerm({
            name: document.getElementById("sub-name").value,
            category: document.getElementById("sub-category").value,
            aliases: document.getElementById("sub-aliases").value,
            tags: document.getElementById("sub-tags").value,
            definition: document.getElementById("sub-definition").value,
            website: document.getElementById("sub-website").value
        });

        submitStatus.hidden = false;
        if (result.ok && result.sent) {
            submitStatus.textContent = "Submitted successfully. Your term will appear after review.";
            submitStatus.style.color = "var(--accent)";
            submitForm.reset();
            setTimeout(closeSubmitModal, 1800);
        } else if (result.ok) {
            submitStatus.textContent = `${result.reason} A copy was placed on your clipboard; it has not been sent.`;
            submitStatus.style.color = "var(--accent)";
        } else {
            submitStatus.textContent = `${result.reason || "Submission could not be processed."} Your form has been kept so you can try again.`;
            submitStatus.style.color = "var(--update-tag-text)";
        }

        submitButton.disabled = false;
        submitButton.textContent = sb.enabled ? "Submit for Review" : "Copy Submission";
    });

    try {
        const response = await fetchWithTimeout("data/terms.json");
        if (!response.ok) throw new Error(`Glossary data request failed: ${response.status}`);
        data = normalizeTermData(await response.json());
    } catch {
        dataLoadFailed = true;
        data = { ...data, terms: [] };
    }

    buildCategoryFilters();
    buildIndex();
    initFilters();

    if (dataLoadFailed || !data.terms.length) {
        const terms = document.getElementById("terms");
        if (terms) terms.innerHTML = `<p class="data-error" role="alert">The glossary could not be loaded. Please refresh the page and try again.</p>`;
        [searchInput, document.getElementById("random-btn"), document.getElementById("filter-btn")]
            .filter(Boolean)
            .forEach(control => { control.disabled = true; });
    } else {
        renderTermsList(data.terms);
    }

    await loadVotes();
    renderFeatured();
    handleURLRouting();
}

document.addEventListener("DOMContentLoaded", init);
