const { chromium } = require('playwright');
const V='file://'+__dirname+'/v3_vitrine_preview.html', O='file://'+__dirname+'/v3_office_preview.html';
const R=[]; const ck=(n,c,x)=>R.push((c?'PASS ':'ÉCHEC')+' — '+n+(x!==undefined?'  ['+x+']':''));
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
 const c=await b.newContext({viewport:{width:1440,height:900},locale:'fr-FR'});
 await c.route('**://ig.me/**',r=>r.abort());
 const p=await c.newPage();
 p.on('pageerror',e=>errs.push('JS: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts.googleapis/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 await p.goto(V,{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1200);

 ck('image d\'ambiance chargée', await p.evaluate(()=>{const i=document.getElementById('cinema-image');return i&&i.naturalWidth>1000;}));
 ck('contenu complet rendu', await p.locator('.menu-row').count()===3 && await p.locator('.ready-row').count()===4 && await p.locator('.qa-item').count()===5);
 ck('lien d\'évitement présent (a11y)', await p.locator('.skip-link').count()===1);
 // commande
 await p.click('#kiosk button[data-order="2"]'); await p.waitForTimeout(400);
 ck('feuille de commande ouverte', await p.isVisible('#sheet'));
 await p.click('#to-2'); await p.click('#to-3'); await p.waitForTimeout(250);
 ck('brief vide bloqué', await p.evaluate(()=>!document.getElementById('form-error').hidden));
 await p.fill('#f-ig','compte invalide !!'); await p.fill('#f-sell','pizzeria'); await p.fill('#f-audience','le quartier');
 await p.click('#to-3'); await p.waitForTimeout(200);
 ck('identifiant Instagram invalide refusé', await p.evaluate(()=>!document.getElementById('form-error').hidden));
 await p.fill('#f-ig','@bellanapoli'); await p.click('.chip[data-extra="express"]');
 ck('total 90+25', (await p.locator('#sheet-total').textContent()).trim()==='115€');
 await p.click('#to-3'); await p.waitForTimeout(300);
 ck('retour arrière possible', await p.locator('#back-to-2').count()===1);
 await p.click('#send-btn'); await p.waitForTimeout(400);
 ck('remise = dialogue explicite, pas de redirection silencieuse', await p.evaluate(()=>document.getElementById('handoff').open));
 ck('message complet dans le dialogue', (await p.evaluate(()=>document.getElementById('handoff-message').value)).includes('115€'));
 await p.click('#handoff-close'); await p.waitForTimeout(200);
 await p.click('#sheet-close'); await p.waitForTimeout(300);
 // club
 await p.locator('#club').scrollIntoViewIfNeeded();
 await p.fill('#member-name','Vega'); await p.click('#create-pass'); await p.waitForTimeout(400);
 ck('carte de club créée', await p.isVisible('#pass'));
 ck('code cryptographique', /^AURA-[0-9A-F]{16}$/.test(await p.evaluate(()=>document.getElementById('pass-code').textContent)));
 // XSS
 await p.click('#kiosk button[data-order="1"]'); await p.waitForTimeout(300);
 await p.click('#to-2'); await p.fill('#f-sell','"><img src=x onerror=window.__x=1>'); await p.waitForTimeout(500);
 ck('aucune injection depuis le champ client', await p.evaluate(()=>window.__x!==1));
 await p.keyboard.press('Escape'); await p.waitForTimeout(200);
 ck('desktop : aucun débordement', await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);

 // mobile
 const m=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mp=await m.newPage(); mp.on('pageerror',e=>errs.push('MOBILE: '+e.message));
 await mp.goto(V,{timeout:20000}).catch(()=>{}); await mp.waitForTimeout(1100);
 ck('mobile : aucun débordement', await mp.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
 await mp.click('#mobile-menu-btn'); await mp.waitForTimeout(300);
 ck('mobile : menu ouvrable et langues accessibles', await mp.evaluate(()=>document.getElementById('main-nav').classList.contains('mobile-open') && document.querySelectorAll('#main-nav .langset button').length===4));
 await mp.click('#main-nav a[href="#club"]'); await mp.waitForTimeout(500);
 ck('mobile : navigation ferme le menu et navigue', await mp.evaluate(()=>!document.getElementById('main-nav').classList.contains('mobile-open')));

 // mouvement réduit
 const rm=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const rp=await rm.newPage(); await rp.goto(V,{timeout:20000}).catch(()=>{}); await rp.waitForTimeout(900);
 ck('mouvement réduit : tout le contenu visible', await rp.evaluate(()=>[...document.querySelectorAll('.reveal')].every(e=>getComputedStyle(e).opacity==='1')));

 // back-office
 const o=await b.newContext({viewport:{width:1280,height:900}});
 const op=await o.newPage(); op.on('pageerror',e=>errs.push('OFFICE: '+e.message));
 await op.goto(O,{timeout:20000}).catch(()=>{}); await op.waitForTimeout(500);
 await op.click('.tabs button[data-tab="orders"]');
 const cases=[
  ["AURA — READY-2 Night · 80€\nDéjà prêt — livraison directe.\nTotal : 80€", 'ready','2','80','Déjà prêt (format actuel)'],
  ["AURA — n°2 Night · 80€\nDéjà prêt — livraison directe. Je prends ce pack.", 'ready','2','80','Déjà prêt (ancien format en circulation)'],
  ["Bonjour, je souhaite le n°2 Signature à 90€.\nTotal : 90€\n\nJe vends : pizzeria\nMon Instagram : @bellanapoli\nRecommandé par : AURA-4021",'brief','2','90','Pack sur brief'],
  ["Bonjour, je souhaite le n°4 Maison à 250€.\nTotal : 250€\nJe vends : garage",'brief','4','250','Pack n°4']
 ];
 for(const [msg,k,pk,tt,label] of cases){
   await op.fill('#paste',msg); await op.click('#parse-btn'); await op.waitForTimeout(250);
   const got=[await op.inputValue('#o-kind'),await op.inputValue('#o-pack'),await op.inputValue('#o-total')];
   ck('registre lit : '+label, got[0]===k&&got[1]===pk&&got[2]===tt, got.join('/'));
   await op.click('#save-order'); await op.waitForTimeout(250);
 }
 await op.click('.tabs button[data-tab="board"]'); await op.waitForTimeout(300);
 const connecte = (await op.textContent('#db-state')).includes('connect');
 if(connecte) ck('aucune commande perdue (4 enregistrées)', await op.evaluate(()=>document.querySelectorAll('#recent .order').length)===4);
 else { R.push('N/A   — enregistrement réel : registre hors ligne hors plateforme (testé séparément avec runtime simulé)');
        ck('mode hors ligne annoncé sans erreur silencieuse', (await op.textContent('#db-state')).includes('Hors ligne')); }
 await op.screenshot({path:'v3_office.png'});
 ck('back-office : aucun débordement', await op.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);

 console.log(R.join('\n'));
 const f=R.filter(x=>x.startsWith('ÉCHEC')).length;
 console.log(`\n${R.length} contrôles — ${R.length-f} PASS, ${f} ÉCHEC`);
 console.log('ERREURS JS : '+(errs.length?JSON.stringify(errs,null,1):'aucune'));
 await b.close();
 /* EXIT_ON_FAIL : un test rouge doit faire échouer le processus, sinon une CI passe au vert sur un défaut */
 const failed=R.filter(x=>/^(ÉCHEC|FAIL)/.test(x)).length;
 process.exit(failed>0?1:0);
})();
