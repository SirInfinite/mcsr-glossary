import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmission, createContributions } from "../../js/backend/contributions.js";
import { AppError } from "../../js/core/http.js";
import { glossary } from "../fixtures.mjs";

const input = { name: "Candidate term", category: "technique", aliases: "Example alias", tags: "nether", definition: "A proposed definition long enough for a private editorial review." };
test("proposal normalization trims and deduplicates lists without changing editorial text", () => {
    const row = validateSubmission({ ...input, aliases: " Example alias, example alias ", tags: " NETHER, nether " });
    assert.deepEqual(row.aliases, ["Example alias"]);
    assert.deepEqual(row.tags, ["nether"]);
    assert.equal(row.definition, input.definition);
});
for (const [field, value] of [["name","x"],["category","missing"],["tags","bad tag!"],["aliases","x".repeat(81)],["definition","tiny"],["definition","x".repeat(5001)],["website","bot"],["kind","approved"]]) test(`invalid proposal ${field} fails before any network operation`, () => {
    assert.throws(() => validateSubmission({ ...input, [field]: value }), { kind: "validation" });
});
test("corrections require the actual term identity and category", () => {
    const term = glossary.terms[0];
    const correction = { ...input, kind: "correction", termId: term.id, name: term.name, category: term.category };
    assert.equal(validateSubmission(correction, glossary.terms).termId, term.id);
    assert.throws(() => validateSubmission({ ...correction, name: "Spoofed" }, glossary.terms));
});
test("enabled structured corrections send only target UUID and proposed wording", async () => {
    let called;
    const service = createContributions({ terms: glossary.terms, getBrowserID: () => "browser", config: { structuredCorrectionsEnabled: true }, client: { rpc: async (name, body) => {
        called = { name, body };
        return [{ submission_id: glossary.terms[0].id, submission_status: "pending" }];
    } } });
    const term = glossary.terms[0];
    const result = await service.submitTerm({ ...input, kind: "correction", termId: term.id, name: term.name, category: term.category });
    assert.equal(result.sent, true);
    assert.equal(called.name, "submit_glossary_correction");
    assert.equal(called.body.p_term_id, term.id);
    assert.equal(called.body.p_name, undefined);
});
test("unconfirmed moderation writes retain a reviewable clipboard payload", async () => {
    const service = createContributions({ terms: glossary.terms, getBrowserID: () => "browser", client: { rpc: async () => { throw new AppError("timeout", "fixture"); } } });
    const result = await service.submitTerm(input);
    assert.equal(result.sent, false);
    assert.match(result.copy, /Candidate term/);
    assert.match(result.reason, /could not be confirmed/);
});

test("malformed proposal receipts cannot claim delivery and preserve the proposed content", async () => {
    const valid = { submission_id: glossary.terms[0].id, submission_status: "pending" };
    for (const response of [null, [], [valid, valid], [{ ...valid, submission_id: "invalid" }], [{ ...valid, submission_status: "approved" }]]) {
        const service = createContributions({ terms: glossary.terms, getBrowserID: () => "browser", client: { rpc: async () => response } });
        const result = await service.submitTerm(input);
        assert.equal(result.sent, false);
        assert.equal(result.ok, false);
        assert.match(result.reason, /invalid response/);
        assert.ok(result.copy.includes(input.definition));
    }
});
