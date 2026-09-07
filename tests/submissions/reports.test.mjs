import assert from "node:assert/strict";
import test from "node:test";
import { glossary } from "../fixtures.mjs";
import { createContributions, validateTermReportInput } from "../../js/backend/contributions.js";

test("term report input accepts a canonical term and supported reason", () => {
    const mapless = glossary.terms.find(term => term.name === "Mapless");
    const result = validateTermReportInput({
        termId: mapless.id,
        termName: mapless.name,
        reason: "broken_media",
        details: "The tutorial no longer loads.",
        website: ""
    }, glossary.terms);
    assert.deepEqual(result.errors, []);
});

test("term report input rejects spoofed terms, unsupported reasons, honeypots, and missing other details", () => {
    const result = validateTermReportInput({
        termId: "00000000-0000-0000-0000-000000000000",
        termName: "Not published",
        reason: "other",
        details: "",
        website: "bot.example"
    }, glossary.terms);
    assert.ok(result.errors.some(error => error.includes("rejected")));
    assert.ok(result.errors.some(error => error.includes("published")));
    assert.ok(result.errors.some(error => error.includes("details")));

    const unsupported = validateTermReportInput({ reason: "anything" });
    assert.ok(unsupported.errors.some(error => error.includes("supported")));
});

test("malformed report receipts cannot claim delivery or lose the report target", async () => {
    const term = glossary.terms[0];
    const valid = { report_id: term.id, report_status: "pending", created: true };
    for (const response of [null, [], [valid, valid], [{ ...valid, report_id: "invalid" }], [{ ...valid, report_status: "resolved" }], [{ ...valid, created: "true" }]]) {
        const service = createContributions({ terms: glossary.terms, getBrowserID: () => "browser", client: { rpc: async () => response } });
        const result = await service.submitReport({ termId: term.id, termName: term.name, reason: "inaccurate" });
        assert.equal(result.sent, false);
        assert.equal(result.ok, false);
        assert.match(result.reason, /invalid response/);
        assert.ok(result.copy.includes(term.id));
    }
});
