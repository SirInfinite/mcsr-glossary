import assert from "node:assert/strict";
import test from "node:test";
import { inspectText } from "../../scripts/scan-secrets.mjs";

const connection = (host, password = "fixture") => ["postgresql://tester", password].join(":") + "@" + host + "/postgres";

test("the secret scan exempts only exact loopback database fixtures", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "localhost:5432"]) {
        assert.deepEqual(inspectText(connection(host), "fixture"), []);
    }
    for (const host of ["localhost.example.org", "127.0.0.1.example.org", "db.example.org"]) {
        assert.equal(inspectText(connection(host, "pw"), "fixture")[0]?.type, "Database password URL");
    }
});

test("secret findings contain only type and location, never credential text", () => {
    const token = "gh" + "p_" + "x".repeat(36);
    const source = `<config>${token}</config>`;
    const findings = inspectText(source, "settings.conf");
    assert.deepEqual(findings, [{ type: "GitHub token", location: "settings.conf" }]);
    assert.ok(!JSON.stringify(findings).includes(token));
});

test("service role JWTs are rejected while public anon keys remain allowed", () => {
    const jwt = role => [JSON.stringify({ alg: "HS256" }), JSON.stringify({ role }), "signature"]
        .map(value => Buffer.from(value).toString("base64url")).join(".");
    assert.deepEqual(inspectText(jwt("anon"), "fixture"), []);
    assert.equal(inspectText(jwt("service_role"), "fixture")[0]?.type, "Service-role JWT");
});
