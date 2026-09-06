import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSupabaseClient } from "../js/backend/client.js";
const client = createSupabaseClient();
assert.ok(client.enabled, "A valid public Supabase configuration is required.");
async function rpc(functionName, body, expectedStatus = 200) {
    try {
        const payload = await client.rpc(functionName, body);
        assert.equal(expectedStatus, 200, `${functionName} unexpectedly succeeded.`);
        return payload;
    } catch (error) {
        assert.equal(error.status, expectedStatus, `${functionName} returned ${error.status || error.kind}.`);
        return null;
    }
}

async function getState(browserID) {
    return rpc("get_glossary_vote_state", { p_browser_id: browserID });
}

async function setVote(termID, browserID, vote, expectedStatus = 200) {
    const payload = await rpc("set_glossary_vote", {
        p_term_id: termID,
        p_browser_id: browserID,
        p_vote: vote
    }, expectedStatus);
    return Array.isArray(payload) ? payload[0] : payload;
}

const browserIDs = [randomUUID(), randomUUID(), randomUUID()];
const initialState = await getState(browserIDs[2]);
assert.ok(initialState.length > 0, "Expected seeded glossary vote totals.");
const target = initialState.find(row => Number(row.upvotes) === 0 && Number(row.downvotes) === 0) || initialState.at(-1);
const baseline = { up: Number(target.upvotes), down: Number(target.downvotes) };

try {
    const simultaneous = await Promise.all([
        setVote(target.term_id, browserIDs[0], 1),
        setVote(target.term_id, browserIDs[1], 1)
    ]);
    assert.ok(simultaneous.every(result => result.current_vote === 1), "Both concurrent clients should retain one upvote.");

    let authoritative = (await getState(browserIDs[2])).find(row => row.term_id === target.term_id);
    assert.equal(Number(authoritative.upvotes), baseline.up + 2, "Concurrent upvotes must both be counted.");
    assert.equal(Number(authoritative.downvotes), baseline.down);

    await Promise.all(browserIDs.slice(0, 2).map(browserID => setVote(target.term_id, browserID, 0)));
    authoritative = (await getState(browserIDs[2])).find(row => row.term_id === target.term_id);
    assert.deepEqual(
        { up: Number(authoritative.upvotes), down: Number(authoritative.downvotes) },
        baseline,
        "Concurrent removals must restore the baseline."
    );

    // Exercise all six reversible transitions before the conflicting-write test.
    for (const vote of [1, 0, -1, 0, 1, -1, 1, 0]) {
        const state = await setVote(target.term_id, browserIDs[0], vote);
        assert.equal(Number(state.current_vote), vote);
        assert.equal(Number(state.upvotes), baseline.up + (vote === 1 ? 1 : 0));
        assert.equal(Number(state.downvotes), baseline.down + (vote === -1 ? 1 : 0));
    }

    await Promise.all([
        setVote(target.term_id, browserIDs[2], 1),
        setVote(target.term_id, browserIDs[2], -1)
    ]);
    authoritative = (await getState(browserIDs[2])).find(row => row.term_id === target.term_id);
    assert.ok([1, -1].includes(Number(authoritative.current_vote)), "A rapid conflicting pair must leave one current vote.");
    assert.equal(Number(authoritative.upvotes), baseline.up + (authoritative.current_vote === 1 ? 1 : 0));
    assert.equal(Number(authoritative.downvotes), baseline.down + (authoritative.current_vote === -1 ? 1 : 0));

    const repeated = await setVote(target.term_id, browserIDs[2], Number(authoritative.current_vote));
    assert.equal(repeated.changed, false, "Repeating the authoritative state should be idempotent.");

    await setVote(target.term_id, browserIDs[2], 2, 400);
    await setVote(randomUUID(), browserIDs[2], 1, 400);
    await setVote("invalid-uuid", browserIDs[2], 1, 400);
    await rpc("get_glossary_vote_state", { p_browser_id: "invalid-uuid" }, 400);
} finally {
    await Promise.allSettled(browserIDs.map(browserID => setVote(target.term_id, browserID, 0)));
}

const cleanedState = (await getState(randomUUID())).find(row => row.term_id === target.term_id);
assert.deepEqual(
    { up: Number(cleanedState.upvotes), down: Number(cleanedState.downvotes) },
    baseline,
    "Live vote test must clean up its records and totals."
);

console.log(`Live voting passed for ${target.term_id}: concurrent clients, rapid conflict, idempotency, rejection, and cleanup.`);
