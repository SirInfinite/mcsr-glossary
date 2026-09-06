import assert from "node:assert/strict";
import test from "node:test";
import { glossary, validMedia } from "../fixtures.mjs";
import { classifyMediaItem, getMediaPresentations, getMediaSlotMarker, markMediaSlots, stripMediaSlots, analyzeMediaSlots } from "../../js/content/media.js";
import { normalizeTrendingTerms } from "../../js/content/search.js";

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

test("recent vote activity ranks only published terms with a positive balance", () => {
    const [first, second, third] = glossary.terms.slice(0, 3);
    const ranked = normalizeTrendingTerms([
        { term_id: second.id, recent_upvotes: "4", recent_downvotes: "1" },
        { term_id: first.id, recent_upvotes: 7, recent_downvotes: 1 },
        { term_id: third.id, recent_upvotes: 2, recent_downvotes: 2 },
        { term_id: "00000000-0000-0000-0000-000000000000", recent_upvotes: 99, recent_downvotes: 0 }
    ], glossary.terms);

    assert.deepEqual(ranked.map(entry => entry.term.id), [first.id, second.id]);
    assert.deepEqual(ranked.map(entry => entry.score), [6, 3]);
});

test("recent vote activity rejects malformed counts, deduplicates terms, and respects its limit", () => {
    const [first, second] = glossary.terms.slice(0, 2);
    const ranked = normalizeTrendingTerms([
        { term_id: first.id, recent_upvotes: 2, recent_downvotes: 0 },
        { term_id: first.id, recent_upvotes: 5, recent_downvotes: 1 },
        { term_id: second.id, recent_upvotes: -1, recent_downvotes: 0 },
        { term_id: second.id, recent_upvotes: "not-a-count", recent_downvotes: 0 }
    ], glossary.terms, 1);

    assert.equal(ranked.length, 1);
    assert.deepEqual(ranked[0], {
        term: first,
        recentUpvotes: 5,
        recentDownvotes: 1,
        score: 4
    });
});

test("inline media slots are marked for safe DOM replacement and stripped from previews", () => {
    const source = "Setup paragraph.\n\n{{media:0}}\n\nWhat to notice afterward.";
    assert.equal(markMediaSlots(source), `Setup paragraph.\n\n${getMediaSlotMarker(0)}\n\nWhat to notice afterward.`);
    assert.equal(stripMediaSlots(source), "Setup paragraph.\n\nWhat to notice afterward.");
});

test("inline media slot analysis requires one contextual placement per media item", () => {
    const valid = analyzeMediaSlots("Before.\n\n{{media:0}}\n\nBetween.\n\n{{media:1}}\n\nAfter.", 2);
    assert.deepEqual(valid.indexes, [0, 1]);
    assert.deepEqual(valid.errors, []);

    const invalid = analyzeMediaSlots("Before {{media:0}} after.\n\n{{media:2}}\n\nDone.", 2);
    assert.ok(invalid.errors.some(error => error.includes("must be exactly")));
    assert.ok(invalid.errors.some(error => error.includes("does not reference")));
    assert.ok(invalid.errors.some(error => error.includes("media[0]")));
    assert.ok(invalid.errors.some(error => error.includes("media[1]")));
});

test("invalid UI media is ignored while a safe-source fallback remains available", () => {
    const presentations = getMediaPresentations([
        { type: "unsupported", src: "javascript:alert(1)" },
        { ...validMedia, type: "unsupported" }
    ]);
    assert.equal(presentations.length, 1);
    assert.equal(presentations[0].presentation.kind, "fallback");
});
