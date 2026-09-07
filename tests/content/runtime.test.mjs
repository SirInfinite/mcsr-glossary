import test from "node:test";
import assert from "node:assert/strict";
import { glossary } from "../fixtures.mjs";
import { acceptContent, loadContent } from "../../js/content/loader.js";
import { validateGlossary } from "../../js/content-validation.js";

test("published content is immutable after the shared contract accepts it", () => {
    const content = acceptContent(glossary);
    assert.ok(Object.isFrozen(content.terms[0].aliases));
    assert.throws(() => { content.terms[0].name = "changed"; }, TypeError);
    assert.notEqual(content, glossary);
});
for (const [label, corrupt] of [
    ["duplicate UUID", data => data.terms[1].id = data.terms[0].id],
    ["HTML in a term UUID", data => data.terms[0].id = '" onmouseover="alert(1)'],
    ["ambiguous alias", data => data.terms[0].aliases.push(data.terms[1].name)],
    ["bad relation", data => data.terms[0].relatedTerms.push("missing")],
    ["colliding historical route", data => data.terms[0].legacySlugs = ["any"]],
    ["dates in the wrong order", data => { data.terms[0].creationDate = "2026-09-06"; data.terms[0].updatedDate = "2026-09-01"; }]
]) test(`runtime and CLI both reject ${label}`, () => {
    const data = structuredClone(glossary); corrupt(data);
    assert.ok(validateGlossary(data).errors.length);
    assert.throws(() => acceptContent(data), { kind: "content" });
});
test("missing, malformed and unavailable content always use the content error boundary", async () => {
    for (const transport of [async () => null, async () => ({}), async () => { throw new TypeError("offline"); }]) await assert.rejects(loadContent(transport), { kind: "content" });
});
