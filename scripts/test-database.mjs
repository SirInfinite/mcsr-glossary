import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { databaseChecks } from "../tests/backend/database-checks.mjs";

// This script creates and drops only its own unique disposable database.
// It refuses remote hosts; hosted Supabase verification is a separate release gate.
const connection = process.env.MCSR_TEST_DATABASE_URL;
if (!connection) throw new Error("Set MCSR_TEST_DATABASE_URL to an isolated local PostgreSQL admin connection.");
async function reproduce(withLegacy) {
const url = new URL(connection);
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Database reproduction only runs against loopback.");
const database = `mcsr_integrity_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Client({ connectionString: connection });
await admin.connect();
let client;
try {
    await admin.query(`create database "${database}"`);
    url.pathname = "/" + database;
    client = new pg.Client({ connectionString: url.href });
    await client.connect();
    await client.query(`
        do $$ begin
            if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
            if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
            if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
        end $$;
        create schema extensions;
    `);
    const terms = JSON.parse(await readFile(new URL("../data/terms.json", import.meta.url), "utf8")).terms;
    // Reproduce the historical prototype import as well as a fresh schema.
    const legacy = terms.find(term => term.name === "Any%");
    if (withLegacy) {
        await client.query("create table public.votes(term_id text primary key, upvotes bigint, downvotes bigint)");
        await client.query("insert into public.votes values ($1, 1, 0)", [legacy.id]);
    }
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const files = (await readdir(directory)).filter(file => file.endsWith(".sql")).sort();
    for (const file of files) {
        const sql = await readFile(new URL(file, directory), "utf8");
        if (!sql.trim()) continue;
        try { await client.query(sql); }
        catch (error) { throw new Error(`Migration ${file} failed: ${error.code} ${error.message}`); }
    }
    const result = await databaseChecks(client, url.href, terms, legacy.id, withLegacy ? 1 : 0);
    await mkdir(new URL("../output/structural/final/", import.meta.url), { recursive: true });
    await writeFile(new URL(`../output/structural/final/database-${withLegacy ? "legacy" : "fresh"}.json`, import.meta.url), JSON.stringify({ migrations: files, ...result }, null, 2));
    return { scenario: withLegacy ? "legacy import" : "fresh project", migrations: files.length, ...result };
} finally {
    await client?.end();
    // Names are generated above, never taken from an environment variable.
    assert.match(database, /^mcsr_integrity_[a-f0-9]{32}$/);
    await admin.query(`drop database if exists "${database}" with (force)`);
    await admin.end();
}

}
const results = [await reproduce(false), await reproduce(true)];
console.log(JSON.stringify({ result: "PASS", checks: results.reduce((n, r) => n + r.checks, 0), scenarios: results }));
