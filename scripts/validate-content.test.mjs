import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateMediaItem } from "../js/content-contract.js";

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

function validYouTubeMedia(overrides = {}) {
    return {
        type: "youtube",
        src: "ho1rwmooHRg",
        start: 0,
        title: "Mapless buried treasure tutorial",
        caption: "A practical walkthrough of mapless buried treasure navigation.",
        credit: {
            name: "MoleyG",
            url: "https://www.youtube.com/@moleyg"
        },
        sourceUrl: "https://www.youtube.com/watch?v=ho1rwmooHRg",
        ...overrides
    };
}

function clearStructuredMedia(data) {
    data.terms.forEach(term => {
        delete term.media;
        term.definition = term.definition
            .replace(/^\{\{media:(?:0|[1-9]\d*)\}\}$/gm, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    });
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

test("accepts a valid structured media item and a term without media", () => {
    const result = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].media = [validYouTubeMedia()];
        data.terms[0].definition += "\n\n{{media:0}}\n\nNotice the demonstrated setup.";
        delete data.terms[1].media;
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.mediaItemCount, 1);
});

test("requires each structured media item to appear once in the definition", () => {
    const result = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].media = [validYouTubeMedia()];
    });
    assert.ok(result.errors.some(error => error.includes("media[0] is not placed")));
});

test("rejects duplicated, out-of-range, and unseparated inline media tokens", () => {
    const duplicate = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].media = [validYouTubeMedia()];
        data.terms[0].definition += "\n\n{{media:0}}\n\nFirst.\n\n{{media:0}}\n\nSecond.";
    });
    assert.ok(duplicate.errors.some(error => error.includes("is duplicated")));

    const outOfRange = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].media = [validYouTubeMedia()];
        data.terms[0].definition += "\n\n{{media:1}}\n\nAfter.";
    });
    assert.ok(outOfRange.errors.some(error => error.includes("does not reference an existing media item")));

    const inline = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].media = [validYouTubeMedia()];
        data.terms[0].definition += " See {{media:0}} here.";
    });
    assert.ok(inline.errors.some(error => error.includes("must be exactly {{media:N}} on its own line")));
});

test("rejects an inline media token on a term without media", () => {
    const result = corrupt(data => {
        clearStructuredMedia(data);
        data.terms[0].definition += "\n\n{{media:0}}\n\nAfter.";
    });
    assert.ok(result.errors.some(error => error.includes("does not reference an existing media item")));
});

test("accepts every supported structured media type", () => {
    const common = {
        title: "Verified media fixture",
        caption: "A sufficiently descriptive caption for the validation fixture.",
        credit: { name: "Fixture author", url: "https://example.com/author" },
        sourceUrl: "https://example.com/source"
    };
    const fixtures = [
        validYouTubeMedia(),
        { ...common, type: "twitch", src: "VerifiedClipSlug" },
        { ...common, type: "image", src: "images/media/example.svg", alt: "Example diagram for validation", width: 1280, height: 720 },
        { ...common, type: "gif", src: "images/media/example.gif", poster: "images/media/example.webp", alt: "Example paused animation", width: 640, height: 360 },
        { ...common, type: "video", src: "media/example.webm", width: 1280, height: 720, hasAudio: false },
        { ...common, type: "link", src: "https://example.com/watch" }
    ];
    for (const fixture of fixtures) assert.deepEqual(validateMediaItem(fixture), []);
});

test("requires captions for local video with audio", () => {
    const errors = validateMediaItem({
        type: "video",
        src: "media/example.mp4",
        title: "Video fixture",
        caption: "A local video fixture with an intentionally missing caption track.",
        credit: { name: "Fixture author", url: "https://example.com/author" },
        sourceUrl: "https://example.com/source",
        width: 1280,
        height: 720,
        hasAudio: true
    });
    assert.ok(errors.includes("captions are required when hasAudio is true"));
});

test("rejects an unsupported media type", () => {
    const result = corrupt(data => {
        data.terms[0].media = [validYouTubeMedia({ type: "iframe" })];
    });
    assert.ok(result.errors.some(error => error.includes("type must be one of")));
});

test("rejects a media item missing a required field", () => {
    const result = corrupt(data => {
        const media = validYouTubeMedia();
        delete media.caption;
        data.terms[0].media = [media];
    });
    assert.ok(result.errors.some(error => error.includes("missing required field 'caption'")));
});

test("rejects unsafe or unallowlisted media sources", () => {
    const result = corrupt(data => {
        data.terms[0].media = [{
            type: "image",
            src: "javascript:alert(1)",
            title: "Unsafe image",
            caption: "This invalid fixture must never reach the rendering layer.",
            credit: { name: "Fixture", url: "https://example.com" },
            sourceUrl: "https://example.com/source",
            alt: "Unsafe fixture image",
            width: 640,
            height: 360
        }];
    });
    assert.ok(result.errors.some(error => error.includes("allowlisted HTTPS image")));
});

test("rejects fields not declared for a media type", () => {
    const result = corrupt(data => {
        data.terms[0].media = [validYouTubeMedia({ html: "<iframe></iframe>" })];
    });
    assert.ok(result.errors.some(error => error.includes("unsupported field 'html'")));
});

test("rejects legacy media directives inside definition Markdown", () => {
    const result = corrupt(data => {
        data.terms[0].definition = "A definition long enough to validate. @[youtube](ho1rwmooHRg)";
    });
    assert.ok(result.errors.some(error => error.includes("media directives are not allowed")));
});
