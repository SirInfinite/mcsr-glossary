import { TERM_CONTRACT, isValidEditorialDate, slugifyTermName as slugify } from "./content-contract.js";
import {
    classifyMediaItem,
    getMediaSlotMarker,
    getVoteTarget,
    markMediaSlots,
    normalizeVoteValue,
    projectVoteTotals,
    resolveRelatedTerms,
    resolveTermRoute,
    searchTerms,
    stripMediaSlots,
    validateTermReportInput
} from "./glossary-core.js";

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
        frame.loading = "lazy";
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
        frame.loading = "lazy";
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

function renderDefinitionWithMedia(term, container) {
    if (!container) return 0;
    container.innerHTML = parseDefinition(markMediaSlots(term.definition));
    let renderedCount = 0;
    (term.media || []).forEach((item, index) => {
        const marker = getMediaSlotMarker(index);
        const markerElement = [...container.querySelectorAll("p")]
            .find(element => element.textContent.trim() === marker && !element.children.length);
        if (!markerElement) return;
        const presentation = classifyMediaItem(item);
        const figure = createMediaFigure(item, index, presentation);
        if (!figure) {
            markerElement.remove();
            return;
        }
        markerElement.replaceWith(figure);
        renderedCount += 1;
    });

    container.querySelectorAll("p").forEach(element => {
        if (/^MCSRINLINEMEDIA\d+MARKER$/.test(element.textContent.trim())) element.remove();
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
        icon.src = isDark ? "images/dark-mode.webp" : "images/light-mode.webp";
    }

    const logo = document.getElementById("logo");
    if (logo) logo.src = isDark ? "images/logo.webp" : "images/logo-dark.webp";

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
        const term = resolveTermRoute(data.terms, t);
        if (term) { showPage("term", term.id); return; }
    }

    if (page && ["stats", "changelog", "credits", "about", "home"].includes(page)) {
        showPage(page === "credits" ? "about" : page); return;
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
        const titles = { home: "MCSR Glossary", stats: "Stats | MCSR Glossary", changelog: "Changelog | MCSR Glossary", about: "About | MCSR Glossary" };
        document.title = titles[page] || "MCSR Glossary";
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

function navigateToTerm(term) {
    if (!term) return;
    setURLParams({ t: slugify(term.name), page: null });
    showPage("term", term.id);
}

function getDefinitionPreview(term, maxLength = 220) {
    const text = plainText(parseDefinition(stripMediaSlots(term?.definition || "")))
        .replace(/\s+/g, " ")
        .trim();
    if (text.length <= maxLength) return text;
    const shortened = text.slice(0, maxLength + 1).replace(/\s+\S*$/, "").trim();
    return `${shortened || text.slice(0, maxLength).trim()}…`;
}

function buildTermCard(term, delay = 0) {
    const card = document.createElement("article");
    card.className = "term";
    card.setAttribute("id", `term-${term.id}`);
    card.style.animationDelay = `${delay}ms`;

    const cardHead = document.createElement("div");
    cardHead.className = "card-head";

    const headerLeft = document.createElement("div");
    headerLeft.className = "term-header-left";
    const heading = document.createElement("h3");
    heading.className = "term-name-heading";
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "term-name term-name-link";
    nameButton.textContent = term.name || "";
    nameButton.setAttribute("aria-label", `View ${term.name}`);
    nameButton.addEventListener("click", () => navigateToTerm(term));
    const category = document.createElement("span");
    category.className = "term-category";
    category.textContent = term.category || "";
    heading.appendChild(nameButton);
    headerLeft.append(heading, category);
    cardHead.appendChild(headerLeft);

    if (term.aliases?.length) {
        const aka = document.createElement("span");
        aka.className = "term-aka";
        aka.textContent = `(a.k.a. ${term.aliases.join(", ")})`;
        cardHead.appendChild(aka);
    }

    card.appendChild(cardHead);

    if (term.tags?.length || term.media?.length) {
        const tagsDiv = document.createElement("div");
        tagsDiv.className = "term-tags";

        (term.tags || []).slice(0, 3).forEach(tag => {
            const badge = document.createElement("span");
            badge.className = "term-tag";
            badge.textContent = tag;
            tagsDiv.appendChild(badge);
        });
        if ((term.tags || []).length > 3) {
            const more = document.createElement("span");
            more.className = "term-tag";
            more.textContent = `+${term.tags.length - 3}`;
            more.setAttribute("aria-label", `${term.tags.length - 3} more tags`);
            tagsDiv.appendChild(more);
        }

        if (term.media?.length) {
            const mediaBadge = document.createElement("span");
            mediaBadge.className = "term-tag media-tag";
            mediaBadge.textContent = `${term.media.length} ${term.media.length === 1 ? "example" : "examples"}`;
            tagsDiv.appendChild(mediaBadge);
        }

        card.appendChild(tagsDiv);
    }

    const preview = document.createElement("p");
    preview.className = "term-card-preview";
    preview.textContent = getDefinitionPreview(term);
    card.appendChild(preview);

    const footer = document.createElement("div");
    footer.className = "term-card-footer";
    const relatedCount = document.createElement("span");
    relatedCount.textContent = `${term.relatedTerms?.length || 0} related`;
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "term-open-btn";
    openButton.textContent = "Read definition →";
    openButton.addEventListener("click", () => navigateToTerm(term));
    footer.append(relatedCount, openButton);
    card.appendChild(footer);

    card.addEventListener("click", event => {
        if (event.target.closest("a, button, input, iframe, video")) return;
        navigateToTerm(term);
    });
    return card;
}

function getActiveFilterCount() {
    return (filterState.category === "all" ? 0 : 1) + filterState.tags.size;
}

function hasActiveBrowseState() {
    return Boolean(searchQuery.trim())
        || getActiveFilterCount() > 0
        || activeIndexLetter !== "ALL";
}

function updateResultsToolbar(count) {
    const resultCount = document.getElementById("result-count");
    const clearAll = document.getElementById("clear-all-filters");
    const filterCount = document.getElementById("filter-count");
    const filterButton = document.getElementById("filter-btn");
    const activeFilters = getActiveFilterCount();

    if (resultCount) {
        if (searchQuery.trim()) {
            resultCount.textContent = `${count} ${count === 1 ? "result" : "results"} for “${searchQuery.trim()}”`;
        } else if (activeFilters || activeIndexLetter !== "ALL") {
            resultCount.textContent = `Showing ${count} of ${data.terms.length} terms`;
        } else {
            resultCount.textContent = `Showing ${count} terms`;
        }
    }
    if (clearAll) clearAll.hidden = !hasActiveBrowseState();
    if (filterCount) {
        filterCount.hidden = activeFilters === 0;
        filterCount.textContent = String(activeFilters);
    }
    filterButton?.classList.toggle("has-active-filters", activeFilters > 0);
}

function clearAllBrowseState({ focusSearch = false } = {}) {
    searchQuery = "";
    activeIndexLetter = "ALL";
    filterState.category = "all";
    filterState.tags.clear();
    filterState.tagMatch = "any";

    const input = document.getElementById("search-input");
    if (input) input.value = "";
    const clearButton = document.getElementById("search-clear");
    if (clearButton) clearButton.style.display = "none";
    document.querySelectorAll("#category-filters .chip").forEach(chip => {
        const active = chip.dataset.value === "all";
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("#tag-dropdown-list input[type='checkbox']").forEach(inputElement => {
        inputElement.checked = false;
    });
    document.querySelectorAll("input[name='tag-match']").forEach(radio => {
        radio.checked = radio.value === "any";
    });
    updateTagDropdownLabel();
    updateIndexHighlights();
    hideSearchTooltip();
    renderTermsList(filterAndSearch());
    if (focusSearch) input?.focus();
}

function renderTermsList(terms) {
    const container = document.getElementById("terms");
    if (!container) return;

    container.innerHTML = "";
    updateResultsToolbar(terms.length);

    if (!terms.length) {
        const msg = document.createElement("div");
        msg.id = "no-results";
        msg.setAttribute("role", "status");
        const heading = document.createElement("h3");
        heading.textContent = "No glossary terms match yet.";
        const detail = document.createElement("p");
        detail.textContent = "Try a shorter search, remove a filter, or suggest terminology that is missing.";
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Clear search and filters";
        reset.addEventListener("click", () => clearAllBrowseState({ focusSearch: true }));
        msg.append(heading, detail, reset);
        container.appendChild(msg);
        return;
    }

    terms.forEach((term, i) => container.appendChild(buildTermCard(term, Math.min(i, 12) * 18)));
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
            ? `${voteServiceMessage} Totals may be out of date.`
            : currentVote === 1
                ? "Upvote saved. Select it again to remove it, or choose Downvote to switch."
                : currentVote === -1
                    ? "Downvote saved. Select it again to remove it, or choose Upvote to switch."
                    : "Select a reaction; select it again to remove it.";
    const updatedDate = term.updatedDate ? new Date(`${term.updatedDate}T00:00:00`) : null;
    const dateStr = updatedDate && !Number.isNaN(updatedDate.getTime())
        ? updatedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
    const relatedTerms = resolveRelatedTerms(term, data.terms, 6);

    page.innerHTML = `
        <div class="container term-detail-shell">
            <button class="back-btn" id="detail-back" type="button">← Browse glossary</button>
            <article class="term-detail-article">
                <header class="term-detail-header">
                    <div class="term-title-row">
                        <div class="term-title-copy">
                            <p class="eyebrow">${escapeHTML(term.category || "Glossary term")}</p>
                            <h1 class="term-detail-name">${escapeHTML(term.name)}</h1>
                        </div>
                        <div class="term-detail-actions" aria-label="Term actions">
                            <button class="term-utility-action copy-action" id="share-btn" type="button" aria-label="Copy link" title="Copy link">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.6 13.4a2 2 0 0 0 2.8 0l4-4a2 2 0 1 0-2.8-2.8l-1.3 1.3M13.4 10.6a2 2 0 0 0-2.8 0l-4 4a2 2 0 1 0 2.8 2.8l1.3-1.3"/></svg>
                                <span>Copy Link</span>
                            </button>
                            <button class="term-utility-action edit-action" id="suggest-edit-btn" type="button" aria-label="Suggest an edit" aria-haspopup="dialog" aria-controls="submit-modal" title="Suggest an edit">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v6M12 16.8v.1"/></svg>
                                <span>Suggest an Edit</span>
                            </button>
                            <button class="term-utility-action report-action" id="report-term-btn" type="button" aria-label="Report a term" aria-haspopup="dialog" aria-controls="report-modal" title="Report a term">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 21V4m0 1h10l-1.5 3L15 11H5"/></svg>
                                <span>Report a Term</span>
                            </button>
                        </div>
                    </div>
                    ${term.aliases?.length ? `<p class="term-aliases"><strong>Also known as:</strong> ${term.aliases.map(escapeHTML).join(", ")}</p>` : ""}
                    <div class="term-detail-meta">
                        ${dateStr ? `<span>Updated ${dateStr}</span>` : ""}
                        <span>${relatedTerms.length} related ${relatedTerms.length === 1 ? "term" : "terms"}</span>
                    </div>
                    ${term.tags?.length ? `
                    <div class="term-tags term-detail-tags">
                        ${(term.tags || []).map(t => `<span class="term-tag">${escapeHTML(t)}</span>`).join("")}
                    </div>` : ""}
                </header>
                <div class="term-reading-layout">
                    <section class="term-definition" aria-labelledby="term-definition-title">
                        <h2 class="sr-only" id="term-definition-title">Definition</h2>
                        <div class="term-detail-body term-content" id="term-definition-content"></div>
                    </section>
                    ${relatedTerms.length ? `
                    <section class="related-terms" aria-labelledby="related-terms-title">
                        <h2 id="related-terms-title">Related Terms</h2>
                        <div class="related-term-grid">
                            ${relatedTerms.map(related => `
                                <button class="related-card" type="button" data-id="${related.id}">
                                    <span class="related-card-top"><strong>${escapeHTML(related.name)}</strong><span>${escapeHTML(related.category)}</span></span>
                                    <span class="related-card-preview">${escapeHTML(getDefinitionPreview(related, 96))}</span>
                                </button>
                            `).join("")}
                        </div>
                    </section>` : ""}
                    <section class="vote-section" aria-labelledby="term-vote-title">
                        <div class="vote-heading">
                            <div>
                                <p class="section-kicker">Community rating</p>
                                <h2 id="term-vote-title">Was this useful?</h2>
                            </div>
                            <div class="vote-row" id="vote-row">
                                <button class="vote-btn upvote ${currentVote === 1 ? 'voted' : ''}" id="vote-up" type="button" title="Mark ${escapeHTML(term.name)} as helpful" aria-pressed="${currentVote === 1}" ${votingEnabled ? '' : 'disabled'}>
                                    <svg class="vote-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4 3.5 16h17L12 4Z"/></svg><span>Helpful</span><span id="vote-up-count">${votes.up}</span>
                                </button>
                                <button class="vote-btn downvote ${currentVote === -1 ? 'voted' : ''}" id="vote-down" type="button" title="Mark ${escapeHTML(term.name)} as needing work" aria-pressed="${currentVote === -1}" ${votingEnabled ? '' : 'disabled'}>
                                    <svg class="vote-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 20 8.5-12h-17L12 20Z"/></svg><span>Needs work</span><span id="vote-down-count">${votes.down}</span>
                                </button>
                            </div>
                        </div>
                        <p class="vote-note" id="vote-status" role="status" aria-live="polite">${escapeHTML(voteNote)}</p>
                    </section>
                </div>
            </article>
        </div>
    `;
    document.title = `${term.name} | MCSR Glossary`;
    renderDefinitionWithMedia(term, document.getElementById("term-definition-content"));

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

    document.getElementById("suggest-edit-btn")?.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("mcsr:open-submission", { detail: { term } }));
    });

    document.getElementById("report-term-btn")?.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("mcsr:open-report", { detail: { term } }));
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
            ? "Upvote saved. Select it again to remove it, or choose Downvote to switch."
            : result.currentVote === -1
                ? "Downvote saved. Select it again to remove it, or choose Upvote to switch."
                : "Vote removed. Choose Upvote or Downvote to vote again.";
        renderFeatured();
        showToast(result.currentVote === 0 ? "Vote removed." : result.currentVote === 1 ? "Upvote saved." : "Downvote saved.");
    }

    document.getElementById("vote-up")?.addEventListener("click", () => handleVote(1));
    document.getElementById("vote-down")?.addEventListener("click", () => handleVote(-1));

    page.querySelectorAll(".related-card[data-id]").forEach(el => {
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
        const matchingAlias = (term.aliases || []).find(alias => toLower(alias).includes(query));
        const matchingTag = (term.tags || []).find(tag => toLower(tag).includes(query));
        const matchContext = matchingAlias
            ? `Alias: ${matchingAlias}`
            : matchingTag
                ? `Tag: ${matchingTag}`
                : toLower(term.category).includes(query)
                    ? `Category: ${term.category}`
                    : getDefinitionPreview(term, 120);
        item.innerHTML = `
            <span class="tooltip-name">${highlightMatch(term.name, query)}</span>
            <span class="tooltip-category">${escapeHTML(term.category || "")}</span>
            <span class="tooltip-preview">${highlightMatch(matchContext, query)}</span>
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
    allLink.setAttribute("aria-label", "Show all terms");
    allLink.setAttribute("aria-current", "true");
    allLink.addEventListener("click", () => setIndexLetter("ALL"));
    container.appendChild(allLink);

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        const a = document.createElement("button");
        a.type = "button";
        const exists = usedLetters.has(letter);
        a.className = "index-letter" + (exists ? "" : " inactive");
        a.textContent = letter;
        a.setAttribute("aria-label", exists ? `Show terms beginning with ${letter}` : `No terms begin with ${letter}`);
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
        const active = el.textContent === activeIndexLetter;
        el.classList.toggle("active", active);
        if (active) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
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
        chip.setAttribute("aria-pressed", "false");
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

    dropdown.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        tagDropdownOpen = false;
        dropdown.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
    });

    buildTagDropdown();
}

function initFilters() {
    document.querySelectorAll(".filter-chips[data-group]").forEach(group => {
        const groupName = group.dataset.group;
        group.querySelectorAll(".chip").forEach(chip => {
            chip.addEventListener("click", () => {
                group.querySelectorAll(".chip").forEach(c => {
                    c.classList.remove("active");
                    c.setAttribute("aria-pressed", "false");
                });
                chip.classList.add("active");
                chip.setAttribute("aria-pressed", "true");
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

        return true;
    });

    return query ? searchTerms(filtered, query) : sortTerms(filtered);
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

function buildReportCopy(row) {
    return [
        "MCSR Glossary term report",
        "",
        `Term: ${row.termName} (${row.termId})`,
        `Reason: ${row.reason}`,
        "",
        row.details || "No additional details provided."
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

async function submitTermReport(formData) {
    const { value: row, errors } = validateTermReportInput(formData, data.terms);
    if (errors.length) return { ok: false, sent: false, reason: errors[0] };

    if (sb.enabled) {
        try {
            const result = await sb.rpc("submit_glossary_term_report", {
                p_browser_id: getBrowserID(),
                p_term_id: row.termId,
                p_term_name: row.termName,
                p_reason: row.reason,
                p_details: row.details,
                p_website: row.website
            });
            const response = Array.isArray(result) ? result[0] : result;
            if (!response?.report_id || response.report_status !== "pending") {
                throw new Error("Unexpected report response.");
            }
            return { ok: true, sent: true, reportID: response.report_id, created: response.created !== false };
        } catch (error) {
            const copied = await copyText(buildReportCopy(row));
            return { ok: copied, sent: false, reason: formatServiceFailure(error, "Online report") };
        }
    }

    const copied = await copyText(buildReportCopy(row));
    return { ok: copied, sent: false, reason: sb.configurationError || "Online reporting is not configured." };
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

    const allTags = new Set(data.terms.flatMap(term => term.tags || []));
    const categories = TERM_CONTRACT.categories
        .map(category => ({ category, count: data.terms.filter(term => term.category === category).length }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
    const recentTerms = [...data.terms]
        .sort((a, b) => (b.updatedDate || b.creationDate || "").localeCompare(a.updatedDate || a.creationDate || "") || a.name.localeCompare(b.name))
        .slice(0, 8);
    const cards = [
        { label: "Published terms", value: data.terms.length },
        { label: "Categories", value: categories.length },
        { label: "Topic tags", value: allTags.size },
        { label: "Media-backed", value: data.terms.filter(term => term.media?.length).length }
    ];

    cards.forEach(({ label, value }) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.innerHTML = `<span class="stat-number">${value}</span><span class="stat-label">${escapeHTML(label)}</span>`;
        grid.appendChild(card);
    });

    const categoryStats = document.getElementById("category-stats");
    if (categoryStats) {
        categoryStats.innerHTML = categories.map(({ category, count }) => {
            const percent = data.terms.length ? Math.round((count / data.terms.length) * 100) : 0;
            return `
                <div class="category-stat-row">
                    <div class="category-stat-label"><span>${escapeHTML(category.replace(/\b\w/g, letter => letter.toUpperCase()))}</span><strong>${count}</strong></div>
                    <div class="category-stat-track" role="img" aria-label="${count} ${escapeHTML(category)} terms, ${percent} percent of the glossary">
                        <span style="width:${percent}%"></span>
                    </div>
                </div>`;
        }).join("");
    }

    const recent = document.getElementById("recent-terms");
    if (recent) {
        recent.replaceChildren();
        recentTerms.forEach(term => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "mini-term-card";
            button.innerHTML = `<strong>${escapeHTML(term.name)}</strong><span>${escapeHTML(term.category)} · ${escapeHTML(term.updatedDate || term.creationDate || "Date not recorded")}</span>`;
            button.addEventListener("click", () => navigateToTerm(term));
            recent.appendChild(button);
        });
    }

    const community = document.getElementById("community-stats");
    if (community) {
        const rated = getFeaturedTerms(5);
        if (!rated.length) {
            community.innerHTML = `<div class="stats-empty"><strong>Ratings are just getting started.</strong><p>Open a definition and mark whether it was useful. Only aggregate totals appear here; browser voter IDs remain private.</p></div>`;
        } else {
            community.replaceChildren();
            const intro = document.createElement("p");
            intro.className = "stats-note";
            intro.textContent = "Highest net-rated definitions from the public aggregate totals.";
            const list = document.createElement("div");
            list.className = "community-rating-list";
            rated.forEach(term => {
                const totals = getVotes(term.id);
                const button = document.createElement("button");
                button.type = "button";
                button.className = "community-rating-row";
                button.innerHTML = `<span><strong>${escapeHTML(term.name)}</strong><small>${escapeHTML(term.category)}</small></span><span class="rating-totals"><span><span class="vote-mark-up" aria-hidden="true">▲</span> ${totals.up}</span><span><span class="vote-mark-down" aria-hidden="true">▼</span> ${totals.down}</span></span>`;
                button.addEventListener("click", () => navigateToTerm(term));
                list.appendChild(button);
            });
            community.append(intro, list);
        }
    }
}

async function renderChangelog() {
    const content = document.getElementById("changelog-content");
    if (!content) return;

    content.innerHTML = `<p class="changelog-error" role="status">Loading project release notes…</p>`;

    try {
        const response = await fetchWithTimeout("CHANGELOG.md");
        if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`);
        const markdown = (await response.text()).replace(/^#\s+changelog\s*$/im, "").trim();
        content.className = "term-content changelog-markdown";
        content.innerHTML = parseDefinition(markdown);
    } catch {
        content.className = "";
        content.innerHTML = `<div class="changelog-error" role="status"><p>The local release notes could not be loaded.</p><a href="https://github.com/SirInfinite/mcsr-glossary/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Read the changelog on GitHub ↗</a></div>`;
    }
}

function renderFeatured() {
    const section = document.getElementById("featured-section");
    if (!section) return;

    const rated = getFeaturedTerms(5);
    const curatedNames = ["Mapless", "Nether Travel", "One Cycle", "Triangulation", "Zero Cycle"];
    const curated = curatedNames.map(name => data.terms.find(term => term.name === name)).filter(Boolean);
    const useRatings = rated.length >= 3;
    const featured = (useRatings ? rated : curated).slice(0, 5);
    if (!featured.length) return;

    document.getElementById("featured-title").textContent = useRatings ? "Community-rated definitions" : "Explore visual techniques";
    document.getElementById("featured-note").textContent = useRatings
        ? "Definitions with the strongest current aggregate feedback."
        : "A curated starting point while community ratings grow.";
    const list = document.getElementById("featured-list");
    list.innerHTML = "";

    featured.forEach(term => {
        const v = getVotes(term.id);
        const card = document.createElement("button");
        card.type = "button";
        card.className = "featured-card";
        card.innerHTML = `
            <span class="featured-card-copy"><strong class="featured-card-name">${escapeHTML(term.name)}</strong><span class="featured-card-category">${escapeHTML(term.category)}</span></span>
            <span class="featured-card-votes">${useRatings ? `<span><span class="vote-mark-up" aria-hidden="true">▲</span> ${v.up}</span> · <span><span class="vote-mark-down" aria-hidden="true">▼</span> ${v.down}</span>` : term.media?.length ? `${term.media.length} visual ${term.media.length === 1 ? "example" : "examples"}` : "Read definition"}</span>
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

    document.querySelector(".skip-link")?.addEventListener("click", () => {
        requestAnimationFrame(() => document.getElementById("main-content")?.focus());
    });

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
    document.getElementById("clear-all-filters")?.addEventListener("click", () => clearAllBrowseState({ focusSearch: true }));
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
            else if (event.key === "Escape") {
                event.preventDefault();
                if (tooltipOpen) hideSearchTooltip();
                else if (searchQuery) {
                    searchInput.value = "";
                    searchQuery = "";
                    clearBtn.style.display = "none";
                    applyFilterAndSearch();
                }
            }
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

    document.addEventListener("keydown", event => {
        if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
        if (!document.getElementById("submit-modal")?.hidden || !document.getElementById("report-modal")?.hidden) return;
        event.preventDefault();
        if (currentPage !== "home") {
            setURLParams({ page: null, t: null });
            showPage("home");
        }
        searchInput?.focus();
    });

    const submitTrigger = document.getElementById("submit-trigger");
    const submitModal = document.getElementById("submit-modal");
    const submitModalClose = document.getElementById("submit-modal-close");
    const submitBackdrop = document.getElementById("submit-modal-backdrop");
    const submitForm = document.getElementById("submit-form");
    const submitButton = document.getElementById("sub-submit");
    const submitStatus = document.getElementById("sub-status");
    const submitTitle = document.getElementById("submit-modal-title");
    const submitDescription = document.getElementById("submit-modal-description");
    const submitTermContext = document.getElementById("submit-term-context");
    const submitTermName = document.getElementById("submit-term-name");
    const definitionInput = document.getElementById("sub-definition");
    const definitionLabel = document.getElementById("sub-definition-label");
    const definitionHint = document.getElementById("sub-definition-hint");
    const definitionCount = document.getElementById("sub-definition-count");
    let returnFocus = null;
    let submissionMode = "new";

    if (!sb.enabled) {
        submitDescription.textContent = "Online review is temporarily unavailable. Complete the form to copy a formatted submission you can share with the project maintainer.";
        submitButton.textContent = "Copy Submission";
    }

    function updateDefinitionCount() {
        if (definitionCount && definitionInput) definitionCount.textContent = `${definitionInput.value.length} / ${TERM_CONTRACT.limits.definitionMax}`;
    }

    function openSubmitModal(term = null) {
        if (!submitModal) return;
        returnFocus = document.activeElement;
        submitForm?.reset();
        submissionMode = term ? "correction" : "new";
        submitModal.classList.toggle("is-correction", Boolean(term));
        submitForm?.querySelectorAll("[data-new-submission-field]").forEach(element => {
            element.hidden = Boolean(term);
        });
        if (submitTermContext) submitTermContext.hidden = !term;
        if (submitTermName) submitTermName.textContent = term?.name || "";
        if (term) {
            submitTitle.textContent = "Suggest an Edit";
            submitDescription.textContent = "Describe what should change or provide clearer wording. Suggestions never alter a published term automatically.";
            definitionLabel.innerHTML = 'Suggested change <span aria-hidden="true">*</span>';
            definitionHint.textContent = "Point to the issue and suggest replacement wording when possible.";
            document.getElementById("sub-name").value = term.name;
            document.getElementById("sub-category").value = term.category;
            document.getElementById("sub-aliases").value = (term.aliases || []).join(", ");
            document.getElementById("sub-tags").value = [...new Set([...(term.tags || []), "correction"])].join(", ");
            definitionInput.value = `Correction for the published term “${term.name}”:\n\nWhat should change and why:\n`;
        } else {
            submitTitle.textContent = "Submit a Term";
            submitDescription.textContent = sb.enabled
                ? "Submissions are reviewed before publication. They never change the published glossary automatically."
                : "Online review is temporarily unavailable. Complete the form to copy a formatted submission you can share with the project maintainer.";
            definitionLabel.innerHTML = 'Definition <span aria-hidden="true">*</span>';
            definitionHint.textContent = "Start with a plain-language meaning, then explain why it matters. Markdown is supported.";
        }
        submitButton.textContent = sb.enabled ? (term ? "Send Suggestion" : "Submit for Review") : (term ? "Copy Suggestion" : "Copy Submission");
        updateDefinitionCount();
        submitModal.hidden = false;
        document.body.style.overflow = "hidden";
        submitStatus.hidden = true;
        (term ? definitionInput : document.getElementById("sub-name"))?.focus();
    }

    function closeSubmitModal() {
        if (!submitModal) return;
        submitModal.hidden = true;
        document.body.style.overflow = "";
        submitStatus.hidden = true;
        returnFocus?.focus?.();
    }

    submitTrigger?.addEventListener("click", () => openSubmitModal());
    document.addEventListener("mcsr:open-submission", event => openSubmitModal(event.detail?.term || null));
    submitModalClose?.addEventListener("click", closeSubmitModal);
    submitBackdrop?.addEventListener("click", closeSubmitModal);
    definitionInput?.addEventListener("input", updateDefinitionCount);

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
            submitStatus.textContent = submissionMode === "correction"
                ? "Edit suggestion submitted. It will be reviewed before any published definition changes."
                : "Submitted successfully. Your term will appear only after review.";
            submitStatus.style.color = "var(--accent)";
            submitForm.reset();
            updateDefinitionCount();
            setTimeout(closeSubmitModal, 1800);
        } else if (result.ok) {
            submitStatus.textContent = `${result.reason} A copy was placed on your clipboard; it has not been sent.`;
            submitStatus.style.color = "var(--accent)";
        } else {
            submitStatus.textContent = `${result.reason || "Submission could not be processed."} Your form has been kept so you can try again.`;
            submitStatus.style.color = "var(--update-tag-text)";
        }

        submitButton.disabled = false;
        submitButton.textContent = sb.enabled
            ? (submissionMode === "correction" ? "Send Suggestion" : "Submit for Review")
            : (submissionMode === "correction" ? "Copy Suggestion" : "Copy Submission");
    });

    const reportModal = document.getElementById("report-modal");
    const reportModalClose = document.getElementById("report-modal-close");
    const reportBackdrop = document.getElementById("report-modal-backdrop");
    const reportForm = document.getElementById("report-form");
    const reportButton = document.getElementById("report-submit");
    const reportStatus = document.getElementById("report-status");
    const reportReason = document.getElementById("report-reason");
    const reportDetails = document.getElementById("report-details");
    const reportDetailsCount = document.getElementById("report-details-count");
    const reportTermName = document.getElementById("report-term-name");
    let reportReturnFocus = null;
    let reportedTerm = null;

    if (!sb.enabled && reportButton) reportButton.textContent = "Copy Report";

    function updateReportDetails() {
        if (reportDetailsCount && reportDetails) reportDetailsCount.textContent = `${reportDetails.value.length} / 2000`;
        if (reportDetails && reportReason) reportDetails.required = reportReason.value === "other";
    }

    function openReportModal(term) {
        if (!reportModal || !term) return;
        reportReturnFocus = document.activeElement;
        reportedTerm = term;
        reportForm?.reset();
        reportTermName.textContent = term.name;
        reportStatus.hidden = true;
        reportButton.textContent = sb.enabled ? "Send Report" : "Copy Report";
        updateReportDetails();
        reportModal.hidden = false;
        document.body.style.overflow = "hidden";
        reportReason?.focus();
    }

    function closeReportModal() {
        if (!reportModal) return;
        reportModal.hidden = true;
        document.body.style.overflow = "";
        reportStatus.hidden = true;
        reportedTerm = null;
        reportReturnFocus?.focus?.();
    }

    document.addEventListener("mcsr:open-report", event => openReportModal(event.detail?.term || null));
    reportModalClose?.addEventListener("click", closeReportModal);
    reportBackdrop?.addEventListener("click", closeReportModal);
    reportReason?.addEventListener("change", updateReportDetails);
    reportDetails?.addEventListener("input", updateReportDetails);

    document.addEventListener("keydown", event => {
        if (!reportModal || reportModal.hidden) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeReportModal();
            return;
        }
        if (event.key !== "Tab") return;

        const focusable = [...reportModal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    reportForm?.addEventListener("submit", async event => {
        event.preventDefault();
        updateReportDetails();
        if (!reportForm.reportValidity() || !reportedTerm) return;

        reportButton.disabled = true;
        reportButton.textContent = sb.enabled ? "Sending…" : "Copying…";
        const result = await submitTermReport({
            termId: reportedTerm.id,
            termName: reportedTerm.name,
            reason: reportReason.value,
            details: reportDetails.value,
            website: document.getElementById("report-website").value
        });

        reportStatus.hidden = false;
        if (result.ok && result.sent) {
            reportStatus.textContent = result.created
                ? "Report sent. A maintainer will review it privately."
                : "This report is already in the review queue.";
            reportStatus.style.color = "var(--accent)";
            reportForm.reset();
            updateReportDetails();
            setTimeout(closeReportModal, 1800);
        } else if (result.ok) {
            reportStatus.textContent = `${result.reason} A copy was placed on your clipboard; it has not been sent.`;
            reportStatus.style.color = "var(--accent)";
        } else {
            reportStatus.textContent = `${result.reason || "Report could not be processed."} Your form has been kept so you can try again.`;
            reportStatus.style.color = "var(--update-tag-text)";
        }

        reportButton.disabled = false;
        reportButton.textContent = sb.enabled ? "Send Report" : "Copy Report";
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

    document.getElementById("hero-term-count").textContent = String(data.terms.length);
    document.getElementById("hero-media-count").textContent = String(data.terms.filter(term => term.media?.length).length);
    document.getElementById("footer-term-count").textContent = String(data.terms.length);
    renderFeatured();
    await loadVotes();
    renderFeatured();
    handleURLRouting();
}

document.addEventListener("DOMContentLoaded", init);
