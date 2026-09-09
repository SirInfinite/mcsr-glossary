import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../js/core/http.js";
import { createAnalytics, parseVisitRow } from "../../js/backend/analytics.js";

const row = {
    visit_date: "2026-09-09",
    daily_visits: "12",
    total_visits: 345,
    recorded: true
};

test("visit responses normalize safe database counts", () => {
    assert.deepEqual(parseVisitRow(row), {
        visitDate: "2026-09-09",
        dailyVisits: 12,
        totalVisits: 345,
        recorded: true
    });
});

test("visit responses reject malformed or contradictory values", () => {
    for (const value of [
        null,
        { ...row, visit_date: "09/09/2026" },
        { ...row, daily_visits: -1 },
        { ...row, total_visits: 1 },
        { ...row, recorded: "true" }
    ]) assert.throws(() => parseVisitRow(value), AppError);
});

test("analytics records once per page lifetime and exposes the confirmed total", async () => {
    let calls = 0;
    const analytics = createAnalytics({
        getBrowserID: () => "10000000-0000-4000-8000-000000000001",
        client: {
            rpc: async (name, body) => {
                calls += 1;
                assert.equal(name, "record_glossary_visit");
                assert.deepEqual(body, { p_browser_id: "10000000-0000-4000-8000-000000000001" });
                return [row];
            }
        }
    });

    assert.equal(analytics.totalVisits, null);
    assert.equal(await analytics.load(), true);
    assert.equal(await analytics.load(), true);
    assert.equal(calls, 1);
    assert.equal(analytics.available, true);
    assert.equal(analytics.dailyVisits, 12);
    assert.equal(analytics.totalVisits, 345);
});

test("analytics failures remain optional and expose no guessed count", async () => {
    const analytics = createAnalytics({
        getBrowserID: () => "10000000-0000-4000-8000-000000000001",
        client: { rpc: async () => { throw new AppError("unavailable", "offline"); } }
    });
    assert.equal(await analytics.load(), false);
    assert.equal(analytics.available, false);
    assert.equal(analytics.totalVisits, null);
});
