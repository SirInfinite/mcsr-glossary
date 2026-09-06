import assert from "node:assert/strict";
import test from "node:test";
import { glossary, validMedia } from "../fixtures.mjs";
import { validateTermReportInput } from "../../js/backend/contributions.js";

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
