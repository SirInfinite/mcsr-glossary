import assert from "node:assert/strict";
import test from "node:test";
import { glossary, validMedia } from "../fixtures.mjs";
import { searchTerms } from "../../js/content/search.js";
import { filterTerms } from "../../js/content/search.js";

test("search ranks an exact canonical name before broader matches", () => {
    const results = searchTerms(glossary.terms, "rsg");
    assert.equal(results[0].name, "RSG");
});

test("search finds exact aliases, partial names, tags, definitions, and ignores case", () => {
    assert.equal(searchTerms(glossary.terms, "SSG")[0].name, "SSG");
    assert.equal(searchTerms(glossary.terms, "Set Seed Glitchless")[0].name, "SSG");
    assert.ok(searchTerms(glossary.terms, "micro").some(term => term.name === "Microlensing"));
    assert.ok(searchTerms(glossary.terms, "NAVIGATION").some(term => term.tags.includes("navigation")));
    assert.ok(searchTerms(glossary.terms, "probabilistic").some(term => term.name === "Ninjabrain Bot"));
});

test("search finds historical and legacy classifications", () => {
    assert.ok(searchTerms(glossary.terms, "historical").some(term => term.name === "Forced Perch"));
    assert.ok(searchTerms(glossary.terms, "legacy").some(term => term.name === "Calculated Travel"));
});

test("search returns no result for a nonsense query", () => {
    assert.deepEqual(searchTerms(glossary.terms, "zzzz-no-such-mcsr-term"), []);
});

test("ranking is independent of source order at every matching tier", () => {
    const make = (name, aliases = [], tags = [], category = "tool", definition = "Unrelated description") => ({ name, aliases, tags, category, definition });
    const terms = [make("Pearl"), make("A exact alias", ["pearl"]), make("Pearl travel"), make("B alias prefix", ["pearl practice"]), make("C my-pearl entry"), make("D alias substring", ["my-pearl"]), make("E tag match", [], ["pearl"]), make("F body match", [], [], "tool", "Practice a pearl throw")];
    const expected = terms.map(term => term.name);
    assert.deepEqual(searchTerms(terms, "pearl").map(term => term.name), expected);
    assert.deepEqual(searchTerms([...terms].reverse(), "pearl").map(term => term.name), expected);
});
test("canonical category, any/all/none tags and index compose deterministically", () => {
    const terms = glossary.terms;
    for (const tagMatch of ["any", "all", "none"]) {
        const selected = ["nether", "bastion"];
        const actual = filterTerms(terms, { category: "terminology", tags: new Set(selected), tagMatch });
        const expected = terms.filter(term => term.category === "terminology" && (tagMatch === "all" ? selected.every(tag => term.tags.includes(tag)) : tagMatch === "any" ? selected.some(tag => term.tags.includes(tag)) : !selected.some(tag => term.tags.includes(tag))));
        assert.deepEqual(actual.map(term => term.id).sort(), expected.map(term => term.id).sort());
    }
    assert.ok(filterTerms(terms, { letter: "B" }).every(term => term.name.startsWith("B")));
    assert.equal(filterTerms(terms, { query: "1 cycle", letter: "B" })[0].name, "One Cycle");
});
