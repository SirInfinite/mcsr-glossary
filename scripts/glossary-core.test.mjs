import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    classifyMediaItem,
    getMediaPresentations,
    getVoteTarget,
    normalizeVoteValue,
    projectVoteTotals,
    resolveRelatedTerms,
    resolveTermRoute,
    searchTerms
} from "../js/glossary-core.js";

const glossary = JSON.parse(await readFile(new URL("../data/terms.json", import.meta.url), "utf8"));

const validMedia = {
    type: "youtube",
    src: "ho1rwmooHRg",
    start: 0,
    title: "Mapless buried treasure tutorial",
    caption: "A practical walkthrough of mapless buried treasure navigation.",
    credit: { name: "MoleyG", url: "https://www.youtube.com/@moleyg" },
    sourceUrl: "https://www.youtube.com/watch?v=ho1rwmooHRg"
};

const transitions = [
    { name: "neutral to upvote", current: 0, selected: 1, expected: 1 },
    { name: "upvote to neutral", current: 1, selected: 1, expected: 0 },
    { name: "neutral to downvote", current: 0, selected: -1, expected: -1 },
    { name: "downvote to neutral", current: -1, selected: -1, expected: 0 },
    { name: "upvote to downvote", current: 1, selected: -1, expected: -1 },
    { name: "downvote to upvote", current: -1, selected: 1, expected: 1 }
];

for (const transition of transitions) {
    test(`vote transition: ${transition.name}`, () => {
        assert.equal(getVoteTarget(transition.current, transition.selected), transition.expected);
    });
}

test("vote projection adjusts both totals when switching", () => {
    assert.deepEqual(projectVoteTotals({ up: 8, down: 3 }, 1, -1), { up: 7, down: 4 });
    assert.deepEqual(projectVoteTotals({ up: 8, down: 3 }, -1, 1), { up: 9, down: 2 });
});

test("vote projection removes a current vote without producing negative totals", () => {
    assert.deepEqual(projectVoteTotals({ up: 1, down: 0 }, 1, 0), { up: 0, down: 0 });
    assert.deepEqual(projectVoteTotals({ up: 0, down: 1 }, -1, 0), { up: 0, down: 0 });
    assert.deepEqual(projectVoteTotals({ up: 0, down: 0 }, 1, 0), { up: 0, down: 0 });
});

test("invalid vote values normalize to neutral", () => {
    for (const value of [null, undefined, "up", 2, -2, Number.NaN]) {
        assert.equal(normalizeVoteValue(value), 0);
    }
});

test("valid structured media is renderable", () => {
    assert.equal(classifyMediaItem(validMedia).kind, "media");
});

test("invalid media degrades to its safe original source", () => {
    const result = classifyMediaItem({ ...validMedia, type: "unsupported" });
    assert.equal(result.kind, "fallback");
    assert.equal(result.fallbackURL, validMedia.sourceUrl);
});

test("invalid media without a safe source is ignored", () => {
    const result = classifyMediaItem({ type: "unsupported", src: "javascript:alert(1)" });
    assert.equal(result.kind, "ignored");
});

test("term media presentation handles media-backed and text-only definitions", () => {
    const mapless = glossary.terms.find(term => term.name === "Mapless");
    const anyPercent = glossary.terms.find(term => term.name === "Any%");
    assert.equal(getMediaPresentations(mapless.media).length, 1);
    assert.deepEqual(getMediaPresentations(anyPercent.media), []);
    assert.deepEqual(getMediaPresentations(undefined), []);
});

test("invalid UI media is ignored while a safe-source fallback remains available", () => {
    const presentations = getMediaPresentations([
        { type: "unsupported", src: "javascript:alert(1)" },
        { ...validMedia, type: "unsupported" }
    ]);
    assert.equal(presentations.length, 1);
    assert.equal(presentations[0].presentation.kind, "fallback");
});

test("search ranks an exact canonical name before broader matches", () => {
    const results = searchTerms(glossary.terms, "rsg");
    assert.equal(results[0].name, "RSG");
});

test("search finds exact aliases, partial names, tags, definitions, and ignores case", () => {
    assert.equal(searchTerms(glossary.terms, "SSG")[0].name, "Set Seed");
    assert.ok(searchTerms(glossary.terms, "micro").some(term => term.name === "Microlensing"));
    assert.ok(searchTerms(glossary.terms, "NAVIGATION").some(term => term.tags.includes("navigation")));
    assert.ok(searchTerms(glossary.terms, "uncertainty").some(term => term.name === "Ninjabrain Bot"));
});

test("search returns no result for a nonsense query", () => {
    assert.deepEqual(searchTerms(glossary.terms, "zzzz-no-such-mcsr-term"), []);
});

test("direct term routes resolve by slug and stable UUID", () => {
    const mapless = glossary.terms.find(term => term.name === "Mapless");
    assert.equal(resolveTermRoute(glossary.terms, "mapless")?.id, mapless.id);
    assert.equal(resolveTermRoute(glossary.terms, mapless.id)?.name, "Mapless");
    assert.equal(resolveTermRoute(glossary.terms, "missing-route"), null);
});

test("related terms resolve to real unique term records", () => {
    const stronghold = glossary.terms.find(term => term.name === "Stronghold");
    const related = resolveRelatedTerms(stronghold, glossary.terms);
    assert.ok(related.length > 0 && related.length <= 6);
    assert.ok(related.every(term => glossary.terms.includes(term)));
    assert.equal(new Set(related.map(term => term.id)).size, related.length);
});
