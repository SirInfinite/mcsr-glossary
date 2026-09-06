import { readFile } from "node:fs/promises";
export const glossary = JSON.parse(await readFile(new URL("../data/terms.json", import.meta.url), "utf8"));

export const validMedia = {
    type: "youtube",
    src: "ho1rwmooHRg",
    start: 0,
    title: "Mapless buried treasure tutorial",
    caption: "A practical walkthrough of mapless buried treasure navigation.",
    credit: { name: "MoleyG", url: "https://www.youtube.com/@moleyg" },
    sourceUrl: "https://www.youtube.com/watch?v=ho1rwmooHRg"
};

