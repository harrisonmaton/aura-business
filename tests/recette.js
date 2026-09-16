const { chromium } = require('playwright');
const CAT=JSON.parse(require('fs').readFileSync(__dirname+'/../src/catalog.json','utf8'));
const CREA=JSON.parse(require('fs').readFileSync(__dirname+'/../src/creations/MANIFESTE.json','utf8'));
const V='file://'+__dirname+'/../preview/vitrine.html', O='file://'+__dirname+'/../preview/back-office.html';
const R=[]; const ck=(n,c,x)=>R.push((c?'PASS ':'ÉCHEC')+' — '+n+(x!==undefined?'  ['+x+']':''));
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const errs=[];
 const c=await b.newContext({viewport:{width:1440,height:900},locale:'fr-FR'});
 await c.route('**://ig.me/**',r=>r.abort());
 const p=await c.newPage();
 p.on('pageerror',e=>errs.push('JS: '+e.message));
 /* Plus d'exemption pour fonts.googleapis : les polices sont auto-hébergées.
    Si quelqu'un réintroduit un appel tiers, la recette doit le voir. */
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 const tiers=[];
 p.on('request',r=>{const u=r.url();if(!/^(file:|data:|blob:)/.test(u))tiers.push(u);});
 await p.goto(V,{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1200);

 ck('image d\'ambiance chargée', await p.evaluate(()=>{const i=document.getElementById('cinema-image');return i&&i.naturalWidth>1000;}));
 ck('contenu complet rendu', await p.locator('.menu-row').count()===3 && await p.locator('.ready-row').count()===4 && await p.locator('.qa-item').count()===5);
 ck('lien d\'évitement présent (a11y)', await p.locator('.skip-link').count()===1);
 /* angle mort de la recette précédente : l'externalisation de l'image avait vidé
    le fond des 4 miniatures « Déjà prêt » sans qu'aucune assertion ne rougisse. */
 ck('miniatures Déjà prêt : fond réellement chargé', await p.evaluate(()=>{
   const els=[...document.querySelectorAll('.ready-thumb')];
   return els.length===4 && els.every(e=>{const b=getComputedStyle(e).backgroundImage;return b&&b!=='none';});
 }));
 /* La page ne doit dépendre d'aucun tiers : polices comprises, elle doit
    s'afficher entière hors ligne. */
 ck('aucune requête vers un tiers', tiers.length===0, tiers.length?tiers.join(' '):'0');
 ck('polices auto-hébergées réellement chargées', await p.evaluate(async()=>{
   await document.fonts.ready;
   const f=[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family);
   return f.includes('Archivo') && f.includes('Bodoni Moda');
 }));
 /* Assets manquants : une collection sans fichier livrable ne doit être ni
    commandable, ni annoncée en livraison immédiate. Sinon le site encaisse
    pour un fichier qui n'existe pas. */
 const sansFichier = CAT.ready.filter(r=>!(r.assets>0)).map(r=>r.id);
 const etatReady = Object.assign({sansFichier}, await p.evaluate(()=>({
   commandables: [...document.querySelectorAll('[data-ready]')].map(e=>Number(e.getAttribute('data-ready'))),
   boutons     : [...document.querySelectorAll('.ready-row')].filter(e=>e.tagName==='BUTTON').length,
   texte       : document.getElementById('ready').textContent,
   etatHint    : document.getElementById('ready-hint').getAttribute('data-state'),
   etatLede    : document.getElementById('ready-lede').getAttribute('data-state')
 })));
 ck('collection sans fichier : aucun chemin de commande',
    etatReady.sansFichier.every(id=>!etatReady.commandables.includes(id)),
    'sans fichier ['+etatReady.sansFichier+'] commandables ['+etatReady.commandables+']');
 ck('collection sans fichier : pas de bouton cliquable',
    etatReady.boutons===CAT.ready.length-etatReady.sansFichier.length, etatReady.boutons+' bouton(s)');
 /* Deux angles : l'état déclaré de la section, et l'absence de la formule
    commerciale. Le premier tient quelle que soit la langue ou la rédaction. */
 const attendu = etatReady.sansFichier.length===CAT.ready.length ? 'soon' : 'available';
 ck('section annoncée dans l\'état correspondant au catalogue',
    etatReady.etatHint===attendu && etatReady.etatLede===attendu,
    etatReady.etatHint+'/'+etatReady.etatLede+' attendu '+attendu);
 ck('aucune promesse de livraison immédiate sans fichier',
    attendu==='available' ||
    !/livraison directe|entrega directa|consegna diretta|direct delivery|fichier part|file ships|archivo sale|file parte/i.test(etatReady.texte));
 ck('état « en préparation » affiché au visiteur',
    (await p.locator('.ready-row.is-soon').count())===etatReady.sansFichier.length);
 /* La mention légale affirmait que tous les visuels étaient générés. C'est vrai
    des compositions SVG, pas de hero.webp dont la provenance n'est pas établie. */
 ck('mention légale : aucune affirmation sur l\'origine de l\'image d\'accueil',
    await p.evaluate(()=>{
      const l=document.querySelector('.legal').textContent;
      return !/compositions générées, pas des photographies/i.test(l)
          && !/illustrations d.ambiance du site sont générées/i.test(l);
    }));
 /* ── Galerie de créations ─────────────────────────────────────────────
    Le site doit montrer le travail livré, et chaque démonstration doit
    ramener au pack correspondant sans jamais se faire passer pour un
    client réel. */
 ck('galerie : une vitre par série', await p.locator('.vitre').count() === CREA.series.length);
 ck('galerie : les pièces de la série active sont rendues',
    await p.locator('.piece').count() === CREA.series[0].pieces.length);
 ck('galerie : chaque série est étiquetée concept de démonstration',
    (await p.locator('.demo-tag').count()) === 1
    && /démonstration/i.test(await p.textContent('.demo-tag')));
 ck('galerie : aucune enseigne présentée comme cliente réelle',
    await p.evaluate(()=>!/nos clients|ils nous font confiance|témoignage/i.test(
      document.getElementById('creations').textContent)));
 /* Changer d'onglet doit déplacer la vitre active du hero : les deux vues
    lisent le même état, sinon elles divergent en silence. */
 await p.click('[data-serie-onglet="1"]'); await p.waitForTimeout(650);
 ck('galerie : onglet et hero partagent le même état',
    await p.getAttribute('.vitre[data-vitre="1"]','data-rang') === '0'
    && (await p.textContent('#serie-enseigne')).trim() === CREA.series[1].enseigne);
 /* Le bouton d'offre doit pointer le pack déclaré dans le manifeste. */
 ck('galerie : la démonstration mène au bon pack',
    await p.getAttribute('#serie-pack','data-order') === String(CREA.series[1].packSuggere));
 // clavier
 await p.focus('.vitre[data-rang="0"]');
 await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
 ck('galerie : parcours au clavier', await p.getAttribute('.vitre[data-vitre="2"]','data-rang') === '0');
 // aperçu
 const ouvreur = '.piece[data-piece="0"]';
 await p.click(ouvreur); await p.waitForTimeout(500);
 ck('aperçu : ouverture en grand', await p.evaluate(()=>document.getElementById('loupe').open));
 await p.click('#loupe-story'); await p.waitForTimeout(400);
 ck('aperçu : bascule publication / story',
    await p.getAttribute('#loupe-story','aria-pressed') === 'true'
    && await p.evaluate(()=>/1920/.test(document.querySelector('#loupe-vue svg').getAttribute('viewBox'))));
 await p.keyboard.press('Escape'); await p.waitForTimeout(450);
 ck('aperçu : Échap ferme et rend le focus au déclencheur',
    !(await p.evaluate(()=>document.getElementById('loupe').open))
    && await p.evaluate(()=>document.activeElement.classList.contains('piece')));
 /* Depuis l'aperçu, l'offre doit ouvrir la feuille de commande du bon pack. */
 await p.click(ouvreur); await p.waitForTimeout(400);
 await p.click('#loupe-offre'); await p.waitForTimeout(600);
 ck('aperçu : le bouton d\'offre ouvre la commande du pack annoncé',
    await p.isVisible('#sheet') && !(await p.evaluate(()=>document.getElementById('loupe').open)));
 await p.click('#sheet-close'); await p.waitForTimeout(350);
 await p.click('[data-serie-onglet="0"]'); await p.waitForTimeout(450);

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
 /* Le test ci-dessus peut passer alors que la page déborde, parce que html,body ont overflow-x:clip.
    Celui-ci neutralise le clip d'abord : c'est le seul qui voit un vrai débordement.
    Sur un contexte isMobile, un débordement élargit aussi le viewport de mise en page,
    ce qui étire les éléments position:fixed — d'où la vérification de innerWidth. */
 /* Page jetable : le style injecté ne doit pas fuir dans les contrôles suivants. */
 const nuCtx = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const nuPage = await nuCtx.newPage();
 await nuPage.goto(V); await nuPage.waitForTimeout(900);
 const nu = await nuPage.evaluate(()=>{
   const s=document.createElement('style');
   s.textContent='html,body{overflow-x:visible !important}';
   document.head.appendChild(s);
   return {sw:document.documentElement.scrollWidth, iw:window.innerWidth};
 });
 await nuCtx.close();
 ck('mobile : aucun débordement RÉEL (clip neutralisé, 390 px)', nu.sw<=391 && nu.iw<=391);
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
 /* Le défaut commercial doit être visible par l'exploitant, pas seulement
    masqué côté public. */
 await op.click('.tabs button[data-tab="board"]'); await op.waitForTimeout(250);
 const etatOffice = Object.assign({sansFichier:sansFichier.length}, await op.evaluate(()=>({
   pastilles: document.querySelectorAll('#assets-state .pill.assets-missing').length,
   alerte   : document.getElementById('assets-card').classList.contains('alert'),
   note     : document.getElementById('assets-note').textContent
 })));
 ck('back-office : collections sans fichier signalées assets_missing',
    etatOffice.pastilles===etatOffice.sansFichier,
    etatOffice.pastilles+'/'+etatOffice.sansFichier);
 ck('back-office : alerte visible et nommant les collections',
    etatOffice.sansFichier===0 || (etatOffice.alerte && /Street|Night|Heat|House/.test(etatOffice.note)));

 console.log(R.join('\n'));
 const f=R.filter(x=>x.startsWith('ÉCHEC')).length;
 console.log(`\n${R.length} contrôles — ${R.length-f} PASS, ${f} ÉCHEC`);
 console.log('ERREURS JS : '+(errs.length?JSON.stringify(errs,null,1):'aucune'));
 await b.close();
 /* EXIT_ON_FAIL : un test rouge doit faire échouer le processus, sinon une CI passe au vert sur un défaut */
 /* Une erreur JS ou console critique doit faire échouer la recette, pas
    seulement s'afficher en bas du journal : sinon une page cassée passe au vert. */
 if(errs.length) R.push('ÉCHEC — '+errs.length+' erreur(s) JS/console pendant la recette');
 const failed=R.filter(x=>/^(ÉCHEC|FAIL)/.test(x)).length;
 process.exit(failed>0?1:0);
})();
