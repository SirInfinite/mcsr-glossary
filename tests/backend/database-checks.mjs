import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

export async function databaseChecks(client, connectionString, terms, legacyID, legacyVotes = 0) {
    const checks = [];
    const check = (value, label) => { assert.ok(value, label); checks.push(label); };
    const result = await client.query("select count(*)::int as count from public.glossary_vote_totals");
    check(result.rows[0].count === terms.length, "Every published term has a seeded vote target");
    const tables = await client.query("select tablename, rowsecurity from pg_tables where schemaname = 'public'");
    check(tables.rows.every(row => row.rowsecurity), "All public tables, including retained prototypes, enable RLS");
    for (const role of ["anon", "authenticated"]) {
        const permissions = await client.query(`select tablename from pg_tables where schemaname = 'public' and (
            has_table_privilege($1, quote_ident(schemaname) || '.' || quote_ident(tablename), 'select') or
            has_table_privilege($1, quote_ident(schemaname) || '.' || quote_ident(tablename), 'insert') or
            has_table_privilege($1, quote_ident(schemaname) || '.' || quote_ident(tablename), 'update') or
            has_table_privilege($1, quote_ident(schemaname) || '.' || quote_ident(tablename), 'delete'))`, [role]);
        check(permissions.rowCount === 0, `${role} cannot read or write any application table directly`);
    }
    const definers = await client.query(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('public','private') and p.prosecdef and (n.nspname='public' or not coalesce(p.proconfig @> array['search_path=""'],false))`);
    check(definers.rowCount === 0, "Privileged functions are private with an empty search path");
    const voter = randomUUID();
    const term = terms[0];
    const anon = new pg.Client({ connectionString });
    await anon.connect();
    await anon.query("set role anon");
    try {
        for (const vote of [1, 0, -1, 0, 1, -1, 1, 0]) {
            const { rows: [row] } = await anon.query("select * from public.set_glossary_vote($1,$2,$3::smallint)", [term.id, voter, vote]);
            check(row.current_vote === vote, `Atomic vote target ${vote} is authoritative`);
        }
        const duplicate = await anon.query("select * from public.set_glossary_vote($1,$2,0::smallint)", [term.id, voter]);
        check(duplicate.rows[0].changed === false, "Repeated neutral target is idempotent");
        for (const [id, browser, vote, code] of [[term.id, voter, 2, "22023"], [randomUUID(), voter, 1, "22023"], ["invalid", voter, 1, "22P02"], [term.id, "invalid", 1, "22P02"], [term.id, "00000000-0000-0000-0000-000000000000", 1, "22023"]]) {
            await assert.rejects(anon.query("select * from public.set_glossary_vote($1,$2,$3::smallint)", [id, browser, vote]), { code });
            checks.push(`Invalid vote input rejected (${code})`);
        }
    } finally { await anon.end(); }
    const connection = async () => {
        const actor = new pg.Client({ connectionString });
        await actor.connect();
        await actor.query("set role anon");
        return actor;
    };
    const actors = await Promise.all(Array.from({ length: 6 }, connection));
    try {
        const ids = actors.map(() => randomUUID());
        await Promise.all(actors.map((actor, index) => actor.query("select * from public.set_glossary_vote($1,$2,1::smallint)", [term.id, ids[index]])));
        const total = await client.query("select upvotes,downvotes from public.glossary_vote_totals where term_id=$1", [term.id]);
        check(total.rows[0].upvotes === "6", "Six concurrent clients cannot lose aggregate updates");
        await Promise.all(actors.map((actor, index) => actor.query("select * from public.set_glossary_vote($1,$2,0::smallint)", [term.id, ids[index]])));
        const conflictID = randomUUID();
        await Promise.all(actors.map((actor, index) => actor.query("select * from public.set_glossary_vote($1,$2,$3::smallint)", [term.id, conflictID, index % 2 ? -1 : 1])));
        const { rows: [state] } = await actors[0].query("select * from public.get_glossary_vote_state($1) where term_id=$2", [conflictID, term.id]);
        check(Number(state.upvotes) + Number(state.downvotes) === 1, "Conflicting requests from one voter leave exactly one receipt");
        await actors[0].query("select * from public.set_glossary_vote($1,$2,0::smallint)", [term.id, conflictID]);

        const proposed = randomUUID();
        const proposalSQL = "select * from public.submit_glossary_term($1,$2,$3,$4::text[],$5::text[],$6,$7)";
        const good = [proposed, "Integrity QA proposal", "technique", ["QA alias"], ["qa-check"], "A disposable proposal used to verify the complete moderation contract.", ""];
        const proposal = await actors[0].query(proposalSQL, good);
        check(proposal.rows[0].submission_status === "pending", "New proposals are pending and private");
        const record = (await client.query("select kind,term_id,submitter_hash from public.glossary_submissions where id=$1", [proposal.rows[0].submission_id])).rows[0];
        check(record.kind === "new" && record.term_id === null && record.submitter_hash.length === 32, "New proposal kind and hashed identity are explicit");
        await assert.rejects(actors[0].query(proposalSQL, good), { code: "23505" });
        checks.push("Duplicate pending proposals are rejected without a duplicate row");
        const malformed = [
            [1, "x"], [1, "x".repeat(101)], [2, "not-a-category"], [3, ["x".repeat(81)]], [3, ["Same", "same"]],
            [3, [null]], [3, Array(11).fill("alias")], [4, ["bad tag!"]], [4, ["same", "same"]],
            [4, Array(13).fill("tag")], [5, "short"], [5, "x".repeat(5001)], [6, "spam"]
        ];
        for (const [index, value] of malformed) {
            const input = [...good]; input[0] = randomUUID(); input[index] = value;
            await assert.rejects(actors[0].query(proposalSQL, input), { code: "22023" });
            checks.push(`Malformed proposal field ${index} is rejected`);
        }
        const sameBrowser = randomUUID();
        const conflicts = await Promise.allSettled(actors.slice(0, 2).map((actor, index) => actor.query(proposalSQL, [sameBrowser, `Concurrent proposal ${index}`, ...good.slice(2)])));
        check(conflicts.filter(result => result.status === "fulfilled").length === 1, "Submission cooldown checks cannot be raced");
        const correction = await actors[0].query("select * from public.submit_glossary_correction($1,$2,$3,$4)", [randomUUID(), term.id, good[5], ""]);
        const correctionRow = (await client.query("select kind,term_id,name,category from public.glossary_submissions where id=$1", [correction.rows[0].submission_id])).rows[0];
        check(correctionRow.kind === "correction" && correctionRow.term_id === term.id && correctionRow.name === term.name && correctionRow.category === term.category, "Corrections use authoritative target identity and an explicit queue kind");
        await assert.rejects(actors[0].query("select * from public.submit_glossary_correction($1,$2,$3,$4)", [randomUUID(), randomUUID(), good[5], ""]), { code: "22023" });
        checks.push("Unknown correction targets are rejected");
        const legacyCorrection = await actors[0].query(proposalSQL, [randomUUID(), term.name, term.category, [], ["correction"], good[5], ""]);
        check((await client.query("select kind from public.glossary_submissions where id=$1", [legacyCorrection.rows[0].submission_id])).rows[0].kind === "correction", "Released correction clients are classified explicitly by the compatibility wrapper");
        const reportSQL = "select * from public.submit_glossary_term_report($1,$2,$3,$4,$5,$6)";
        const report = [randomUUID(), term.id, term.name, "other", "Disposable database QA details.", ""];
        const firstReport = await actors[0].query(reportSQL, report);
        const sameReport = await actors[0].query(reportSQL, report);
        check(firstReport.rows[0].created && !sameReport.rows[0].created && firstReport.rows[0].report_id === sameReport.rows[0].report_id, "Report duplicate suppression is idempotent");
        for (const [index, value] of [[1, randomUUID()], [2, "Spoofed name"], [3, "invalid"], [4, ""], [4, "tiny"], [4, "x".repeat(2001)], [5, "spam"]]) {
            const input = [...report]; input[0] = randomUUID(); input[index] = value;
            await assert.rejects(actors[0].query(reportSQL, input), { code: "22023" });
            checks.push(`Malformed report field ${index} is rejected`);
        }
        for (const table of ["glossary_vote_totals", "glossary_vote_receipts", "glossary_submissions", "glossary_term_reports"]) {
            for (const sql of [`select * from public.${table}`, `delete from public.${table}`, `update public.${table} set ${table === "glossary_vote_receipts" ? "direction=direction" : table === "glossary_vote_totals" ? "upvotes=upvotes" : "status=status"}`, `insert into public.${table} default values`]) {
                await assert.rejects(actors[0].query(sql), { code: "42501" });
                checks.push(`Anonymous ${sql.split(" ")[0]} denied on ${table}`);
            }
        }
        await assert.rejects(actors[0].query("select * from private.insert_glossary_proposal($1,$2,$3,$4::text[],$5::text[],$6,$7)", good), { code: "42501" });
        checks.push("Anonymous callers cannot bypass the validated moderation wrappers");
    } finally { await Promise.all(actors.map(actor => actor.end())); }
    await assert.rejects(client.query("update public.glossary_vote_totals set upvotes=upvotes+1 where term_id=$1", [term.id]), { code: "23514" });
    checks.push("Deferred integrity constraint rejects corrupted aggregate maintenance writes");
    await assert.rejects(client.query("insert into public.glossary_vote_receipts(term_id,voter_hash,direction) values ($1,extensions.digest($2,'sha256'),'up')", [term.id, randomUUID()]), { code: "23514" });
    checks.push("Deferred integrity constraint rejects orphaned receipt increments");
    const mismatches = await client.query(`select t.term_id from public.glossary_vote_totals t where
        t.upvotes <> t.legacy_upvotes + (select count(*) from public.glossary_vote_receipts r where r.term_id=t.term_id and direction='up')
        or t.downvotes <> t.legacy_downvotes + (select count(*) from public.glossary_vote_receipts r where r.term_id=t.term_id and direction='down')`);
    check(mismatches.rowCount === 0, "All aggregates reconcile with receipts and preserved legacy baselines");
    const targets = (await client.query("select term_id,term_name,term_category from public.glossary_vote_totals")).rows;
    check(terms.every(term => targets.some(target => target.term_id === term.id && target.term_name === term.name && target.term_category === term.category)), "Migration-backed target metadata matches the canonical static dataset");
    await client.query("delete from public.glossary_submissions");
    await client.query("delete from public.glossary_term_reports");
    check((await client.query("select count(*)::int as count from public.glossary_vote_receipts")).rows[0].count === 0, "All disposable voting QA receipts are removed");
    check((await client.query("select upvotes from public.glossary_vote_totals where term_id=$1", [legacyID])).rows[0].upvotes === String(legacyVotes), "Legacy baseline matches the reproduction scenario");
    return { result: "PASS", checks: checks.length, passed: checks };
}
