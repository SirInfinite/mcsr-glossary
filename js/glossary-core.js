import { slugifyTermName, validateMediaItem } from "./content-contract.js";

function normalizeSearchText(value) {
    return String(value || "").trim().toLocaleLowerCase("en-US");
}

const MEDIA_SLOT_EXACT_PATTERN = /^\{\{media:(0|[1-9]\d*)\}\}$/;
const MEDIA_SLOT_LINE_PATTERN = /^\{\{media:(0|[1-9]\d*)\}\}$/gm;
export const TERM_REPORT_REASONS = Object.freeze(["inaccurate", "inappropriate", "broken_media", "spam", "other"]);

export function getMediaSlotMarker(index) {
    return `MCSRINLINEMEDIA${Number(index)}MARKER`;
}

export function markMediaSlots(value) {
    return String(value || "").replace(
        MEDIA_SLOT_LINE_PATTERN,
        (_, index) => getMediaSlotMarker(index)
    );
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

export function validateTermReportInput(input, publishedTerms = []) {
    const value = {
        termId: String(input?.termId || "").trim(),
        termName: String(input?.termName || "").trim(),
        reason: String(input?.reason || "").trim(),
        details: String(input?.details || "").trim(),
        website: String(input?.website || "").trim()
    };
    const errors = [];

    if (value.website) errors.push("Report was rejected.");
    if (publishedTerms.length && !publishedTerms.some(term => term.id === value.termId && term.name === value.termName)) {
        errors.push("Choose a published glossary term.");
    }
    if (!TERM_REPORT_REASONS.includes(value.reason)) errors.push("Choose a supported report reason.");
    if (value.details && (value.details.length < 10 || value.details.length > 2000)) {
        errors.push("Report details must be between 10 and 2000 characters.");
    }
    if (value.reason === "other" && !value.details) errors.push("Add details for an “Other” report.");

    return { value, errors };
}

export function rankTermForQuery(term, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query || !term) return 0;

    const name = normalizeSearchText(term.name);
    const aliases = (term.aliases || []).map(normalizeSearchText);
    const tags = (term.tags || []).map(normalizeSearchText);
    const category = normalizeSearchText(term.category);
    const status = normalizeSearchText(term.status);
    const historicalNote = normalizeSearchText(term.historicalNote);
    const definition = normalizeSearchText(stripMediaSlots(term.definition));

    if (name === query) return 1000;
    if (aliases.some(alias => alias === query)) return 950;
    if (name.startsWith(query)) return 850;
    if (aliases.some(alias => alias.startsWith(query))) return 800;
    if (name.split(/\s+/).some(word => word.startsWith(query))) return 760;
    if (name.includes(query)) return 700;
    if (aliases.some(alias => alias.includes(query))) return 650;
    if (tags.some(tag => tag === query)) return 600;
    if (category === query) return 580;
    if (tags.some(tag => tag.startsWith(query))) return 540;
    if (category.startsWith(query)) return 520;
    if (tags.some(tag => tag.includes(query))) return 480;
    if (category.includes(query)) return 460;
    if (status === query) return 440;
    if (status.includes(query)) return 420;
    if (historicalNote.includes(query)) return 320;
    if (definition.includes(query)) return 300;
    return 0;
}

export function searchTerms(terms, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query) return [...terms].sort((a, b) => normalizeSearchText(a.name).localeCompare(normalizeSearchText(b.name)));

    return terms
        .map(term => ({ term, score: rankTermForQuery(term, query) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || normalizeSearchText(a.term.name).localeCompare(normalizeSearchText(b.term.name)))
        .map(result => result.term);
}

export function resolveTermRoute(terms, route) {
    const value = String(route || "").trim();
    if (!value) return null;
    return terms.find(term => term.id === value || slugifyTermName(term.name) === value) || null;
}

export function resolveRelatedTerms(term, terms, limit = 6) {
    const names = new Set((term?.relatedTerms || []).map(normalizeSearchText));
    return terms
        .filter(candidate => names.has(normalizeSearchText(candidate.name)) && candidate.id !== term?.id)
        .filter((candidate, index, items) => items.findIndex(item => item.id === candidate.id) === index)
        .slice(0, Math.max(0, limit));
}

function safeHTTPSURL(value) {
    try {
        const url = new URL(String(value || "").trim());
        return url.protocol === "https:" ? url.href : "";
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

export function getMediaPresentations(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((item, index) => ({ item, index, presentation: classifyMediaItem(item) }))
        .filter(entry => entry.presentation.kind !== "ignored");
}

export function normalizeVoteValue(value) {
    const numeric = Number(value);
    return numeric === 1 || numeric === -1 ? numeric : 0;
}

export function getVoteTarget(currentVote, selectedVote) {
    const current = normalizeVoteValue(currentVote);
    const selected = normalizeVoteValue(selectedVote);
    if (!selected) return 0;
    return current === selected ? 0 : selected;
}

export function projectVoteTotals(totals, currentVote, targetVote) {
    const current = normalizeVoteValue(currentVote);
    const target = normalizeVoteValue(targetVote);
    const upvotes = Math.max(0, Number(totals?.up) || 0)
        - (current === 1 ? 1 : 0)
        + (target === 1 ? 1 : 0);
    const downvotes = Math.max(0, Number(totals?.down) || 0)
        - (current === -1 ? 1 : 0)
        + (target === -1 ? 1 : 0);

    return {
        up: Math.max(0, upvotes),
        down: Math.max(0, downvotes)
    };
}
