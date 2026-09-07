import { APP_CONFIG } from "../config.js";
import { AppError, serviceMessage } from "../core/http.js";
import { STORAGE_KEYS } from "../core/storage.js";
import { normalizeTrendingTerms } from "../content/search.js";
import { getVoteTarget, parseVoteRow, parseVoteRows, projectVoteTotals, VOTE_VALUES } from "./vote-contract.js";

// This controller owns confirmed vote state and in-flight writes for its whole
// lifetime. Views can be destroyed/reopened without creating competing writes.
export function createVoting({ client, getBrowserID, storage, terms, config = APP_CONFIG }) {
    let rows = new Map();
    let available = false;
    let loaded = false;
    let message = client.configurationError || "Voting is not configured.";
    let revision = 0;
    let loadRequest;
    const pending = new Map();
    const uncertain = new Set();
    let trending = { available: false, terms: [] };
    let trendingGeneration = 0;
    const saved = storage?.readJSON(STORAGE_KEYS.votes);
    try {
        if (saved?.version === 1 && saved.owner === getBrowserID()) rows = new Map(parseVoteRows(saved.rows).map(row => [row.term_id, row]));
    } catch { /* Corrupt/obsolete cached votes never enable a write. */ }
    storage?.remove("mcsr_vote_totals");
    storage?.remove("mcsr_vote_states");

    function persist() {
        storage?.writeJSON(STORAGE_KEYS.votes, { version: 1, owner: getBrowserID(), rows: [...rows.values()] });
    }
    function getVotes(id) {
        const optimistic = pending.get(id)?.totals;
        const row = rows.get(id);
        return optimistic ? { ...optimistic } : { up: row?.upvotes || 0, down: row?.downvotes || 0 };
    }
    const getVoteState = id => pending.get(id)?.vote ?? rows.get(id)?.current_vote ?? 0;
    const canVote = id => available && rows.has(id) && !pending.has(id) && !uncertain.has(id);
    function getNote(id) {
        if (pending.has(id)) return "Saving vote…";
        if (uncertain.has(id)) return "The last vote could not be confirmed. Reload to check its saved state.";
        if (!client.enabled) return client.configurationError || "Voting is not configured.";
        if (!loaded) return "Loading community votes…";
        if (!available) return `${message} Totals may be out of date.`;
        if (!rows.has(id)) return "Community voting is not yet available for this entry.";
        const vote = getVoteState(id);
        return vote === 1 ? "Upvote saved. Select it again to remove it, or choose Downvote to switch."
            : vote === -1 ? "Downvote saved. Select it again to remove it, or choose Upvote to switch."
                : "Select a reaction; select it again to remove it.";
    }
    async function load() {
        if (loadRequest) return loadRequest;
        const startingRevision = revision;
        loadRequest = (async () => {
            try {
                const result = parseVoteRows(await client.rpc("get_glossary_vote_state", { p_browser_id: getBrowserID() }));
                if (revision !== startingRevision || pending.size) return false;
                rows = new Map(result.map(row => [row.term_id, row]));
                available = true;
                message = "";
                persist();
                return true;
            } catch (error) {
                if (revision === startingRevision) { available = false; message = serviceMessage(error, "Voting"); }
                return false;
            } finally { loaded = true; }
        })();
        try { return await loadRequest; } finally { loadRequest = null; }
    }
    async function choose(id, direction) {
        if (!VOTE_VALUES.includes(direction) || !canVote(id)) return { ok: false, reason: getNote(id) };
        const vote = getVoteTarget(getVoteState(id), direction);
        pending.set(id, { vote, totals: projectVoteTotals(getVotes(id), getVoteState(id), vote) });
        revision += 1;
        try {
            const result = await client.rpc("set_glossary_vote", { p_term_id: id, p_browser_id: getBrowserID(), p_vote: vote });
            if (!Array.isArray(result) || result.length !== 1) throw new AppError("malformed-response", "Expected one vote result.");
            const row = parseVoteRow(result[0], { id, mutation: true });
            if (row.current_vote !== vote) throw new AppError("malformed-response", "Vote target was not confirmed.");
            rows.set(id, row);
            persist();
            return { ok: true, currentVote: row.current_vote };
        } catch (error) {
            // An ambiguous response is not proof of rollback. Preserve the last
            // confirmed display but require a fresh page/session before another write.
            if (![400, 401, 403, 409, 422].includes(error?.status)) uncertain.add(id);
            return { ok: false, reason: serviceMessage(error, "Vote") };
        } finally { pending.delete(id); revision += 1; }
    }
    async function loadTrending() {
        const generation = ++trendingGeneration;
        if (!client.enabled || !config.trendingEnabled) return false;
        try {
            const result = await client.rpc("get_glossary_trending_terms", {});
            if (!Array.isArray(result)) throw new AppError("malformed-response", "Expected trending rows.");
            if (generation === trendingGeneration) trending = { available: true, terms: normalizeTrendingTerms(result, terms) };
            return true;
        } catch {
            // Optional discovery never prevents reading/searching the static glossary.
            if (generation === trendingGeneration) trending = { available: false, terms: [] };
            return false;
        }
    }
    return Object.freeze({
        get available() { return available; }, load, choose, getVotes, getVoteState,
        canVote, getNote, isPending: id => pending.has(id), loadTrending,
        getTrending: () => ({ available: trending.available, terms: [...trending.terms] })
    });
}
