import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    readSeededVoteIDs,
    validateGlossary,
    validateGlossaryText
} from "./validate-content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "data", "terms.json"), "utf8");
const baseline = JSON.parse(source);
const voteRowIDs = readSeededVoteIDs();

function corrupt(mutator) {
    const copy = structuredClone(baseline);
    mutator(copy);
    return validateGlossary(copy, { voteRowIDs });
}

test("the checked-in glossary satisfies the contract", () => {
    const result = validateGlossaryText(source, { voteRowIDs });
    assert.deepEqual(result.errors, []);
});

const failureCases = [
    {
        name: "invalid JSON",
        result: () => validateGlossaryText("{ not-json"),
        expected: "Invalid JSON"
    },
    {
        name: "missing required field",
        result: () => corrupt(data => { delete data.terms[0].definition; }),
        expected: "missing required field 'definition'"
    },
    {
        name: "duplicate ID",
        result: () => corrupt(data => { data.terms[1].id = data.terms[0].id; }),
        expected: "duplicate id"
    },
    {
        name: "malformed UUID",
        result: () => corrupt(data => { data.terms[0].id = "not-a-uuid"; }),
        expected: "id must be a UUID"
    },
    {
        name: "case-insensitive duplicate canonical name",
        result: () => corrupt(data => { data.terms[1].name = data.terms[0].name.toUpperCase(); }),
        expected: "duplicate canonical name"
    },
    {
        name: "ambiguous alias navigation",
        result: () => corrupt(data => { data.terms[1].aliases = [data.terms[0].name.toUpperCase()]; }),
        expected: "public name"
    },
    {
        name: "invalid category",
        result: () => corrupt(data => { data.terms[0].category = "noun, verb"; }),
        expected: "category 'noun, verb' is not allowed"
    },
    {
        name: "wrong field type",
        result: () => corrupt(data => { data.terms[0].aliases = "Any Percent"; }),
        expected: "aliases must be an array"
    },
    {
        name: "empty required string",
        result: () => corrupt(data => { data.terms[0].definition = ""; }),
        expected: "definition must not be empty"
    },
    {
        name: "invalid date format",
        result: () => corrupt(data => { data.terms[0].updatedDate = "09/01/2026"; }),
        expected: "YYYY-MM-DD"
    },
    {
        name: "impossible calendar date",
        result: () => corrupt(data => { data.terms[0].updatedDate = "2026-02-30"; }),
        expected: "YYYY-MM-DD"
    },
    {
        name: "unresolved related term",
        result: () => corrupt(data => { data.terms[0].relatedTerms = ["Missing Term"]; }),
        expected: "unresolved related term"
    },
    {
        name: "self-related term",
        result: () => corrupt(data => { data.terms[0].relatedTerms = [data.terms[0].name]; }),
        expected: "cannot relate to itself"
    },
    {
        name: "duplicate related term",
        result: () => corrupt(data => { data.terms[0].relatedTerms = [data.terms[1].name, data.terms[1].name]; }),
        expected: "duplicate relatedTerms"
    },
    {
        name: "duplicate tag",
        result: () => corrupt(data => { data.terms[0].tags = ["rsg", "RSG"]; }),
        expected: "duplicate tags"
    },
    {
        name: "unsupported mode field",
        result: () => corrupt(data => { data.terms[0].modes = ["invalid-mode"]; }),
        expected: "unsupported field 'modes'"
    },
    {
        name: "unseeded voting ID",
        result: () => corrupt(data => { data.terms[0].id = "00000000-0000-0000-0000-000000000000"; }),
        expected: "not seeded in a Supabase voting migration"
    }
];

for (const failureCase of failureCases) {
    test(`rejects ${failureCase.name}`, () => {
        const result = failureCase.result();
        assert.ok(
            result.errors.some(error => error.includes(failureCase.expected)),
            `Expected an error containing '${failureCase.expected}', received:\n${result.errors.join("\n")}`
        );
    });
}

test("warns about unusually short and long definitions without failing them", () => {
    const result = corrupt(data => {
        data.terms[0].definition = "A valid but very short definition.";
        data.terms[1].definition = "x".repeat(1300);
    });
    assert.equal(result.errors.length, 0);
    assert.ok(result.warnings.some(warning => warning.includes("only")));
    assert.ok(result.warnings.some(warning => warning.includes("more concise")));
});
