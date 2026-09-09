import { AppError } from "../core/http.js";

function parseCount(value, label) {
    const count = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(count) || count < 0) throw new AppError("malformed-response", `Invalid ${label}.`);
    return count;
}

export function parseVisitRow(row) {
    if (!row || typeof row !== "object"
        || !/^\d{4}-\d{2}-\d{2}$/.test(row.visit_date)
        || typeof row.recorded !== "boolean") throw new AppError("malformed-response", "Invalid visit result.");
    const dailyVisits = parseCount(row.daily_visits, "daily visit count");
    const totalVisits = parseCount(row.total_visits, "total visit count");
    if (dailyVisits > totalVisits) throw new AppError("malformed-response", "Daily visits exceed total visits.");
    return Object.freeze({
        visitDate: row.visit_date,
        dailyVisits,
        totalVisits,
        recorded: row.recorded
    });
}

export function createAnalytics({ client, getBrowserID }) {
    let visit = null;
    let available = false;
    let loaded = false;
    let loadRequest;

    async function load() {
        if (loaded) return available;
        if (loadRequest) return loadRequest;
        loadRequest = (async () => {
            try {
                const result = await client.rpc("record_glossary_visit", { p_browser_id: getBrowserID() });
                if (!Array.isArray(result) || result.length !== 1) throw new AppError("malformed-response", "Expected one visit result.");
                visit = parseVisitRow(result[0]);
                available = true;
            } catch {
                visit = null;
                available = false;
            } finally {
                loaded = true;
            }
            return available;
        })();
        return loadRequest;
    }

    return Object.freeze({
        get available() { return available; },
        get totalVisits() { return visit?.totalVisits ?? null; },
        get dailyVisits() { return visit?.dailyVisits ?? null; },
        get visitDate() { return visit?.visitDate ?? null; },
        load
    });
}
