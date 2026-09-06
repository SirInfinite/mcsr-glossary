import { stripMediaSlots } from "./media.js";

export function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase("en-US");
}

export function rankTermForQuery(term, rawQuery) {
    const query = normalizeText(rawQuery);
    if (!query || !term) return 0;

    const name = normalizeText(term.name);
    const aliases = (term.aliases || []).map(normalizeText);
    const tags = (term.tags || []).map(normalizeText);
    const category = normalizeText(term.category);
    const status = normalizeText(term.status);
    const historicalNote = normalizeText(term.historicalNote);
    const definition = normalizeText(stripMediaSlots(term.definition));

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
    const query = normalizeText(rawQuery);
    if (!query) return [...terms].sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), "en-US"));

    return terms
        .map(term => ({ term, score: rankTermForQuery(term, query) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || normalizeText(a.term.name).localeCompare(normalizeText(b.term.name), "en-US"))
        .map(result => result.term);
}

export function resolveRelatedTerms(term, terms, limit = 6) {
    const names = new Set((term?.relatedTerms || []).map(normalizeText));
    return terms
        .filter(candidate => names.has(normalizeText(candidate.name)) && candidate.id !== term?.id)
        .filter((candidate, index, items) => items.findIndex(item => item.id === candidate.id) === index)
        .slice(0, Math.max(0, limit));
}

export function normalizeTrendingTerms(rows, terms, limit = 5) {
    const publishedTerms = new Map(
        (Array.isArray(terms) ? terms : []).map(term => [String(term?.id || ""), term])
    );
    const candidates = new Map();
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 0), 10) : 5;

    (Array.isArray(rows) ? rows : []).forEach((row, position) => {
        const term = publishedTerms.get(String(row?.term_id || ""));
        const recentUpvotes = Number(row?.recent_upvotes);
        const recentDownvotes = Number(row?.recent_downvotes);
        if (!term
            || !Number.isSafeInteger(recentUpvotes)
            || !Number.isSafeInteger(recentDownvotes)
            || recentUpvotes < 0
            || recentDownvotes < 0) return;

        const score = recentUpvotes - recentDownvotes;
        if (score <= 0) return;

        const candidate = { term, recentUpvotes, recentDownvotes, score, position };
        const existing = candidates.get(term.id);
        if (!existing
            || candidate.score > existing.score
            || (candidate.score === existing.score && candidate.recentUpvotes > existing.recentUpvotes)) {
            candidates.set(term.id, candidate);
        }
    });

    return [...candidates.values()]
        .sort((a, b) => b.score - a.score || b.recentUpvotes - a.recentUpvotes || a.position - b.position)
        .slice(0, safeLimit)
        .map(({ position, ...candidate }) => candidate);
}

export function filterTerms(terms, { query = "", category = "all", tags = new Set(), tagMatch = "any", letter = "ALL" } = {}) {
    const selected = [...tags];
    return searchTerms(terms.filter(term => {
        if (category !== "all" && term.category !== category) return false;
        if (selected.length) {
            const matches = selected.map(tag => term.tags.includes(tag));
            if (tagMatch === "all" && !matches.every(Boolean)) return false;
            if (tagMatch === "any" && !matches.some(Boolean)) return false;
            if (tagMatch === "none" && matches.some(Boolean)) return false;
        }
        return Boolean(query.trim()) || letter === "ALL" || term.name[0].toUpperCase() === letter;
    }), query);
}
