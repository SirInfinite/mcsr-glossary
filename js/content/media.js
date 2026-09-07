import { validateMediaItem } from "../content-contract.js";

const MEDIA_SLOT_EXACT_PATTERN = /^\{\{media:(0|[1-9]\d*)\}\}$/;
const MEDIA_SLOT_LINE_PATTERN = /^\{\{media:(0|[1-9]\d*)\}\}$/gm;

// Media tokens delimit Markdown blocks before parsing. Text never becomes a
// placeholder, and Markdown/HTML cannot consume a validated media placement.
export function splitDefinitionBlocks(value) {
    const source = String(value || "");
    const blocks = [];
    let offset = 0;
    for (const match of source.matchAll(MEDIA_SLOT_LINE_PATTERN)) {
        if (match.index > offset) blocks.push({ type: "text", value: source.slice(offset, match.index) });
        blocks.push({ type: "media", index: Number(match[1]) });
        offset = match.index + match[0].length;
    }
    if (offset < source.length) blocks.push({ type: "text", value: source.slice(offset) });
    return blocks;
}

export function stripMediaSlots(value) {
    return String(value || "")
        .replace(MEDIA_SLOT_LINE_PATTERN, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function analyzeMediaSlots(value, mediaCount = 0) {
    const source = String(value || "");
    const lines = source.split(/\r?\n/);
    const indexes = [];
    const errors = [];
    const expectedCount = Number.isInteger(mediaCount) && mediaCount >= 0 ? mediaCount : 0;

    lines.forEach((line, lineIndex) => {
        if (!/\{\{media:/i.test(line)) return;
        const match = line.match(MEDIA_SLOT_EXACT_PATTERN);
        if (!match) {
            errors.push(`inline media token on line ${lineIndex + 1} must be exactly {{media:N}} on its own line`);
            return;
        }
        if (lineIndex === 0 || lineIndex === lines.length - 1
            || lines[lineIndex - 1].trim() || lines[lineIndex + 1].trim()) {
            errors.push(`inline media token {{media:${match[1]}}} must be surrounded by blank lines`);
        }
        indexes.push(Number(match[1]));
    });

    for (const index of new Set(indexes)) {
        const occurrences = indexes.filter(valueIndex => valueIndex === index).length;
        if (occurrences > 1) errors.push(`inline media token {{media:${index}}} is duplicated`);
        if (index >= expectedCount) errors.push(`inline media token {{media:${index}}} does not reference an existing media item`);
    }
    for (let index = 0; index < expectedCount; index += 1) {
        if (!indexes.includes(index)) errors.push(`media[${index}] is not placed in the definition`);
    }

    return { indexes, errors, textWithoutSlots: stripMediaSlots(source) };
}

export function safeHTTPSURL(value) {
    try {
        const url = new URL(String(value || "").trim());
        return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch {
        return "";
    }
}

export function classifyMediaItem(item) {
    const errors = validateMediaItem(item);
    if (!errors.length) return { kind: "media", fallbackURL: "", errors };

    const fallbackURL = safeHTTPSURL(item?.sourceUrl) || safeHTTPSURL(item?.src);
    return {
        kind: fallbackURL ? "fallback" : "ignored",
        fallbackURL,
        errors
    };
}
