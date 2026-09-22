'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   AURA WATCHES — ce qui doit rester vrai.

   1. Aucun prix public, nulle part (texte, attributs, données structurées).
   2. Aucune trace fournisseur, aucun vocabulaire e-commerce (panier, checkout…).
   3. Tous les liens Instagram pointent EXACTEMENT vers le profil officiel.
   4. « Demander le prix » copie le bon message, l'annonce, et ouvre le profil.
   5. Aucun défilement horizontal sur téléphone.
   Sortie en code 1 si un seul contrôle échoue.
   ══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..', 'watches');
const IG = 'https://www.instagram.com/polakpl_f44/';
const D = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'modeles.json'), 'utf8'));

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

function fichiers(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? fichiers(p, ext) : ext.includes(path.extname(e.name)) ? [p] : [];
  });
}

/* ── 1-3. Contrôles statiques ─────────────────────────────────────────── */
const pages = fichiers(RACINE, ['.html']);
const sources = fichiers(RACINE, ['.html', '.js', '.json', '.css']);
ck(`accueil + ${D.modeles.length} fiches générés`, pages.length === D.modeles.length + 1, pages.length);
ck('sélection entre 10 et 24 modèles', D.modeles.length >= 10 && D.modeles.length <= 24, D.modeles.length);
ck('slugs uniques', new Set(D.modeles.map(m => m.slug)).size === D.modeles.length);

const INTERDITS_PRIX = [/€/, /\bEUR\b/, /\d+\s?(euros?)\b/i, /à partir de/i, /\bdès\s+\d/i, /starting at/i, /"price"/i, /"offers"/i,
  /priceCurrency/i, /prix barré/i, /\bpromo(tion)?\b/i, /réduction/i, /\bsolde/i, /(?<!-)\bmarge\b/i, /coût d.achat/i];
const INTERDITS_COMMERCE = [/felli/i, /\bsku\b/i, /fournisseur/i, /panier/i, /checkout/i, /stripe/i, /paypal/i, /apple pay/i,
  /shop now/i, /best.?seller/i, /livraison gratuite/i, /<form/i, /type="checkbox"/i];
for (const f of sources) {
  const rel = path.relative(RACINE, f);
  // La règle interne du fichier de données cite les mots interdits pour les interdire.
  const t = fs.readFileSync(f, 'utf8').replace(/"_regle":\s*"[^"]*"/, '');
  const prix = INTERDITS_PRIX.filter(r => r.test(t)).map(String);
  const com = INTERDITS_COMMERCE.filter(r => r.test(t)).map(String);
  ck(`aucun prix — ${rel}`, prix.length === 0, prix.join(' ') || undefined);
  ck(`aucune trace fournisseur ni panier — ${rel}`, com.length === 0, com.join(' ') || undefined);
}

let liensIg = 0;
for (const f of pages) {
  const t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(RACINE, f);
  const autres = [...t.matchAll(/https?:\/\/[^"'\s)]*(instagram\.com|ig\.me|instagr\.am)[^"'\s)]*/g)].map(m => m[0]).filter(u => u !== IG);
  liensIg += (t.match(/href="https:\/\/www\.instagram\.com\/polakpl_f44\/"/g) || []).length;
  ck(`Instagram : une seule destination — ${rel}`, autres.length === 0, autres.join(' ') || undefined);
  const demandes = [...t.matchAll(/<a [^>]*data-demande="[^"]*"[^>]*>/g)].map(m => m[0]);
  ck(`chaque « demande » est un vrai lien vers le profil — ${rel}`,
    demandes.length > 0 && demandes.every(a => a.includes(`href="${IG}"`) && a.includes('target="_blank"')), demandes.length);
}
ck('liens Instagram présents sur tout le site', liensIg >= pages.length * 3, liensIg);

for (const m of D.modeles) {
  const t = fs.readFileSync(path.join(RACINE, 'montre', m.slug + '.html'), 'utf8');
  ck(`fiche ${m.nom} : CTA « Demander le prix » lié au modèle`, (t.match(new RegExp(`data-demande="${m.nom}"`, 'g')) || []).length === 2);
  // Photo AURA, ou cartouche explicite « Photo en préparation » : jamais une image étrangère au modèle.
  const photo = fs.existsSync(path.join(RACINE, 'img', m.slug + '.webp'));
  ck(`fiche ${m.nom} : photo AURA ou cartouche`, photo ? t.includes(`img/${m.slug}.webp`) : t.includes('Photo en préparation'), photo ? 'photo' : 'cartouche');
  ck(`fiche ${m.nom} : aucune caractéristique inventée`,
    Object.keys(m.specs).length > 0 || t.includes('Nous n’affichons que ce qui est confirmé'));
}
const accueil = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const cartesAccueil = [...accueil.matchAll(/<a class="piece revele"[\s\S]*?<\/a>/g)].map(m => m[0]);
ck('cartes : nom + « Découvrir », sans mention de prix', cartesAccueil.length === D.modeles.length + 3 &&
  cartesAccueil.every(c => /Découvrir/.test(c) && !/prix|tarif/i.test(c)), cartesAccueil.length);

/* ── 4-5. Navigateur ──────────────────────────────────────────────────── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const serveur = http.createServer((q, r) => {
  const p = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(RACINE) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(r);
});

(async () => {
  await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
  const BASE = `http://127.0.0.1:${serveur.address().port}/`;
  const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  try {
    for (const [profil, opts] of [
      ['bureau', { viewport: { width: 1440, height: 900 } }],
      ['iPhone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }],
      ['navigateur Instagram', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; fr_FR)' }]
    ]) {
      const ctx = await nav.newContext({ ...opts, locale: 'fr-FR', permissions: ['clipboard-read', 'clipboard-write'] });
      // Instagram n'est jamais réellement appelé : on capture la navigation, rien de plus.
      await ctx.route(/instagram\.com|fonts\.(googleapis|gstatic)\.com/, (route) => {
        route.fulfill({ status: 200, contentType: 'text/html', body: '' });
      });
      const erreurs = [];
      const page = await ctx.newPage();
      page.on('pageerror', e => erreurs.push(e.message));

      for (const m of [D.modeles[0], D.modeles[7]]) {
        await page.goto(BASE + 'montre/' + m.slug + '.html', { waitUntil: 'load' });
        const cta = page.locator(`.fiche [data-demande="${m.nom}"]`);
        const [onglet] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), cta.click()]);
        if (onglet) await onglet.waitForLoadState().catch(() => {});
        const copie = await page.evaluate(() => navigator.clipboard.readText());
        const attendu = `Salut 👋 Je voudrais avoir le prix et vérifier la disponibilité de l’${m.nom}.`;
        ck(`${profil} — ${m.nom} : message copié`, copie === attendu, copie);
        ck(`${profil} — ${m.nom} : toast affiché`, (await page.locator('.toast.visible').textContent().catch(() => '')) === 'Message copié — envoyez-le-nous sur Instagram.');
        ck(`${profil} — ${m.nom} : ouvre exactement le profil`, !!onglet && onglet.url() === IG, onglet && onglet.url());
        if (onglet) await onglet.close();
      }

      if (opts.isMobile) {
        await page.goto(BASE + 'montre/' + D.modeles[0].slug + '.html', { waitUntil: 'load' });
        await page.waitForTimeout(300);
        ck(`${profil} — barre fixe visible dès l'arrivée sur une fiche`, await page.locator('.barre.visible').isVisible());
        const barre = page.locator(`.barre [data-demande="${D.modeles[0].nom}"]`);
        const [o2] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), barre.click()]);
        ck(`${profil} — barre fixe : ouvre le profil`, !!o2 && o2.url() === IG, o2 && o2.url());
        if (o2) await o2.close();

        await page.goto(BASE + 'index.html', { waitUntil: 'load' });
        await page.waitForTimeout(300);
        ck(`${profil} — accueil : barre masquée sur le hero`, !(await page.locator('.barre.visible').count()));
        await page.evaluate(() => window.scrollTo(0, innerHeight * 1.6));
        await page.waitForTimeout(600);
        ck(`${profil} — accueil : barre affichée après le hero`, await page.locator('.barre.visible').count() === 1);

        for (const u of ['index.html', ...D.modeles.map(m => 'montre/' + m.slug + '.html')]) {
          await page.setViewportSize({ width: 360, height: 780 });
          await page.goto(BASE + u, { waitUntil: 'load' });
          const w = await page.evaluate(() => document.documentElement.scrollWidth);
          ck(`${profil} — 360 px sans défilement horizontal — ${u}`, w <= 360, w);
        }
      }
      ck(`${profil} — aucune erreur JavaScript`, erreurs.length === 0, erreurs.join(' | ') || undefined);
      await ctx.close();
    }
  } finally {
    await nav.close();
    serveur.close();
  }

  const echecs = R.filter(l => l.startsWith('ÉCHEC'));
  console.log(R.join('\n'));
  console.log(`\nAURA WATCHES — ${R.length} contrôles, ${R.length - echecs.length} PASS, ${echecs.length} ÉCHEC`);
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
