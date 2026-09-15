const { chromium } = require('playwright');
const O='file://'+__dirname+'/../preview/back-office.html';
const MOCK=`(function(){const docs=new Map(),subs=[];
function fire(){const s={docs:[...docs.entries()].map(([id,d])=>({id,exists:true,data:()=>d}))};subs.forEach(f=>{try{f(s)}catch(e){}});}
const coll=()=>({doc:id=>({set:async d=>{docs.set(id,d);fire();},update:async f=>{docs.set(id,Object.assign({},docs.get(id)||{},f));fire();},delete:async()=>{docs.delete(id);fire();},get:async()=>({exists:docs.has(id),data:()=>docs.get(id)})}),onSnapshot:n=>{subs.push(n);setTimeout(fire,0);return()=>{}}});
window.claude={use:async n=>n==="db"?{collection:coll,doc:()=>({})}:n==="sample"?(async()=>({text:"ok"}))():n==="downloads"?{save:async()=>{}}:null};})();`;
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.addInitScript(MOCK);
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(O,{timeout:20000}).catch(()=>{}); await p.waitForTimeout(500);
 console.log('registre :', await p.textContent('#db-state'));
 await p.click('.tabs button[data-tab="orders"]');
 const cases=[
  ["AURA — READY-2 Night · 80€\nDéjà prêt.\nTotal : 80€","Night 80€ (déjà prêt)"],
  ["AURA — READY-4 House · 200€\nDéjà prêt.\nTotal : 200€","House 200€ (déjà prêt)"],
  ["Bonjour, je souhaite le n°2 Signature à 90€.\nTotal : 90€\nJe vends : pizzeria\nMon Instagram : @bella\nRecommandé par : AURA-4021","Signature 90€ (brief, parrainé)"]
 ];
 for(const [msg,label] of cases){
   await p.fill('#paste',msg); await p.click('#parse-btn'); await p.waitForTimeout(200);
   await p.click('#save-order'); await p.waitForTimeout(300);
   console.log('  enregistré :', label);
 }
 const n=await p.locator('#order-list .order').count();
 console.log('commandes au registre :', n);
 // livrer les trois
 for(let i=0;i<n;i++){ const ids=await p.evaluate(()=>[...document.querySelectorAll("#order-list .order")].map(e=>e.dataset.id)); await p.locator(`#order-list .order[data-id="${ids[i]}"] [data-set="livre"]`).click(); await p.waitForTimeout(280); }
 await p.click('.tabs button[data-tab="board"]'); await p.waitForTimeout(400);
 const tiles=await p.locator('#tiles .tile .k').allTextContents();
 console.log('tuiles :', tiles.join(' | '));
 console.log('  attendu CA = 80+200+90 = 370€  →', tiles[0]===('370€')?'OK':'ÉCART');
 console.log('  attendu commission (Signature parrainé) = 45€ →', tiles[4]==='45€'?'OK':'ÉCART ('+tiles[4]+')');
 await p.click('.tabs button[data-tab="crew"]'); await p.waitForTimeout(300);
 console.log('  Crew :', (await p.textContent('#crew-wrap')).replace(/\s+/g,' ').slice(0,110));
 await p.click('.tabs button[data-tab="board"]'); await p.waitForTimeout(300);
 await p.screenshot({path:'v3_office_rempli.png'});
 console.log('erreurs JS :', errs.length?JSON.stringify(errs):'aucune');
 await b.close(); process.exit(0);
})();
