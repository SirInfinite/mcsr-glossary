import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    MEDIA_CONTRACT,
    TERM_CONTRACT,
    isValidEditorialDate,
    slugifyTermName,
    validateMediaItem
} from "../js/content-contract.js";
import { analyzeMediaSlots } from "../js/glossary-core.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const termsPath = path.join(root, "data", "terms.json");
const migrationsPath = path.join(root, "supabase", "migrations");

function lowercase(value) {
    return value.toLocaleLowerCase("en-US");
}

function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();
    for (const value of values) {
        const key = lowercase(value);
        if (seen.has(key)) duplicates.add(value);
        seen.add(key);
    }
    return [...duplicates];
}

export function readSeededVoteIDs(directory = migrationsPath) {
    if (!fs.existsSync(directory)) return new Set();
    const migrationText = fs.readdirSync(directory)
        .filter(file => file.endsWith(".sql"))
        .map(file => fs.readFileSync(path.join(directory, file), "utf8"))
        .join("\n");
    const ids = new Set();
    const voteSeedPattern = /insert\s+into\s+public\.glossary_vote_totals\s*\([^)]*term_id[^)]*\)\s*values([\s\S]*?)(?:on\s+conflict|;)/gi;
    for (const seedBlock of migrationText.matchAll(voteSeedPattern)) {
        for (const match of seedBlock[1].matchAll(/'([0-9a-f-]{36})'::uuid/gi)) {
            ids.add(match[1].toLowerCase());
        }
    }
    return ids;
}

export function validateGlossary(payload, { voteRowIDs = null } = {}) {
    const errors = [];
    const warnings = [];
    const categories = new Set(TERM_CONTRACT.categories);
    const statuses = new Set(TERM_CONTRACT.statuses);
    const allowedFields = new Set([...TERM_CONTRACT.requiredFields, ...TERM_CONTRACT.optionalFields]);
    let mediaItemCount = 0;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return { errors: ["Root value must be an object containing a terms array."], warnings, termCount: 0 };
    }
    if (!Array.isArray(payload.terms)) {
        return { errors: ["Root object must contain a terms array."], warnings, termCount: 0 };
    }
    for (const field of ["titleString", "aboutParagraph"]) {
        if (Object.hasOwn(payload, field) && typeof payload[field] !== "string") {
            errors.push(`Root field ${field} must be a string when present.`);
        }
    }

    const terms = payload.terms;
    const canonicalNames = new Map();
    const ids = new Map();
    const routeSlugs = new Map();
    const validTerms = [];

    for (const [index, term] of terms.entries()) {
        const fallbackLabel = `entry ${index + 1}`;
        if (!term || typeof term !== "object" || Array.isArray(term)) {
            errors.push(`${fallbackLabel}: entry must be an object.`);
            continue;
        }

        const nameForLabel = typeof term.name === "string" && term.name.trim()
            ? term.name.trim()
            : fallbackLabel;
        const label = `${nameForLabel} (entry ${index + 1})`;

        for (const field of TERM_CONTRACT.requiredFields) {
            if (!Object.hasOwn(term, field)) errors.push(`${label}: missing required field '${field}'.`);
        }
        for (const field of Object.keys(term)) {
            if (!allowedFields.has(field)) errors.push(`${label}: unsupported field '${field}'. Update the contract before adding new fields.`);
        }

        if (typeof term.id !== "string" || !TERM_CONTRACT.uuidPattern.test(term.id)) {
            errors.push(`${label}: id must be a UUID in 8-4-4-4-12 hexadecimal form.`);
        } else {
            const idKey = term.id.toLowerCase();
            if (ids.has(idKey)) errors.push(`${label}: duplicate id also used by ${ids.get(idKey)}.`);
            else ids.set(idKey, nameForLabel);
            if (voteRowIDs && !voteRowIDs.has(idKey)) {
                errors.push(`${label}: id is not seeded in a Supabase voting migration.`);
            }
        }

        let name = "";
        if (typeof term.name !== "string") {
            errors.push(`${label}: name must be a string.`);
        } else {
            name = term.name.trim();
            if (!name) errors.push(`${label}: name must not be empty.`);
            if (name !== term.name) errors.push(`${label}: name must not have leading or trailing whitespace.`);
            if (name.length < TERM_CONTRACT.limits.nameMin || name.length > TERM_CONTRACT.limits.nameMax) {
                errors.push(`${label}: name must contain ${TERM_CONTRACT.limits.nameMin}-${TERM_CONTRACT.limits.nameMax} characters.`);
            }

            if (name) {
                const nameKey = lowercase(name);
                if (canonicalNames.has(nameKey)) {
                    errors.push(`${label}: duplicate canonical name also used by ${canonicalNames.get(nameKey)}.`);
                } else {
                    canonicalNames.set(nameKey, name);
                }

                const routeSlug = slugifyTermName(name);
                if (!routeSlug) errors.push(`${label}: name does not produce a usable URL slug.`);
                else if (routeSlugs.has(routeSlug)) errors.push(`${label}: URL slug '${routeSlug}' also belongs to ${routeSlugs.get(routeSlug)}.`);
                else routeSlugs.set(routeSlug, name);
            }
        }

        if (typeof term.category !== "string") {
            errors.push(`${label}: category must be a string.`);
        } else if (!categories.has(term.category)) {
            errors.push(`${label}: category '${term.category}' is not allowed. Use one of: ${TERM_CONTRACT.categories.join(", ")}.`);
        }

        const arrays = {};
        for (const field of TERM_CONTRACT.arrayFields) {
            if (!Array.isArray(term[field])) {
                errors.push(`${label}: ${field} must be an array.`);
                arrays[field] = [];
            } else {
                arrays[field] = term[field];
            }
        }

        if (arrays.aliases.length > TERM_CONTRACT.limits.aliasesMax) {
            errors.push(`${label}: aliases may contain at most ${TERM_CONTRACT.limits.aliasesMax} values.`);
        }
        for (const [aliasIndex, alias] of arrays.aliases.entries()) {
            if (typeof alias !== "string") {
                errors.push(`${label}: aliases[${aliasIndex}] must be a string.`);
                continue;
            }
            if (!alias.trim()) errors.push(`${label}: aliases[${aliasIndex}] must not be empty.`);
            if (alias !== alias.trim()) errors.push(`${label}: alias '${alias}' must not have leading or trailing whitespace.`);
            if (alias.length > TERM_CONTRACT.limits.aliasMax) {
                errors.push(`${label}: alias '${alias}' exceeds ${TERM_CONTRACT.limits.aliasMax} characters.`);
            }
            if (name && lowercase(alias.trim()) === lowercase(name)) {
                errors.push(`${label}: alias '${alias}' duplicates its canonical name.`);
            }
        }

        if (arrays.tags.length > TERM_CONTRACT.limits.tagsMax) {
            errors.push(`${label}: tags may contain at most ${TERM_CONTRACT.limits.tagsMax} values.`);
        }
        for (const [tagIndex, tag] of arrays.tags.entries()) {
            if (typeof tag !== "string") {
                errors.push(`${label}: tags[${tagIndex}] must be a string.`);
                continue;
            }
            if (!TERM_CONTRACT.tagPattern.test(tag)) {
                errors.push(`${label}: tag '${tag}' must be a non-empty lowercase kebab-case value.`);
            }
            if (tag.length > TERM_CONTRACT.limits.tagMax) {
                errors.push(`${label}: tag '${tag}' exceeds ${TERM_CONTRACT.limits.tagMax} characters.`);
            }
        }

        if (arrays.relatedTerms.length > TERM_CONTRACT.limits.relatedTermsMax) {
            errors.push(`${label}: relatedTerms may contain at most ${TERM_CONTRACT.limits.relatedTermsMax} values.`);
        }
        for (const [relatedIndex, related] of arrays.relatedTerms.entries()) {
            if (typeof related !== "string") {
                errors.push(`${label}: relatedTerms[${relatedIndex}] must be a string.`);
                continue;
            }
            if (!related.trim()) errors.push(`${label}: relatedTerms[${relatedIndex}] must not be empty.`);
            if (related !== related.trim()) errors.push(`${label}: related term '${related}' must not have leading or trailing whitespace.`);
        }

        for (const [field, values] of Object.entries(arrays)) {
            const stringValues = values.filter(value => typeof value === "string");
            for (const duplicate of findDuplicates(stringValues)) {
                errors.push(`${label}: duplicate ${field} value '${duplicate}'.`);
            }
        }

        if (typeof term.definition !== "string") {
            errors.push(`${label}: definition must be a string.`);
        } else {
            const definitionLength = term.definition.trim().length;
            if (!definitionLength) errors.push(`${label}: definition must not be empty.`);
            if (term.definition !== term.definition.trim()) errors.push(`${label}: definition must not have leading or trailing whitespace.`);
            if (definitionLength < TERM_CONTRACT.limits.definitionMin || definitionLength > TERM_CONTRACT.limits.definitionMax) {
                errors.push(`${label}: definition must contain ${TERM_CONTRACT.limits.definitionMin}-${TERM_CONTRACT.limits.definitionMax} characters.`);
            } else if (definitionLength < TERM_CONTRACT.limits.definitionWarningMin) {
                warnings.push(`${label}: definition is only ${definitionLength} characters; check that it gives a newcomer enough context.`);
            } else if (definitionLength > TERM_CONTRACT.limits.definitionWarningMax) {
                warnings.push(`${label}: definition is ${definitionLength} characters; consider whether it can be more concise.`);
            }
            if (/<iframe\b/i.test(term.definition)) {
                errors.push(`${label}: raw iframe HTML is not allowed; use the structured media field.`);
            }
            if (/@\[(?:youtube|twitch|video)\]\(/i.test(term.definition)) {
                errors.push(`${label}: media directives are not allowed in definition Markdown; use the structured media field.`);
            }
        }

        if (Object.hasOwn(term, "media")) {
            if (!Array.isArray(term.media)) {
                errors.push(`${label}: media must be an array when present.`);
            } else {
                mediaItemCount += term.media.length;
                if (term.media.length > MEDIA_CONTRACT.limits.maxItems) {
                    errors.push(`${label}: media may contain at most ${MEDIA_CONTRACT.limits.maxItems} items.`);
                }
                for (const [mediaIndex, mediaItem] of term.media.entries()) {
                    for (const mediaError of validateMediaItem(mediaItem)) {
                        errors.push(`${label}: media[${mediaIndex}] ${mediaError}.`);
                    }
                }
            }
        }

        if (typeof term.status !== "string") {
            errors.push(`${label}: status must be a string.`);
        } else if (!statuses.has(term.status)) {
            errors.push(`${label}: status '${term.status}' is not allowed. Use one of: ${TERM_CONTRACT.statuses.join(", ")}.`);
        }

        if (term.status === "current" && Object.hasOwn(term, "historicalNote")) {
            errors.push(`${label}: historicalNote is only allowed when status is 'historical' or 'legacy'.`);
        } else if (["historical", "legacy"].includes(term.status)) {
            if (!Object.hasOwn(term, "historicalNote")) {
                errors.push(`${label}: historicalNote is required when status is '${term.status}'.`);
            } else if (typeof term.historicalNote !== "string"
                || term.historicalNote !== term.historicalNote.trim()
                || term.historicalNote.length < TERM_CONTRACT.limits.historicalNoteMin
                || term.historicalNote.length > TERM_CONTRACT.limits.historicalNoteMax) {
                errors.push(`${label}: historicalNote must be a trimmed string of ${TERM_CONTRACT.limits.historicalNoteMin}-${TERM_CONTRACT.limits.historicalNoteMax} characters.`);
            }
        }

        if (typeof term.definition === "string") {
            const mediaCount = Array.isArray(term.media) ? term.media.length : 0;
            for (const slotError of analyzeMediaSlots(term.definition, mediaCount).errors) {
                errors.push(`${label}: ${slotError}.`);
            }
        }

        if (typeof term.needsUpdating !== "boolean") {
            errors.push(`${label}: needsUpdating must be a boolean.`);
        }
        for (const field of TERM_CONTRACT.dateFields) {
            if (!isValidEditorialDate(term[field])) {
                errors.push(`${label}: ${field} must be empty or a real calendar date in YYYY-MM-DD format.`);
            }
        }

        validTerms.push({ label, name, arrays });
    }

    for (let index = 1; index < terms.length; index += 1) {
        const previous = terms[index - 1]?.name;
        const current = terms[index]?.name;
        if (typeof previous === "string" && typeof current === "string"
            && previous.localeCompare(current, "en", { sensitivity: "base" }) > 0) {
            errors.push(`Terms must be sorted alphabetically: '${previous}' appears before '${current}'.`);
            break;
        }
    }

    const publicNames = new Map();
    for (const { label, name, arrays } of validTerms) {
        if (!name) continue;
        const navigableNames = [name, ...arrays.aliases.filter(alias => typeof alias === "string" && alias.trim())];
        for (const publicName of navigableNames) {
            const key = lowercase(publicName.trim());
            if (publicNames.has(key) && publicNames.get(key) !== name) {
                errors.push(`${label}: public name '${publicName}' collides with ${publicNames.get(key)}.`);
            } else {
                publicNames.set(key, name);
            }
        }

        for (const related of arrays.relatedTerms.filter(value => typeof value === "string" && value.trim())) {
            const relatedKey = lowercase(related.trim());
            if (!canonicalNames.has(relatedKey)) {
                errors.push(`${label}: unresolved related term '${related}'.`);
            } else if (relatedKey === lowercase(name)) {
                errors.push(`${label}: cannot relate to itself.`);
            } else if (canonicalNames.get(relatedKey) !== related) {
                errors.push(`${label}: related term '${related}' must match canonical casing '${canonicalNames.get(relatedKey)}'.`);
            }
        }
    }

    return {
        errors,
        warnings,
        termCount: terms.length,
        uniqueIDCount: ids.size,
        uniqueRouteCount: routeSlugs.size,
        mediaItemCount
    };
}

export function validateGlossaryText(source, options) {
    let payload;
    try {
        payload = JSON.parse(source);
    } catch (error) {
        return { errors: [`Invalid JSON: ${error.message}`], warnings: [], termCount: 0 };
    }
    return validateGlossary(payload, options);
}

function run() {
    const source = fs.readFileSync(termsPath, "utf8");
    const result = validateGlossaryText(source, { voteRowIDs: readSeededVoteIDs() });

    if (result.warnings.length) {
        console.warn(`Content validation produced ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}:`);
        for (const warning of result.warnings) console.warn(`- ${warning}`);
    }
    if (result.errors.length) {
        console.error(`Content validation failed with ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}:`);
        for (const error of result.errors) console.error(`- ${error}`);
        process.exitCode = 1;
        return;
    }

    console.log(
        `Content validation passed: ${result.termCount} terms, ${result.uniqueIDCount} unique UUIDs, `
        + `${result.uniqueRouteCount} unique routes, ${result.mediaItemCount} media items, `
        + "all IDs seeded for voting, all related terms resolved."
    );
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) run();
