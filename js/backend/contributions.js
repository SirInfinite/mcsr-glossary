import { APP_CONFIG } from "../config.js";
import { TERM_CONTRACT } from "../content-contract.js";
import { normalizeText } from "../content/search.js";
import { AppError, serviceMessage } from "../core/http.js";

export const TERM_REPORT_REASONS = Object.freeze(["inaccurate", "inappropriate", "broken_media", "spam", "other"]);

export function normalizeList(value, { label, maxItems, maxLength, tags = false }) {
    const values = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
    if (values.length > maxItems || values.some(item => item.length > maxLength)) throw new AppError("validation", `${label} exceed the allowed count or length.`);
    const unique = new Map();
    for (const item of values) if (!unique.has(normalizeText(item))) unique.set(normalizeText(item), tags ? normalizeText(item) : item);
    const result = [...unique.values()];
    if (tags && result.some(tag => !TERM_CONTRACT.tagPattern.test(tag))) throw new AppError("validation", "Tags must use lowercase words separated by hyphens.");
    return result;
}

export function validateSubmission(input, publishedTerms = []) {
    const limits = TERM_CONTRACT.limits;
    const row = {
        kind: input?.kind || "new", termId: input?.termId || null,
        name: String(input?.name || "").trim(), category: String(input?.category || "").trim(),
        definition: String(input?.definition || "").trim(), website: String(input?.website || "").trim(),
        aliases: normalizeList(input?.aliases, { label: "Aliases", maxItems: limits.aliasesMax, maxLength: limits.aliasMax }),
        tags: normalizeList(input?.tags, { label: "Tags", maxItems: limits.tagsMax, maxLength: limits.tagMax, tags: true })
    };
    if (row.website || !["new", "correction"].includes(row.kind)) throw new AppError("validation", "Submission was rejected.");
    if (row.name.length < limits.nameMin || row.name.length > limits.nameMax) throw new AppError("validation", `Term name must be between ${limits.nameMin} and ${limits.nameMax} characters.`);
    if (!TERM_CONTRACT.categories.includes(row.category)) throw new AppError("validation", "Choose a supported category.");
    if (row.definition.length < limits.definitionMin || row.definition.length > limits.definitionMax) throw new AppError("validation", `Definition must be between ${limits.definitionMin} and ${limits.definitionMax} characters.`);
    if (row.aliases.some(alias => normalizeText(alias) === normalizeText(row.name))) throw new AppError("validation", "An alias cannot repeat the term name.");
    if (row.kind === "correction" && !publishedTerms.some(term => term.id === row.termId && term.name === row.name && term.category === row.category)) throw new AppError("validation", "Choose a published term to correct.");
    if (row.kind === "new" && row.termId) throw new AppError("validation", "New submissions cannot replace a published term.");
    return row;
}

export function validateTermReportInput(input, publishedTerms = []) {
    const value = {
        termId: String(input?.termId || "").trim(), termName: String(input?.termName || "").trim(),
        reason: String(input?.reason || "").trim(), details: String(input?.details || "").trim(),
        website: String(input?.website || "").trim()
    };
    const errors = [];
    if (value.website) errors.push("Report was rejected.");
    if (!TERM_CONTRACT.uuidPattern.test(value.termId) || !publishedTerms.some(term => term.id === value.termId && term.name === value.termName)) errors.push("Choose a published glossary term.");
    if (!TERM_REPORT_REASONS.includes(value.reason)) errors.push("Choose a supported report reason.");
    if (value.details && (value.details.length < 10 || value.details.length > 2000)) errors.push("Report details must be between 10 and 2000 characters.");
    if (value.reason === "other" && !value.details) errors.push("Add details for an “Other” report.");
    return { value, errors };
}

export function submissionCopy(row) {
    return [`MCSR Glossary ${row.kind === "correction" ? "edit suggestion" : "term submission"}`, "",
        `Name: ${row.name}`, `Target: ${row.termId || "New term"}`, `Category: ${row.category}`,
        `Aliases: ${row.aliases.join(", ") || "None"}`, `Tags: ${row.tags.join(", ") || "None"}`, "", "Definition:", row.definition].join("\n");
}

function parseReceipt(result, kind) {
    const row = Array.isArray(result) && result.length === 1 ? result[0] : null;
    if (!TERM_CONTRACT.uuidPattern.test(row?.[`${kind}_id`] || "") || row[`${kind}_status`] !== "pending"
        || (kind === "report" && typeof row.created !== "boolean")) throw new AppError("malformed-response", "The moderation response does not match its contract.");
    return row;
}

export function createContributions({ client, getBrowserID, terms, config = APP_CONFIG }) {
    async function submitTerm(input) {
        let row;
        try { row = validateSubmission(input, terms); }
        catch (error) { return { ok: false, sent: false, reason: error.message }; }
        try {
            const correction = row.kind === "correction" && config.structuredCorrectionsEnabled;
            const body = correction
                ? { p_browser_id: getBrowserID(), p_term_id: row.termId, p_definition: row.definition, p_website: row.website }
                : {
                    p_browser_id: getBrowserID(), p_name: row.name, p_category: row.category,
                    p_aliases: row.aliases,
                    // Compatibility with the already released queue. The additive
                    // correction RPC is enabled only after migration parity is checked.
                    p_tags: row.kind === "correction" ? [...new Set([...row.tags.slice(0, 11), "correction"])] : row.tags,
                    p_definition: row.definition, p_website: row.website
                };
            parseReceipt(await client.rpc(correction ? "submit_glossary_correction" : "submit_glossary_term", body), "submission");
            return { ok: true, sent: true };
        } catch (error) { return { ok: false, sent: false, reason: serviceMessage(error, "Online submission"), copy: submissionCopy(row) }; }
    }
    async function submitReport(input) {
        const { value: row, errors } = validateTermReportInput(input, terms);
        if (errors.length) return { ok: false, sent: false, reason: errors[0] };
        try {
            const receipt = parseReceipt(await client.rpc("submit_glossary_term_report", {
                p_browser_id: getBrowserID(), p_term_id: row.termId, p_term_name: row.termName,
                p_reason: row.reason, p_details: row.details, p_website: row.website
            }), "report");
            return { ok: true, sent: true, created: receipt.created };
        } catch (error) {
            return { ok: false, sent: false, reason: serviceMessage(error, "Online report"),
                copy: ["MCSR Glossary term report", `Term: ${row.termName} (${row.termId})`, `Reason: ${row.reason}`, "", row.details].join("\n") };
        }
    }
    return Object.freeze({ submitTerm, submitReport });
}
