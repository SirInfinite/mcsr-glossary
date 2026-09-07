import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createSupabaseClient } from "../js/backend/client.js";
import { createContributions } from "../js/backend/contributions.js";
import { createVoting } from "../js/backend/voting.js";
import { APP_CONFIG } from "../js/config.js";

// Run only after authenticated management inspection and with a management
// cleanup session available. This deliberately exercises the real public RPCs.
// The manifest is written before requests, including identities for uncertain
// writes. Moderation cleanup/row inspection must then use authenticated MCP.
assert.ok(process.argv.includes("--write-qa"), "Explicit --write-qa is required for hosted release tests.");
assert.equal(new URL(APP_CONFIG.supabaseUrl).hostname, "olmazjfubvpgtpoxlxzy.supabase.co");
const out = new URL("../output/release-repair/", import.meta.url);
await mkdir(out, { recursive: true });
try {
    const previous = JSON.parse(await readFile(new URL("qa-manifest.json", out), "utf8"));
    assert.equal(previous.cleanupRequired, false, "Finish authenticated cleanup of the previous QA manifest before starting another run.");
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}
const terms = JSON.parse(await readFile(new URL("../data/terms.json", import.meta.url), "utf8")).terms;
const seedFile = (await readdir(new URL("../supabase/migrations/", import.meta.url))).find(f=>f.endsWith("_seed_researched_term_vote_totals.sql"));
const seed = await readFile(new URL("../supabase/migrations/"+seedFile, import.meta.url), "utf8");
const repaired = terms.filter(t=>seed.includes(t.id));
assert.equal(repaired.length,20);
const existing = ["Any%", "Bastion", "Ninjabrain Bot", "One Cycle", "RSG"].map(name=>terms.find(t=>t.name===name));
assert.ok(existing.every(Boolean));
const runID = randomUUID();
const marker = "MCSR release QA "+runID;
const client = createSupabaseClient();
const manifest = { project:"olmazjfubvpgtpoxlxzy", runID, marker, startedAt:new Date().toISOString(), voters:[randomUUID(),randomUUID(),randomUUID()], browsers:[], receipts:[], touchedTerms:[...existing,...repaired].map(t=>t.id), checks:[], failures:[], cleanupRequired:true };
const save = () => writeFile(new URL("qa-manifest.json",out),JSON.stringify(manifest,null,2));
const check = (condition,label) => {assert.ok(condition,label);manifest.checks.push(label);};
const browser = async () => {const id=randomUUID();manifest.browsers.push(id);await save();return id;};
const rpc = (name,body) => client.rpc(name,body);
const state = async id => new Map((await rpc("get_glossary_vote_state",{p_browser_id:id})).map(r=>[r.term_id,r]));
const vote = async (term,id,target) => (await rpc("set_glossary_vote",{p_term_id:term,p_browser_id:id,p_vote:target}))[0];
async function rejected(name,body,code,label) {
 await assert.rejects(rpc(name,body),e=>e.code===code,label);
 manifest.checks.push(label);
}
async function accept(name,body,label) {
 const rows = await rpc(name,body);
 check(Array.isArray(rows)&&rows.length===1,label+" returns exactly one receipt");
 const row=rows[0];
 check((row.submission_status??row.report_status)==="pending",label+" remains pending");
 manifest.receipts.push({rpc:name,body,receipt:row});
 await save();
 return row;
}
await save();
try {
 const initial=await state(manifest.voters[0]);
 check(terms.length===100 && terms.every(t=>initial.has(t.id)),"100/100 canonical UUIDs resolve through the normal vote-state RPC");
 const voting=createVoting({client,getBrowserID:()=>manifest.voters[0],terms,config:{...APP_CONFIG,trendingEnabled:true}});
 check(await voting.load(),"The application voting controller loads the hosted state");
 check(terms.every(t=>voting.canVote(t.id)),"No published term silently disables voting");
 check(await voting.loadTrending(),"The restored trending response passes the application boundary");
 for(const term of [...existing,...repaired]) {
  const baseline=initial.get(term.id);
  for(const target of [1,0,-1,0,1,-1,1,0]) {
   const row=await vote(term.id,manifest.voters[0],target);
   check(row.changed===true&&row.current_vote===target&&Number(row.upvotes)===Number(baseline.upvotes)+(target===1?1:0)&&Number(row.downvotes)===Number(baseline.downvotes)+(target===-1?1:0),term.name+": authoritative transition to "+target);
   const again=await vote(term.id,manifest.voters[0],target);
   check(again.changed===false&&again.current_vote===target,term.name+": repeated target "+target+" is a no-op");
  }
 }
 const term=repaired[0];
 const baseline=initial.get(term.id);
 const multi=await Promise.all(manifest.voters.slice(0,2).map(id=>vote(term.id,id,1)));
 check(multi.every(r=>r.current_vote===1),"Concurrent independent clients both retain their votes");
 let observed=(await state(manifest.voters[2])).get(term.id);
 check(Number(observed.upvotes)===Number(baseline.upvotes)+2,"Concurrent independent increments are not lost");
 const trending=await rpc("get_glossary_trending_terms",{});
 check(trending.some(r=>r.term_id===term.id&&Number(r.recent_upvotes)===2&&Number(r.recent_downvotes)===0),"Trending includes newly repaired positive activity");
 await Promise.all(manifest.voters.slice(0,2).map(id=>vote(term.id,id,0)));
 await Promise.all([1,-1,1,-1,1,-1].map(target=>vote(term.id,manifest.voters[2],target)));
 observed=(await state(manifest.voters[2])).get(term.id);
 check([-1,1].includes(observed.current_vote)&&Number(observed.upvotes)===Number(baseline.upvotes)+(observed.current_vote===1?1:0)&&Number(observed.downvotes)===Number(baseline.downvotes)+(observed.current_vote===-1?1:0),"Six rapid conflicting writes leave exactly one authoritative vote");
 await vote(term.id,manifest.voters[2],0);
 for(const [field,value,code] of [["p_vote",2,"22023"],["p_vote",null,"22023"],["p_vote","bad","22P02"],["p_term_id",randomUUID(),"22023"],["p_term_id","invalid","22P02"],["p_browser_id","00000000-0000-0000-0000-000000000000","22023"]]) {
  await rejected("set_glossary_vote",{p_term_id:term.id,p_browser_id:manifest.voters[0],p_vote:1,[field]:value},code,"Malformed/unknown vote rejected: "+field+"="+value);
 }
 const rollback=(await state(manifest.voters[0])).get(term.id);
 check(rollback.current_vote===0&&Number(rollback.upvotes)===Number(baseline.upvotes)&&Number(rollback.downvotes)===Number(baseline.downvotes),"Rejected hosted vote requests leave receipts/totals unchanged");
 const a=await browser();
 const proposal={p_browser_id:a,p_name:marker,p_category:"technique",p_aliases:["Release QA alias"],p_tags:["release-qa"],p_definition:marker+": disposable validation record. Remove after the authenticated release check.",p_website:""};
 await accept("submit_glossary_term",proposal,"Valid new term");
 await rejected("submit_glossary_term",proposal,"23505","Duplicate new term is rejected without a duplicate row");
 await rejected("submit_glossary_term",{...proposal,p_name:marker+" cooldown"},"P0001","New-term cooldown is enforced");
 for(const [field,value] of [["p_name","x"],["p_category","invalid"],["p_aliases",["duplicate","DUPLICATE"]],["p_tags",["bad tag!"]],["p_definition","tiny"],["p_website","bot"]]) await rejected("submit_glossary_term",{...proposal,p_browser_id:await browser(),[field]:value},"22023","Invalid new-term "+field+" rejected");
 const concurrent=await browser();
 const proposals=await Promise.allSettled([0,1].map(i=>accept("submit_glossary_term",{...proposal,p_browser_id:concurrent,p_name:marker+" race "+i},"Concurrent new term")));
 check(proposals.filter(r=>r.status==="fulfilled").length===1 && proposals.some(r=>r.status==="rejected"&&r.reason.code==="P0001"),"Concurrent proposal cooldown permits only one insertion");
 const correction={p_browser_id:await browser(),p_term_id:repaired[1].id,p_definition:marker+": structured correction for "+repaired[1].name+". Manual review only.",p_website:""};
 await accept("submit_glossary_correction",correction,"Valid structured edit");
 await rejected("submit_glossary_correction",correction,"23505","Duplicate structured edit is rejected");
 for(const [field,value,code] of [["p_term_id",randomUUID(),"22023"],["p_term_id","invalid","22P02"],["p_definition","tiny","22023"],["p_website","bot","22023"]]) await rejected("submit_glossary_correction",{...correction,p_browser_id:await browser(),[field]:value},code,"Invalid structured edit "+field+" rejected");
 await accept("submit_glossary_term",{...proposal,p_browser_id:await browser(),p_name:existing[1].name,p_category:existing[1].category,p_aliases:[],p_tags:["correction"]},"Released edit compatibility path");
 const report={p_browser_id:await browser(),p_term_id:repaired[2].id,p_term_name:repaired[2].name,p_reason:"other",p_details:marker+": disposable report details for hosted validation.",p_website:""};
 const first=await accept("submit_glossary_term_report",report,"Valid report");
 const repeat=await rpc("submit_glossary_term_report",report);
 check(first.created&&repeat[0].created===false&&repeat[0].report_id===first.report_id,"Duplicate report returns the same pending ID without creating a row");
 await rejected("submit_glossary_term_report",{...report,p_term_id:repaired[3].id,p_term_name:repaired[3].name},"P0001","Report cooldown is enforced");
 for(const [field,value] of [["p_term_id",randomUUID()],["p_term_name","Spoofed target"],["p_reason","invalid"],["p_details","tiny"],["p_details",""],["p_website","bot"]]) await rejected("submit_glossary_term_report",{...report,p_browser_id:await browser(),[field]:value},"22023","Invalid report "+field+" rejected");
 const tracedClient={rpc:async(name,body)=>{const rows=await rpc(name,body);manifest.receipts.push({rpc:name,body,receipt:rows[0]});await save();return rows;}};
 for(const mode of ["new","correction","report"]) {
  const id=await browser();
  const contributions=createContributions({client:tracedClient,getBrowserID:()=>id,terms,config:{...APP_CONFIG,structuredCorrectionsEnabled:true}});
  const target=repaired[4];
  const result=mode==="report"?await contributions.submitReport({termId:target.id,termName:target.name,reason:"inaccurate",details:marker+": application service report."}):await contributions.submitTerm({kind:mode,termId:mode==="correction"?target.id:null,name:mode==="correction"?target.name:marker+" service",category:mode==="correction"?target.category:"technique",aliases:"",tags:"release-qa",definition:marker+": application service proposal requiring manual review."});
  check(result.ok&&result.sent,"Actual contributions service confirms hosted "+mode);
 }
 manifest.result="PASS";
} catch(error) {
 manifest.result="FAIL";manifest.failures.push({message:error.message,code:error.code});
 process.exitCode=1;
} finally {
 // Remove only this run's votes through the same public neutral operation.
 const cleanup=await Promise.allSettled(manifest.touchedTerms.flatMap(term=>manifest.voters.map(id=>vote(term,id,0))));
 check(cleanup.every(r=>r.status==="fulfilled"),"All QA neutral-vote cleanup calls succeeded");
 for(const id of manifest.voters) check([...(await state(id)).values()].every(r=>r.current_vote===0),"QA voter "+id+" has no current receipts");
 manifest.finishedAt=new Date().toISOString();
 await save();
 console.log(JSON.stringify({result:manifest.result,checks:manifest.checks.length,failures:manifest.failures,termsExercised:manifest.touchedTerms.length,repairedTerms:repaired.length,moderationReceipts:manifest.receipts.length,manifest:"output/release-repair/qa-manifest.json",moderationCleanup:"REQUIRES AUTHENTICATED INSPECTION AND TARGETED DELETION"},null,2));
}
