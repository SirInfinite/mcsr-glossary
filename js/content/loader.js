import { APP_CONFIG } from "../config.js";
import { AppError, request } from "../core/http.js";
import { validateGlossary } from "../content-validation.js";

function freezeContent(value) {
    if (value && typeof value === "object") {
        Object.values(value).forEach(freezeContent);
        Object.freeze(value);
    }
    return value;
}

export function acceptContent(payload) {
    const result = validateGlossary(payload);
    if (result.errors.length || !result.termCount) {
        throw new AppError("content", `Invalid glossary content: ${result.errors[0] || "No terms were supplied."}`);
    }
    // Never patch bad editorial data into apparently valid content at runtime.
    return freezeContent(structuredClone(payload));
}

export async function loadContent(transport = request) {
    try { return acceptContent(await transport(APP_CONFIG.contentPath)); }
    catch (cause) {
        if (cause?.kind === "content") throw cause;
        throw new AppError("content", "The glossary could not be loaded.", { cause });
    }
}
