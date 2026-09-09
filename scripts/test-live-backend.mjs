import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { APP_CONFIG } from "../js/config.js";
import { createSupabaseClient } from "../js/backend/client.js";
import { request } from "../js/core/http.js";

const client = createSupabaseClient();
const terms = JSON.parse(await readFile(new URL("../data/terms.json", import.meta.url), "utf8")).terms;
const result = { project: new URL(APP_CONFIG.supabaseUrl).hostname.split(".")[0], checks: [], issues: [] };
const rows = await client.rpc("get_glossary_vote_state", { p_browser_id: randomUUID() });
result.missingVoteTargets = terms.filter(term => !rows.some(row => row.term_id === term.id)).map(term => term.name);
if (result.missingVoteTargets.length) result.issues.push(`${result.missingVoteTargets.length} published terms are missing live voting targets.`);
for (const table of ["glossary_vote_totals", "glossary_vote_receipts", "glossary_submissions", "glossary_term_reports", "glossary_daily_visit_totals", "glossary_daily_visit_receipts"]) {
    // Never enumerate a moderation payload in output. Write probes either use
    // an unknown random UUID filter or an empty insert that cannot be valid.
    const unknown = randomUUID();
    const key = table === "glossary_vote_totals" || table === "glossary_vote_receipts" ? "term_id"
        : table.includes("daily_visit") ? "visit_date" : "id";
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const query = method === "GET" ? "?limit=1" : method === "POST" ? "" : `?${key}=eq.${unknown}`;
        try {
            await request(`${APP_CONFIG.supabaseUrl}/rest/v1/${table}${query}`, {
                method, headers: { apikey: APP_CONFIG.supabasePublishableKey, "Content-Type": "application/json" },
                ...(method === "POST" || method === "PATCH" ? { body: "{}" } : {})
            });
            result.issues.push(`${method} ${table} unexpectedly succeeded.`);
        } catch (error) {
            if ([401,403,404].includes(error.status)) result.checks.push(`${method} ${table} denied (${error.status})`);
            else result.issues.push(`${method} ${table} did not prove access denial (${error.status || error.kind}).`);
        }
    }
}
for (const name of ["get_glossary_trending_terms", "submit_glossary_correction"]) {
    try {
        // An invalid correction can prove route existence without queuing a row.
        await client.rpc(name, name.includes("correction") ? { p_browser_id: randomUUID(), p_term_id: randomUUID(), p_definition: "", p_website: "" } : {});
        result.checks.push(`${name} available`);
    } catch (error) {
        if (name.includes("correction") && error.status === 400) result.checks.push(`${name} rejects an unknown target`);
        else result.issues.push(`${name} unavailable (${error.status || error.kind}, ${error.code}).`);
    }
}
result.result = result.issues.length ? "FAIL" : "PASS";
result.note = "Public API probes only; catalog access, remote migration history and advisors still require authenticated Supabase MCP. No valid moderation rows were created.";
await mkdir(new URL("../output/structural/final/", import.meta.url), { recursive: true });
await writeFile(new URL("../output/structural/final/live-backend.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.issues.length) process.exitCode = 1;
