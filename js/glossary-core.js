import { slugifyTermName, validateMediaItem } from "./content-contract.js";

function normalizeSearchText(value) {
    return String(value || "").trim().toLocaleLowerCase("en-US");
}

export function rankTermForQuery(term, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query || !term) return 0;

    const name = normalizeSearchText(term.name);
    const aliases = (term.aliases || []).map(normalizeSearchText);
    const tags = (term.tags || []).map(normalizeSearchText);
    const category = normalizeSearchText(term.category);
    const definition = normalizeSearchText(term.definition);

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
