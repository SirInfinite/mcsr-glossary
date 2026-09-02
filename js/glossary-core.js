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
