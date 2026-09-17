'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   PARCOURS COMPLET — du clic du visiteur au fichier téléchargé.

   Ce contrôle relie trois morceaux qui n'avaient jamais été vérifiés ensemble :

     1. la VITRINE compose un message de commande (vraie page, vrai navigateur) ;
     2. le BACK-OFFICE relit ce message et en tire un produit et un montant ;
     3. le NOYAU SERVEUR crée la commande, reçoit un paiement signé, accorde
        l'accès et délivre un lien — puis on ouvre le lien et on compare les
        fichiers reçus à ce qui est réellement sur le disque.

   Portée : SIMULATION LOCALE. L'événement de paiement est construit et signé
   ici avec un secret de test. Rien de tout ceci ne prouve une connexion à
   Stripe ; cela prouve que la chaîne tient de bout en bout, et que le client
   reçoit ce qu'il a payé — pas autre chose.
   ══════════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../server/boutique.js');

const V = 'file://' + path.join(__dirname, '..', 'preview', 'vitrine.html');
const O = 'file://' + path.join(__dirname, '..', 'preview', 'back-office.html');
const SECRET_WH = 'whsec_test_local_parcours';
const SECRET_LIEN = 'lien_test_local_parcours';
const CLIENT = { id: 'cli_parcours', email: 'client@example.test' };

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  /* La vitrine ouvre ig.me pour envoyer le message : on intercepte au lieu de
     partir sur Internet, et on récupère le texte réellement composé. */
  await ctx.route('**://ig.me/**', r => r.abort());
  const page = await ctx.newPage();
  await page.goto(V, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /* ── 1. La vitrine ───────────────────────────────────────────────────── */
  const compose = await page.evaluate(() => {
    /* La vitrine ne part pas sur Internet : elle ouvre une boîte de dialogue
       contenant le message à envoyer. On lit ce message tel qu'il est proposé
       au visiteur — pas une reconstitution. */
    const bouton = document.querySelector('.collection-fiche [data-ready]');
    if (!bouton) return { erreur: 'aucun bouton de commande sur la fiche livrable' };
    bouton.click();
    const zone = document.getElementById('handoff-message');
    const boite = document.getElementById('handoff');
    if (!zone || !zone.value.trim()) return { erreur: 'aucun message composé au clic' };
    return { message: zone.value, boiteOuverte: !!(boite && boite.open) };
  });
  ck('vitrine : le bouton de la collection compose un message de commande',
     !compose.erreur && !!compose.message && compose.boiteOuverte,
     compose.erreur || (compose.message || '').split('\n')[0]);
  if (compose.erreur) { await nav.close(); throw new Error(compose.erreur); }

  /* ── 2. Le back-office relit ce message ──────────────────────────────── */
  const bo = await ctx.newPage();
  await bo.goto(O, { waitUntil: 'load' });
  await bo.waitForTimeout(1200);
  const lu = await bo.evaluate(async (msg) => {
    document.querySelector('[data-tab="orders"]').click();
    document.getElementById('paste').value = msg;
    document.getElementById('parse-btn').click();
    await new Promise(r => setTimeout(r, 250));
    return {
      genre: document.getElementById('o-kind').value,
      produitId: Number(document.getElementById('o-pack').value),
      total: Number(document.getElementById('o-total').value)
    };
  }, compose.message);
  await nav.close();

  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  ck('back-office : le message est relu comme la bonne collection',
     lu.genre === 'ready' && lu.produitId === street.id && lu.total === street.price,
     lu.genre + '/' + lu.produitId + '/' + lu.total + ' attendu ready/' + street.id + '/' + street.price);

  /* ── 3. Le noyau serveur : commande, paiement, accès, lien ───────────── */
  const fichierMagasin = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aura-parcours-')), 'magasin.json');
  const m = B.creerMagasin(fichierMagasin);

  const { commande, erreur } = B.creerCommande(m, {
    genre: lu.genre, produitId: lu.produitId, client: CLIENT, sessionPaiement: 'cs_parcours'
  });
  ck('serveur : la commande est acceptée', !erreur && !!commande, erreur || 'ok');
  ck('serveur : le prix est celui du catalogue, pas celui du message',
     commande.montantCentimes === street.price * 100,
     commande.montantCentimes + ' centimes');

  const session = { id: 'cs_parcours', amount_total: street.price * 100, currency: 'eur', payment_status: 'paid' };
  const corps = JSON.stringify({ id: 'evt_parcours', type: 'checkout.session.completed', livemode: false,
                                 data: { object: session } });
  const res = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH,
                                 { livemodeAttendu: false });
  ck('serveur : le paiement signé est accepté (simulation locale)', res.ok, res.motif || 'ok');
  ck('serveur : la commande passe à livrée', m.lireCommande(commande.id).etat === 'livree',
     m.lireCommande(commande.id).etat);

  const acces = m.accesDeCommande(commande.id)[0];
  ck('serveur : un accès est accordé, et un seul', m.accesDeCommande(commande.id).length === 1);

  /* ── 4. Le lien, ouvert par le bon client, rend les bons fichiers ─────── */
  const { jeton } = B.creerLien(acces, SECRET_LIEN);
  const ouvert = B.ouvrirLien(m, jeton, SECRET_LIEN, CLIENT.id);
  ck('livraison : le lien s\'ouvre pour le client qui a payé', ouvert.ok, ouvert.motif || 'ok');

  const surDisque = fs.readdirSync(path.join(__dirname, '..', 'src', 'collections', 'street'))
    .filter(f => !f.startsWith('.')).sort();
  const recus = (ouvert.acces ? ouvert.acces.fichiers : []).slice().sort();
  ck('livraison : les fichiers reçus sont exactement ceux de la collection achetée',
     JSON.stringify(recus) === JSON.stringify(surDisque),
     recus.length + ' reçu(s) / ' + surDisque.length + ' sur disque');

  /* Les fichiers annoncés existent vraiment et ne sont pas vides. */
  const controles = recus.map(f => {
    const c = path.join(__dirname, '..', 'src', 'collections', 'street', f);
    return { f, existe: fs.existsSync(c), octets: fs.existsSync(c) ? fs.statSync(c).size : 0 };
  });
  ck('livraison : chaque fichier livré existe et n\'est pas vide',
     controles.length > 0 && controles.every(c => c.existe && c.octets > 100),
     controles.filter(c => !c.existe || c.octets <= 100).map(c => c.f).join(', ') || 'tous valides');

  /* Un autre client ne doit rien pouvoir récupérer avec ce lien. */
  const vol = B.ouvrirLien(m, jeton, SECRET_LIEN, 'cli_quelqun_dautre');
  ck('livraison : un autre client ne peut pas ouvrir ce lien', !vol.ok && vol.motif === 'client_different',
     vol.motif || 'ACCÈS ACCORDÉ — faille');

  /* L'archive téléchargeable correspond à ce qui est livré. */
  const zip = path.join(__dirname, '..', 'src', 'collections', 'street.zip');
  ck('livraison : l\'archive du produit existe et pèse un poids plausible',
     fs.existsSync(zip) && fs.statSync(zip).size > 200 * 1024,
     fs.existsSync(zip) ? (fs.statSync(zip).size / 1024).toFixed(0) + ' Ko' : 'absente');

  R.forEach(l => console.log(l));
  const echecs = R.filter(l => l.startsWith('ÉCHEC')).length;
  console.log('\n' + R.length + ' contrôles de parcours — ' + (R.length - echecs) + ' PASS, ' + echecs + ' ÉCHEC');
  console.log('portée : SIMULATION LOCALE — le paiement est construit et signé ici,');
  console.log('         aucune connexion à Stripe n\'est établie ni prouvée.');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error('PARCOURS INTERROMPU :', e.message); process.exit(2); });
