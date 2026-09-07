import assert from "node:assert/strict";
import test from "node:test";
import { glossary, validMedia } from "../fixtures.mjs";
import { resolveTermRoute } from "../../js/core/router.js";
import { resolveRoute, termPath } from "../../js/core/router.js";
import { resolveRelatedTerms } from "../../js/content/search.js";

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

test("invalid and empty routes never silently select a different published term", () => {
    for (const query of ["?t=", "?t=missing", "?t=%3Cscript%3E", "?page=unknown"]) assert.equal(resolveRoute(glossary.terms, query).page, "not-found");
    assert.equal(resolveRoute(glossary.terms, "?page=credits").page, "about");
    assert.equal(resolveRoute(glossary.terms, "").page, "home");
});
test("UUID fallback and explicit historical slugs keep renamed terms addressable", () => {
    const term = { ...glossary.terms[0], name: "Renamed entry", legacySlugs: ["all-advancements"] };
    assert.equal(resolveTermRoute([term], term.id.toUpperCase()), term);
    assert.equal(resolveTermRoute([term], "all-advancements"), term);
    assert.equal(termPath(term, "/mcsr-glossary/"), "/mcsr-glossary/?t=renamed-entry");
});
