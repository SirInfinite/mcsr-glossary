import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { createSupabaseClient } from "../js/backend/client.js";
assert.ok(process.argv.includes("--write-qa"),"Explicit --write-qa is required.");
const out=new URL("../output/release-repair/",import.meta.url);
const manifest=JSON.parse(await readFile(new URL("qa-manifest.json",out),"utf8"));
assert.equal(manifest.project,"olmazjfubvpgtpoxlxzy");
assert.equal(manifest.result,"PASS","Run the hosted RPC tests and authenticated inspection first.");
manifest.cleanupRequired=true;
const save=()=>writeFile(new URL("qa-manifest.json",out),JSON.stringify(manifest,null,2));
const terms=JSON.parse(await readFile(new URL("../data/terms.json",import.meta.url),"utf8")).terms;
const client=createSupabaseClient();
const checks=[],errors=[],requests=[];
const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
const browser=await chromium.launch({headless:true,channel:"chrome"});
const server=await serve({port:0});
const base="http://127.0.0.1:"+server.address().port+"/mcsr-glossary/";
await mkdir(new URL("hosted-browser/",out),{recursive:true});
let failed;
try{
 const voter=randomUUID();manifest.voters.push(voter);await save();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(id=>localStorage.setItem("mcsr_browser_id",id),voter);
 const page=await context.newPage();
 page.on("pageerror",e=>errors.push(e.message));
 page.on("request",r=>{if(r.url().includes("/rest/v1/rpc/"))requests.push({rpc:r.url().split("/").at(-1),body:r.postDataJSON()});});
 for(const term of terms){
  await page.goto(base+"?t="+term.id);
  await page.waitForFunction(name=>document.querySelector("#page-term h1")?.textContent===name,term.name);
  await page.waitForFunction(()=>document.querySelector("#vote-up")?.disabled===false);
  check(!(await page.locator("#vote-down").isDisabled()),"Hosted browser voting available: "+term.name);
 }
 await page.goto(base+"?t=axis-calculated");
 await page.waitForFunction(()=>document.querySelector("#vote-up")?.disabled===false);
 for(const [button,target] of [["up",1],["up",0],["down",-1],["down",0],["up",1],["down",-1],["up",1],["up",0]]){
  await page.locator("#vote-"+button).click();
  await page.waitForFunction(()=>document.querySelector("#vote-up")?.disabled===false);
  check(await page.locator("#vote-up").getAttribute("aria-pressed")===String(target===1)&&await page.locator("#vote-down").getAttribute("aria-pressed")===String(target===-1),"Hosted browser vote transition to "+target);
 }
 await page.screenshot({path:new URL("hosted-browser/repaired-axis-phone.png",out).pathname.slice(1)});
 await context.close();
 for(const mode of ["new","correction","report"]){
  const id=randomUUID();manifest.browsers.push(id);await save();
  const c=await browser.newContext({viewport:{width:mode==="new"?1440:390,height:mode==="new"?900:844}});
  await c.addInitScript(id=>localStorage.setItem("mcsr_browser_id",id),id);
  const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));
  await p.goto(base+(mode==="new"?"":"?t=axis-calculated"));
  await p.locator(mode==="new"?"#submit-trigger":mode==="correction"?"#suggest-edit-btn":"#report-term-btn").click();
  if(mode==="new"){
   await p.locator("#sub-name").fill(manifest.marker+" browser");
   await p.locator("#sub-category").selectOption("technique");
  }
  const field=mode==="report"?"#report-details":"#sub-definition";
  const status=mode==="report"?"#report-status":"#sub-status";
  if(mode==="report")await p.locator("#report-reason").selectOption("other");
  await p.locator(field).fill(manifest.marker+": "+mode+" sent by the actual browser form. Manual QA, remove after verification.");
  const expected=mode==="report"?"submit_glossary_term_report":mode==="correction"?"submit_glossary_correction":"submit_glossary_term";
  const pending=p.waitForResponse(r=>r.url().endsWith("/rpc/"+expected)&&r.request().method()==="POST");
  await p.locator(mode==="report"?"#report-submit":"#sub-submit").click();
  const response=await pending;
  const body=response.request().postDataJSON();
  const rows=await response.json();
  check(response.status()===200&&rows.length===1,mode+" form reaches the actual hosted RPC");
  manifest.receipts.push({rpc:expected,body,receipt:rows[0]});await save();
  await p.locator(status).waitFor();
  check(/submitted|successfully|sent/i.test(await p.locator(status).innerText()),mode+" form acknowledges hosted pending receipt");
  if(mode==="correction")check(body.p_term_id===terms.find(t=>t.name==="Axis Calculated").id&&!Object.hasOwn(body,"p_name"),"Browser edit sends structured canonical target only");
  if(mode==="report")check(body.p_term_id===terms.find(t=>t.name==="Axis Calculated").id&&body.p_term_name==="Axis Calculated","Browser report preserves canonical target/name");
  await p.screenshot({path:new URL("hosted-browser/"+mode+"-pending.png",out).pathname.slice(1)});
  await c.close();
 }
 check(errors.length===0,"Hosted UI has zero application exceptions");
 manifest.browserResult="PASS";
}catch(error){failed=error;manifest.browserResult="FAIL";}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
 await save();
 await writeFile(new URL("hosted-browser/result.json",out),JSON.stringify({result:manifest.browserResult,checks:checks.length,passed:checks,errors,requests,failure:failed?.message},null,2));
 console.log(JSON.stringify({result:manifest.browserResult,checks:checks.length,errors,failure:failed?.message}));
}
if(failed)throw failed;
