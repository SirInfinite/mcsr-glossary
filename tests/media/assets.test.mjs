import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {validateLocalMediaFiles} from "../../scripts/validate-content.mjs";

test("every published local media asset exists with its exact Pages filename", () => {
    const data = JSON.parse(readFileSync(new URL("../../data/terms.json", import.meta.url), "utf8"));
    assert.deepEqual(validateLocalMediaFiles(data), []);
});

test("missing images, animation posters and video captions fail before deployment", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "mcsr-media-assets-"));
    try {
        mkdirSync(path.join(directory, "images/media"), {recursive: true});
        mkdirSync(path.join(directory, "media"));
        writeFileSync(path.join(directory, "images/media/example.svg"), "<svg/>");
        const data = {terms: [{name: "Fixture", media: [
            {src: "images/media/example.svg"},
            {src: "images/media/missing.png", poster: "images/media/poster.webp"},
            {src: "media/demo.mp4", captions: "media/demo.vtt"}
        ]}]};
        const errors = validateLocalMediaFiles(data, directory);
        assert.equal(errors.length, 4);
        for (const field of ["media[1].src", "media[1].poster", "media[2].src", "media[2].captions"]) {
            assert.ok(errors.some(error => error.includes(field)), field);
        }
        data.terms[0].media = [{src: "images/media/Example.svg"}];
        assert.match(validateLocalMediaFiles(data, directory)[0], /case mismatch/);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});

test("offline content checks never try to fetch provider IDs or external images", () => {
    const data = {terms: [{name: "Fixture", media: [
        {src: "JaVyuTyDxxs"}, {src: "https://minecraft.wiki/images/Example.png"}
    ]}]};
    assert.deepEqual(validateLocalMediaFiles(data), []);
});
