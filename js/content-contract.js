const freezeList = values => Object.freeze([...values]);

export const TERM_CONTRACT = Object.freeze({
    schemaVersion: 1,
    requiredFields: freezeList([
        "id",
        "name",
        "category",
        "aliases",
        "tags",
        "definition",
        "relatedTerms",
        "creationDate",
        "needsUpdating",
        "updatedDate"
    ]),
    categories: freezeList([
        "format",
        "strategy",
        "technique",
        "terminology",
        "tool"
    ]),
    arrayFields: freezeList(["aliases", "tags", "relatedTerms"]),
    dateFields: freezeList(["creationDate", "updatedDate"]),
    limits: Object.freeze({
        nameMin: 2,
        nameMax: 100,
        aliasesMax: 10,
        aliasMax: 80,
        tagsMax: 12,
        tagMax: 40,
        relatedTermsMax: 20,
        definitionMin: 20,
        definitionMax: 5000,
        definitionWarningMin: 80,
        definitionWarningMax: 1200
    }),
    uuidPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    tagPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    datePattern: /^\d{4}-\d{2}-\d{2}$/
});

export function slugifyTermName(name = "") {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isValidEditorialDate(value) {
    if (value === "") return true;
    if (typeof value !== "string" || !TERM_CONTRACT.datePattern.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;
}
