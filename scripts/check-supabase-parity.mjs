import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

// Inputs must be fresh authenticated MCP snapshots, never anonymous API probes.
// This script performs no remote operations; only its own loopback database is
// created/dropped. Supabase platform objects and locked-down prototype tables
// are classified separately from the application schema.
const [catalogPath, migrationPath] = process.argv.slice(2);
assert.ok(catalogPath && migrationPath, "Provide authenticated catalog JSON and migration-list JSON paths.");
const hosted = JSON.parse(await readFile(catalogPath, "utf8"));
const history = JSON.parse(await readFile(migrationPath, "utf8")).migrations;
const connection = process.env.MCSR_TEST_DATABASE_URL;
assert.ok(connection, "Set the isolated local MCSR_TEST_DATABASE_URL.");
const localURL = new URL(connection);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(localURL.hostname), "Only a loopback replay is permitted.");
const root = new URL("../", import.meta.url);
const files = (await readdir(new URL("supabase/migrations/", root))).filter(f => f.endsWith(".sql")).sort();
assert.deepEqual(history, files.map(f => ({ version: f.slice(0, 14), name: f.slice(15, -4) })), "Migration versions and names must match exactly.");
const terms = JSON.parse(await readFile(new URL("data/terms.json", root), "utf8")).terms;
const snapshotSQL = await readFile(new URL("supabase/audit.sql", root), "utf8");
const database = "mcsr_integrity_" + randomUUID().replaceAll("-", "");
const admin = new pg.Client({ connectionString: connection });
await admin.connect();
let client;
const checks = [];
const normalize = value => JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item !== "string") return item;
    const text = item.replaceAll("\r\n", "\n").trim();
    return key === "acl" ? text.slice(1, -1).split(",").sort().join(",") : text;
}));
const application = row => !["votes", "submissions", "rls_auto_enable"].includes(row.table ?? row.tablename ?? row.function ?? row.name);
try {
    await admin.query('create database "' + database + '"');
    localURL.pathname = "/" + database;
    client = new pg.Client({ connectionString: localURL.href });
    await client.connect();
    await client.query(`
        do $$ begin
            if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
            if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
            if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
        end $$;
        create schema extensions;
    `);
    for (const file of files) {
        const sql = await readFile(new URL("supabase/migrations/" + file, root), "utf8");
        await client.query(sql);
        if (file.endsWith("_seed_researched_term_vote_totals.sql")) {
            const voter = randomUUID();
            const term = terms.find(t => t.name === "Any%");
            await client.query("select * from public.set_glossary_vote($1,$2,1::smallint)", [term.id, voter]);
            const totals = (await client.query("select * from public.glossary_vote_totals order by term_id")).rows;
            const receipts = (await client.query("select * from public.glossary_vote_receipts order by term_id,voter_hash")).rows;
            await client.query(sql);
            assert.deepEqual((await client.query("select * from public.glossary_vote_totals order by term_id")).rows, totals);
            assert.deepEqual((await client.query("select * from public.glossary_vote_receipts order by term_id,voter_hash")).rows, receipts);
            await client.query("select * from public.set_glossary_vote($1,$2,0::smallint)", [term.id, voter]);
            checks.push("Seed replay preserves existing nonzero totals and receipts");
        }
    }
    const expected = (await client.query(snapshotSQL)).rows[0].catalog;
    for (const section of ["tables", "functions", "policies", "indexes", "constraints", "column_contract", "role_table_access", "role_function_access", "triggers"]) {
        assert.deepEqual(normalize(hosted[section].filter(application)), normalize(expected[section].filter(application)), "Effective schema mismatch: " + section);
        checks.push(section + ": exact application contract match");
    }
    assert.deepEqual(normalize(hosted.schemas.filter(s => s.name === "private")), normalize(expected.schemas.filter(s => s.name === "private")), "Private namespace grants match.");
    checks.push("Private schema usage grants match");
    for (const table of hosted.tables) assert.equal(table.rls, true, table.name + " must enable RLS.");
    for (const access of hosted.role_table_access) assert.ok(!access.select && !access.insert && !access.update && !access.delete, "Unexpected direct public-role access.");
    checks.push("Every hosted public table, including prototypes, enables RLS and denies both public roles");
    const helper = hosted.functions.find(f => f.name === "rls_auto_enable");
    if (helper) {
        assert.equal(helper.schema, "public");
        assert.equal(helper.acl, "{postgres=X/postgres}");
        assert.deepEqual(helper.settings, ["search_path=pg_catalog"]);
        checks.push("Existing managed automatic-RLS helper has no public execute grant");
    }
    assert.equal(hosted.vote_targets.length, terms.length);
    for (const term of terms) assert.ok(hosted.vote_targets.some(t => t.term_id === term.id && t.term_name === term.name && t.term_category === term.category), term.name + " target metadata must match canonical content.");
    checks.push("Every canonical UUID/name/category matches the hosted target registry");
    console.log(JSON.stringify({ result: "PASS", migrations: files.length, publishedCoverage: terms.length, checks: checks.length, passed: checks,
        classifiedRemoteOnly: ["Locked-down votes/submissions prototypes", "Revoked rls_auto_enable platform helper; managed platform schemas/defaults/event triggers"] }, null, 2));
} finally {
    await client?.end();
    assert.match(database, /^mcsr_integrity_[a-f0-9]{32}$/);
    await admin.query('drop database if exists "' + database + '" with (force)');
    await admin.end();
}
