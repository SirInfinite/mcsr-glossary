import test from "node:test";
import assert from "node:assert/strict";
import { request, AppError } from "../../js/core/http.js";
import { assessConfiguration, createSupabaseClient } from "../../js/backend/client.js";
import { APP_CONFIG } from "../../js/config.js";

test("the request deadline includes a response body that never finishes", async () => {
    await assert.rejects(request("https://example.invalid", { timeoutMs: 15, fetchImpl: async () => ({ ok: true, text: () => new Promise(() => {}) }) }), { kind: "timeout" });
});
test("aborting an in-flight request produces a distinct cancellation", async () => {
    const abort = new AbortController();
    const pending = request("https://example.invalid", { signal: abort.signal, fetchImpl: () => new Promise(() => {}) });
    abort.abort();
    await assert.rejects(pending, { kind: "aborted" });
});
for (const [label, fetchImpl, kind] of [
    ["network failure", async () => { throw new TypeError("offline"); }, "network"],
    ["non-JSON success", async () => new Response("not JSON"), "malformed-response"],
    ["service outage", async () => new Response("unavailable", { status: 503 }), "unavailable"],
    ["backend rejection", async () => new Response('{"code":"22023"}', { status: 400 }), "rejected"]
]) test(label + " retains its error category", async () => assert.rejects(request("https://example.invalid", { fetchImpl }), { kind }));
test("successful JSON and text have explicit parsing modes", async () => {
    assert.deepEqual(await request("unused", { fetchImpl: async () => new Response('{"ok":true}') }), { ok: true });
    assert.equal(await request("unused", { format: "text", fetchImpl: async () => new Response("# Notes") }), "# Notes");
});
test("only publishable or anon credentials can configure a public client", () => {
    const jwt = role => ["header", btoa(JSON.stringify({ role })), "signature"].join(".");
    for (const key of ["", "sb_" + "secret_test_fixture", jwt("service_role"), jwt("authenticated"), "invalid"]) assert.ok(assessConfiguration({ ...APP_CONFIG, supabasePublishableKey: key }).error);
    assert.equal(assessConfiguration(APP_CONFIG).error, "");
    assert.equal(assessConfiguration({ ...APP_CONFIG, supabasePublishableKey: jwt("anon") }).error, "");
});
test("configuration rejects credentialed, insecure remote, and path-bearing API URLs", () => {
    for (const value of ["http://example.com", "https://name:pass@example.com", "https://example.com/path", "https://example.com/?api=1", "javascript:alert(1)"]) assert.ok(assessConfiguration({ ...APP_CONFIG, supabaseUrl: value }).error);
    assert.equal(assessConfiguration({ ...APP_CONFIG, supabaseUrl: "http://127.0.0.1:54321" }).error, "");
});
test("RPC mutations are issued once with explicit method and payload", async () => {
    let calls = 0;
    const client = createSupabaseClient(APP_CONFIG, async (url, options) => {
        calls++;
        assert.ok(url.endsWith("/rest/v1/rpc/set_glossary_vote"));
        assert.equal(options.method, "POST");
        assert.deepEqual(JSON.parse(options.body), { p_vote: 1 });
        throw new AppError("timeout", "test");
    });
    await assert.rejects(client.rpc("set_glossary_vote", { p_vote: 1 }), { kind: "timeout" });
    assert.equal(calls, 1);
});
