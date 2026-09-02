import assert from "node:assert/strict";
import test from "node:test";

import {
    classifyMediaItem,
    getVoteTarget,
    normalizeVoteValue,
    projectVoteTotals
} from "../js/glossary-core.js";

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
