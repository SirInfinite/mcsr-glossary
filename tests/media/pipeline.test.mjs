import assert from "node:assert/strict";
import test from "node:test";
import { glossary, validMedia } from "../fixtures.mjs";
import { classifyMediaItem, splitDefinitionBlocks, stripMediaSlots, analyzeMediaSlots } from "../../js/content/media.js";
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

test("inline media slots separate Markdown blocks and are stripped from previews", () => {
    const source = "Setup paragraph.\n\n{{media:0}}\n\nWhat to notice afterward.";
    assert.deepEqual(splitDefinitionBlocks(source), [
        { type: "text", value: "Setup paragraph.\n\n" },
        { type: "media", index: 0 },
        { type: "text", value: "\n\nWhat to notice afterward." }
    ]);
    assert.equal(stripMediaSlots(source), "Setup paragraph.\n\nWhat to notice afterward.");
});

test("media parsing preserves literal marker-like text and never guesses embedded tokens", () => {
    const value = "MCSRINLINEMEDIA0MARKER\n\nInline {{media:0}} stays text.\n\n{{media:01}}";
    assert.deepEqual(splitDefinitionBlocks(value), [{ type: "text", value }]);
});

test("media block order is deterministic for repeated parses and CRLF content", () => {
    const value = "Before.\r\n\r\n{{media:1}}\r\n\r\nBetween.\r\n\r\n{{media:0}}\r\n\r\nAfter.";
    const blocks = splitDefinitionBlocks(value);
    assert.deepEqual(blocks.filter(block => block.type === "media").map(block => block.index), [1, 0]);
    assert.deepEqual(splitDefinitionBlocks(value), blocks);
    assert.deepEqual(analyzeMediaSlots(value, 2).errors, []);
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
