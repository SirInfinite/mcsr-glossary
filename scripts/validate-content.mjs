import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGlossaryText } from "../js/content-validation.js";
import { MEDIA_CONTRACT } from "../js/content-contract.js";
export { validateGlossary, validateGlossaryText } from "../js/content-validation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const termsPath = path.join(root, "data", "terms.json");
const migrationsPath = path.join(root, "supabase", "migrations");

// Filesystem checks belong in the CLI; browser validation shares the URL/schema rules.
// Check case explicitly even on Windows so a local pass also works on GitHub Pages.
export function validateLocalMediaFiles(data, directory = root) {
    const errors = [];
    const patterns = [MEDIA_CONTRACT.localImagePattern, MEDIA_CONTRACT.localGifPattern,
        MEDIA_CONTRACT.localVideoPattern, MEDIA_CONTRACT.localCaptionPattern];
    const resolvedRoot = fs.realpathSync(directory);
    for (const term of data?.terms || []) {
        for (const [index, item] of (term.media || []).entries()) {
            for (const field of ["src", "poster", "captions"]) {
                const value = item?.[field];
                if (typeof value !== "string" || !patterns.some(pattern => pattern.test(value))) continue;
                const label = `${term.name} media[${index}].${field}`;
                try {
                    let current = resolvedRoot;
                    for (const segment of value.split("/")) {
                        if (!fs.readdirSync(current).includes(segment)) throw new Error("missing file or case mismatch");
                        current = path.join(current, segment);
                    }
                    const relative = path.relative(resolvedRoot, fs.realpathSync(current));
                    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("path leaves the repository");
                    if (!fs.statSync(current).isFile()) throw new Error("not a file");
                } catch (error) {
                    errors.push(`${label}: ${value} (${error.code === "ENOENT" ? "missing file" : error.message})`);
                }
            }
        }
    }
    return errors;
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

function run() {
    const source = fs.readFileSync(termsPath, "utf8");
    const result = validateGlossaryText(source, { voteRowIDs: readSeededVoteIDs() });
    if (!result.errors.length) result.errors.push(...validateLocalMediaFiles(JSON.parse(source)));

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
