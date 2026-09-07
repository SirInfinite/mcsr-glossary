import { AppError } from "../core/http.js";
import { TERM_CONTRACT } from "../content-contract.js";

export const VOTE_VALUES = Object.freeze([-1, 0, 1]);

export function parseVoteRow(row, { id, mutation = false } = {}) {
    const termID = row?.term_id ?? id;
    const count = value => (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))
        && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
    if (!TERM_CONTRACT.uuidPattern.test(termID || "") || (id && termID !== id)
        || !count(row?.upvotes) || !count(row?.downvotes)
        || !VOTE_VALUES.includes(row?.current_vote)
        || (mutation && typeof row?.changed !== "boolean")) {
        throw new AppError("malformed-response", "The vote response does not match its contract.");
    }
    return { term_id: termID, upvotes: Number(row.upvotes), downvotes: Number(row.downvotes), current_vote: row.current_vote, changed: row.changed };
}

export function parseVoteRows(rows) {
    if (!Array.isArray(rows)) throw new AppError("malformed-response", "Expected vote rows.");
    const parsed = rows.map(row => parseVoteRow(row));
    if (new Set(parsed.map(row => row.term_id.toLowerCase())).size !== parsed.length) throw new AppError("malformed-response", "Duplicate vote rows.");
    return parsed;
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
