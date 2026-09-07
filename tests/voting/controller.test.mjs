import test from "node:test";
import assert from "node:assert/strict";
import { createVoting } from "../../js/backend/voting.js";
import { parseVoteRows } from "../../js/backend/vote-contract.js";
import { AppError } from "../../js/core/http.js";
import { glossary } from "../fixtures.mjs";

const id = glossary.terms[0].id;
const initial = () => [{ term_id: id, upvotes: 4, downvotes: 1, current_vote: 0 }];
function setup(rpc) { return createVoting({ client: { enabled: true, rpc }, getBrowserID: () => "10000000-0000-4000-8000-000000000001", terms: glossary.terms }); }

test("one pending write survives view recreation and rejects overlapping clicks", async () => {
    let finish;
    let writes = 0;
    const voting = setup(async name => {
        if (name === "get_glossary_vote_state") return initial();
        writes++;
        return new Promise(resolve => { finish = resolve; });
    });
    await voting.load();
    const first = voting.choose(id, 1);
    assert.equal(voting.isPending(id), true);
    assert.equal(voting.canVote(id), false);
    assert.equal((await voting.choose(id, -1)).ok, false);
    assert.equal(writes, 1);
    finish([{ ...initial()[0], upvotes: 5, current_vote: 1, changed: true }]);
    assert.equal((await first).ok, true);
    assert.equal(voting.getVoteState(id), 1);
    assert.deepEqual(voting.getVotes(id), { up: 5, down: 1 });
});
test("a stale vote-state read cannot overwrite a newer mutation", async () => {
    let completeRead;
    let reads = 0;
    const voting = setup(async name => {
        if (name === "get_glossary_vote_state") {
            if (++reads === 1) return initial();
            return new Promise(resolve => { completeRead = resolve; });
        }
        return [{ ...initial()[0], upvotes: 5, current_vote: 1, changed: true }];
    });
    await voting.load();
    const stale = voting.load();
    await voting.choose(id, 1);
    completeRead(initial());
    await stale;
    assert.equal(voting.getVoteState(id), 1);
});
for (const kind of ["timeout", "network", "malformed-response"]) test(`${kind} preserves confirmed totals and prevents an uncertain second write`, async () => {
    const voting = setup(async name => {
        if (name === "get_glossary_vote_state") return initial();
        throw new AppError(kind, "fixture");
    });
    await voting.load();
    assert.equal((await voting.choose(id, 1)).ok, false);
    assert.deepEqual(voting.getVotes(id), { up: 4, down: 1 });
    assert.equal(voting.getVoteState(id), 0);
    assert.equal(voting.canVote(id), false);
    assert.match(voting.getNote(id), /Reload/);
});
test("a definite validation rejection does not invent a saved vote", async () => {
    const voting = setup(async name => {
        if (name === "get_glossary_vote_state") return initial();
        throw new AppError("rejected", "invalid", { status: 400 });
    });
    await voting.load();
    await voting.choose(id, 1);
    assert.equal(voting.getVoteState(id), 0);
    assert.equal(voting.canVote(id), true);
});
test("malformed aggregate rows cannot enter application state", () => {
    for (const mutation of [row => row.upvotes = -1, row => row.upvotes = Infinity, row => row.downvotes = "", row => row.current_vote = 2, row => row.term_id = "invalid", row => row.upvotes = Number.MAX_SAFE_INTEGER + 1]) {
        const rows = initial(); mutation(rows[0]);
        assert.throws(() => parseVoteRows(rows), { kind: "malformed-response" });
    }
    assert.throws(() => parseVoteRows([...initial(), ...initial()]));
});
test("corrupt cached votes never enable controls or inject malformed totals", () => {
    const storage = { readJSON: () => ({ version: 1, owner: "10000000-0000-4000-8000-000000000001", rows: [{ term_id: id, upvotes: "bad" }] }), remove() {} };
    const voting = createVoting({ client: { enabled: false }, getBrowserID: () => "10000000-0000-4000-8000-000000000001", storage, terms: glossary.terms });
    assert.deepEqual(voting.getVotes(id), { up: 0, down: 0 });
    assert.equal(voting.canVote(id), false);
});
