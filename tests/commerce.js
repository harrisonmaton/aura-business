'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   BARRIÈRE COMMERCIALE — rien d'achetable ne peut être cassé

   Le mandat pose une règle simple et sévère : pour chaque chose vendable, on
   doit pouvoir répondre à neuf questions — que vend-on, que reçoit le client,
   quand, où, sous quel format, qui le livre, que se passe-t-il si ça échoue,
   comment le client retrouve son achat, comment il demande de l'aide. S'il en
   manque UNE, l'offre ne doit pas être activable à l'achat.

   Ce fichier transforme cette règle en barrière. Il ne décrit pas une
   intention : il refuse de passer.

   Il vérifie aussi le sens inverse, qui est le plus dangereux : qu'aucun
   bouton de la page ne mène à une offre non déclarée. Une offre oubliée dans
   le HTML, un ancien produit encore atteignable — c'est exactement ce qui
   encaisse pour quelque chose qu'on ne livre plus.
   ══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const LIV = JSON.parse(fs.readFileSync(path.join(RACINE, 'src/livraison.json'), 'utf8'));
const CAT = JSON.parse(fs.readFileSync(path.join(RACINE, 'src/catalog.json'), 'utf8'));
const V = 'file://' + path.join(RACINE, 'preview', 'vitrine.html');

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

/* Les neuf réponses obligatoires. Elles viennent mot pour mot du mandat. */
const OBLIGATOIRES = ['vend', 'recoit', 'quand', 'ou', 'format', 'livre_par',
                      'si_echec', 'retrouver', 'aide'];

(async () => {

  /* ── 1. Toute offre commandable est complètement déclarée ──────────────── */
  const incompletes = [];
  for (const o of LIV.offres) {
    if (!o.commandable) continue;
    const manque = OBLIGATOIRES.filter(k => !o[k] || String(o[k]).trim() === '');
    if (manque.length) incompletes.push(`${o.id} : ${manque.join(', ')}`);
  }
  ck('toute offre commandable répond aux neuf questions',
     incompletes.length === 0, incompletes.join(' | ') || 'les neuf, partout');

  /* ── 2. Une offre commandable est ACTIVE, et réciproquement ────────────── */
  const etats = LIV.offres
    .filter(o => o.commandable && o.etat !== 'ACTIVE')
    .map(o => `${o.id} commandable mais ${o.etat}`);
  ck('seules les offres ACTIVE sont commandables',
     etats.length === 0, etats.join(' | ') || 'cohérent');

  /* ── 3. Une collection sans fichier n'est jamais commandable ───────────── */
  /* Le disque a raison, pas le catalogue. Une collection annoncée à 8 visuels
     mais sans fichier ne peut pas être vendue, quel que soit ce qu'on écrit. */
  const menteuses = [];
  for (const r of CAT.ready) {
    const o = LIV.offres.find(x => x.id === 'ready-' + r.id);
    if (!o) { menteuses.push(`ready-${r.id} non déclarée`); continue; }
    if (r.assets === 0 && o.commandable) {
      menteuses.push(`ready-${r.id} commandable avec 0 fichier`);
    }
  }
  ck('aucune collection sans fichier n’est commandable',
     menteuses.length === 0, menteuses.join(' | ') || 'aucune');

  /* ── 4. Aucun bouton de la page ne mène à une offre non déclarée ───────── */
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--disable-gpu', '--disable-webgl'] });
  const p = await nav.newPage({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  await p.goto(V, { waitUntil: 'load' });
  await p.waitForTimeout(2500);

  const boutons = await p.evaluate(() => {
    const visible = e => { const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    return {
      order: [...document.querySelectorAll('[data-order]')].filter(visible)
        .map(e => e.getAttribute('data-order')),
      ready: [...document.querySelectorAll('[data-ready]')].filter(visible)
        .map(e => e.getAttribute('data-ready'))
    };
  });

  const orphelins = [];
  for (const id of new Set(boutons.order)) {
    const o = LIV.offres.find(x => x.id === 'brief-' + id);
    if (!o) orphelins.push(`bouton brief-${id} sans déclaration`);
    else if (!o.commandable) orphelins.push(`bouton brief-${id} pour une offre non commandable`);
  }
  for (const id of new Set(boutons.ready)) {
    const o = LIV.offres.find(x => x.id === 'ready-' + id);
    if (!o) orphelins.push(`bouton ready-${id} sans déclaration`);
    else if (!o.commandable) orphelins.push(`bouton ready-${id} pour une offre non commandable`);
  }
  ck('aucun bouton ne mène à une offre non déclarée ou désactivée',
     orphelins.length === 0,
     orphelins.join(' | ') || `${new Set(boutons.order).size} brief + ${new Set(boutons.ready).size} collection`);

  /* ── 5. Le site n'encaisse pas ─────────────────────────────────────────── */
  /* Tant que c'est vrai, une offre de type D reste acceptable : le site ne
     peut pas prendre d'argent sans livrer. Le jour où ça change, cette
     barrière doit tomber et être remplacée par les contrôles du lot 3. */
  const encaisse = await p.evaluate(() => {
    const suspects = [];
    for (const f of document.querySelectorAll('form[action]')) {
      const a = f.getAttribute('action') || '';
      if (/stripe|checkout|paypal|pay|payment/i.test(a)) suspects.push('form ' + a);
    }
    for (const e of document.querySelectorAll('[href]')) {
      const h = e.getAttribute('href') || '';
      if (/stripe\.com|checkout\.|paypal\.|buy\.stripe/i.test(h)) suspects.push('lien ' + h);
    }
    if (typeof window.Stripe !== 'undefined') suspects.push('SDK Stripe chargé');
    return suspects;
  });
  ck('le site ne prend aucun paiement — les offres de type D restent honnêtes',
     encaisse.length === 0, encaisse.join(' | ') || 'aucun encaissement');

  /* ── 6. Aucune promesse d'immédiateté dans le texte affiché ────────────── */
  /* Une offre livrée par un humain en 48 h ne doit jamais être présentée
     comme instantanée. On lit le texte VU par le visiteur, pas le source :
     les commentaires de code n'engagent personne. */
  const texte = await p.evaluate(() => document.body.innerText);
  const promesses = (texte.match(
    /livraison (directe|immédiate|instantanée)|instantanément|dans la minute|reçu imm[ée]diatement|automatiquement envoy/gi) || []);
  ck('aucune promesse d’immédiateté dans le texte affiché',
     promesses.length === 0, promesses.join(' | ') || 'aucune');

  /* ── 7. Le délai annoncé vient du catalogue, pas d'une saisie ──────────── */
  const delais = await p.evaluate(() => document.body.innerText);
  const manquants = CAT.brief.filter(b => !delais.includes(b.delay)).map(b => b.name);
  ck('le délai de chaque pack est affiché au visiteur',
     manquants.length === 0, manquants.length ? 'absents : ' + manquants.join(', ') : 'les quatre');

  await nav.close();

  R.forEach(l => console.log(l));
  const e = R.filter(l => l.startsWith('ÉCHEC')).length;
  console.log('\n' + R.length + ' contrôles commerce — ' + (R.length - e) + ' PASS, ' + e + ' ÉCHEC');
  if (e) {
    console.log('\nRÈGLE : une offre dont le chemin de livraison n’est pas');
    console.log('incontestable ne doit pas être commandable. Corriger la');
    console.log('livraison, transformer l’offre en demande, ou la désactiver.');
  }
  process.exit(e ? 1 : 0);
})().catch(e => { console.error('BARRIÈRE COMMERCE INTERROMPUE :', e.message); process.exit(2); });
