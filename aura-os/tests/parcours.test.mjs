/* ═══════════════════════════════════════════════════════════════════════════
   TEST D'ACCEPTATION DU LOT 2

   Le parcours complet, dans l'ordre, contre une vraie base PostgreSQL et à
   travers le VRAI code du dépôt — pas une requête écrite pour le test :

     compte → commerce → onboarding → génération → publication
     → page publique ouverte par un anonyme → QR scanné → formulaire
     → demande en base → tableau de bord du propriétaire → statut modifié

   Et le pendant, sans lequel le reste ne vaut rien :
     un second utilisateur n'accède à RIEN de tout cela.

   Ce que ce test NE prouve PAS, et qu'il ne faut pas lui faire dire :
   l'authentification elle-même. Les comptes sont insérés directement dans
   `auth.users`, comme le ferait Supabase Auth après une inscription. Le
   parcours d'inscription, la session et les cookies relèvent de Supabase et
   ne pourront être vérifiés que contre une vraie instance.
   ═══════════════════════════════════════════════════════════════════════════ */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { reconstruire, CONNEXION } from './db-locale.mjs';
import * as depot from '../dist-test/data/depot.js';
import { planifier, urlPublique } from '../dist-test/core/generation.js';
import { validerDemande } from '../dist-test/core/leads.js';
import { destination } from '../dist-test/core/qr.js';
import { food } from '../dist-test/verticals/food/index.js';

const BASE = 'https://app.aura.test';
let pool;
const U = {};
let businessId, slug, qrCodes;

before(async () => {
  reconstruire();
  pool = new pg.Pool({ ...CONNEXION, max: 6 });
  depot.utiliserPiscine(pool);
  const a = await pool.query(`insert into auth.users (email) values ('proprio@test.local') returning id`);
  const b = await pool.query(`insert into auth.users (email) values ('intrus@test.local') returning id`);
  U.proprio = a.rows[0].id;
  U.intrus = b.rows[0].id;
});
after(async () => { await pool?.end(); });

describe('parcours complet — un commerçant, seul, du début à la fin', () => {

  test('1. il crée son commerce', async () => {
    businessId = await depot.creerCommerce(U.proprio, 'Glaces Tonio', 'Glaces Tonio');
    assert.ok(businessId);
    const c = await depot.commerceParId(U.proprio, businessId);
    slug = c.slug;
    assert.equal(slug, 'glaces-tonio');
    assert.equal(c.statut, 'brouillon', 'un commerce naît en brouillon');
  });

  test('2. il remplit son onboarding, écran par écran', async () => {
    /* Sauvegarde progressive : chaque écran écrit, rien n'attend la fin. */
    await depot.majProfil(U.proprio, businessId, { ville: 'Lille', description: 'Glaces artisanales' });
    await depot.majProfil(U.proprio, businessId, { couleur: '#E01B6A', style: 'artisanal' });
    await depot.ajouterArticle(U.proprio, businessId, { nom: 'Cornet 2 boules', prix_cents: 350 });
    await depot.ajouterArticle(U.proprio, businessId, { nom: 'Milkshake', prix_cents: 500 });
    await depot.majProfil(U.proprio, businessId, {
      whatsapp: '+32470123456', avis_url: 'https://g.page/r/test/review' });

    const etat = await depot.etatPourGeneration(U.proprio, businessId);
    assert.equal(etat.nombreArticles, 2);
    assert.equal(etat.whatsapp, '+32470123456');
  });

  test('3. le plan de génération est complet et publiable', async () => {
    const etat = await depot.etatPourGeneration(U.proprio, businessId);
    const plan = planifier(food, etat, BASE);
    assert.equal(plan.publiable, true);
    assert.deepEqual([...plan.qr].sort(), ['avis', 'booking', 'menu', 'page', 'whatsapp']);
    assert.equal(plan.qrEcartes.length, 0);
  });

  test('4. « Generate my business » publie et crée les QR', async () => {
    const etat = await depot.etatPourGeneration(U.proprio, businessId);
    const plan = planifier(food, etat, BASE);
    qrCodes = await depot.genererCommerce(U.proprio, businessId, plan.qr);
    assert.equal(qrCodes.length, 5);
    const c = await depot.commerceParId(U.proprio, businessId);
    assert.equal(c.statut, 'publie');
  });

  test('5. régénérer ne change pas les QR déjà imprimés', async () => {
    /* Leur identifiant est collé sur un véhicule : il est définitif. */
    const avant = qrCodes.map(q => q.id).sort();
    const apres = (await depot.genererCommerce(U.proprio, businessId, food.qr)).map(q => q.id).sort();
    assert.deepEqual(apres, avant);
  });

  test('6. un inconnu ouvre la page publique, sans compte', async () => {
    const page = await depot.pagePublique(slug);
    assert.ok(page, 'la page doit être lisible par un anonyme');
    assert.equal(page.commerce.nom, 'Glaces Tonio');
    assert.equal(page.articles.length, 2);
    assert.equal(page.profil.ville, 'Lille');
    assert.equal(page.qr.length, 5);
  });

  test('7. il scanne le QR « réservation » — le scan est compté', async () => {
    const qr = qrCodes.find(q => q.type === 'booking');
    const r = await depot.resoudreQR(qr.id);
    assert.equal(r.slug, slug);
    const cible = destination('booking', { slug: r.slug, base: BASE,
      whatsapp: r.whatsapp, avisUrl: r.avis_url, nomCommerce: r.nom });
    assert.equal(cible, `${BASE}/${slug}#demande`);
    assert.equal(await depot.noterEvenement(r.business_id, 'qr_scan', 'booking'), 1);
  });

  test('8. il envoie une demande d’événement', async () => {
    const v = validerDemande({ type: 'event', nom: 'Sophie', telephone: '0470998877',
      date_evt: '2026-08-15', personnes: '60', lieu: 'Roubaix',
      message: 'Mariage', source: 'qr_booking' });
    assert.equal(v.ok, true);
    assert.equal(await depot.deposerDemande(businessId, v.valeur), 1);
    await depot.noterEvenement(businessId, 'lead_cree');
  });

  test('9. la demande apparaît dans le tableau de bord du propriétaire', async () => {
    const d = await depot.mesDemandes(U.proprio, businessId);
    assert.equal(d.length, 1);
    assert.equal(d[0].nom, 'Sophie');
    assert.equal(d[0].personnes, 60);
    assert.equal(d[0].statut, 'nouveau');
    assert.equal(d[0].type, 'event');
  });

  test('10. il change le statut en un geste', async () => {
    const [d] = await depot.mesDemandes(U.proprio, businessId);
    assert.equal(await depot.changerStatutDemande(U.proprio, d.id, 'contacte'), 1);
    const [apres] = await depot.mesDemandes(U.proprio, businessId);
    assert.equal(apres.statut, 'contacte');
  });

  test('11. ses chiffres reflètent ce qui s’est réellement passé', async () => {
    const c = await depot.chiffres(U.proprio, businessId, new Date(Date.now() - 3600e3));
    assert.equal(c.qr_scan, 1);
    assert.equal(c.lead_cree, 1);
  });

  test('12. l’adresse publique est stable', () => {
    assert.equal(urlPublique(BASE, slug), `${BASE}/b/glaces-tonio`);
  });
});

describe('le second utilisateur n’accède à rien', () => {

  test('il ne voit pas le commerce dans sa liste', async () => {
    assert.deepEqual(await depot.mesCommerces(U.intrus), []);
  });

  test('il ne peut pas lire le commerce par son identifiant', async () => {
    /* Publié, donc lisible publiquement — mais il ne doit pas pouvoir le
       GÉRER. C'est la lecture privilégiée qu'on vérifie plus bas. */
    assert.deepEqual(await depot.mesDemandes(U.intrus, businessId), []);
  });

  test('il ne peut pas changer le statut d’une demande', async () => {
    const [d] = await depot.mesDemandes(U.proprio, businessId);
    assert.equal(await depot.changerStatutDemande(U.intrus, d.id, 'perdu'), 0);
    const [apres] = await depot.mesDemandes(U.proprio, businessId);
    assert.equal(apres.statut, 'contacte', 'le statut ne doit pas avoir bougé');
  });

  test('il ne voit aucun chiffre', async () => {
    assert.deepEqual(await depot.chiffres(U.intrus, businessId, new Date(0)), {});
  });

  test('il ne peut pas modifier le profil', async () => {
    assert.equal(await depot.majProfil(U.intrus, businessId, { ville: 'Piraté' }), 0);
    const page = await depot.pagePublique(slug);
    assert.equal(page.profil.ville, 'Lille');
  });

  test('il ne peut pas ajouter un article à la carte', async () => {
    await assert.rejects(
      () => depot.ajouterArticle(U.intrus, businessId, { nom: 'Gratuit' }),
      /row-level security|permission denied/i);
  });

  test('il ne peut pas générer ni republier le commerce', async () => {
    /* La base REFUSE l'insertion : plus net qu'un résultat vide. La
       transaction est annulée, donc rien n'est publié ni créé. */
    await assert.rejects(
      () => depot.genererCommerce(U.intrus, businessId, ['page']),
      /row-level security|permission denied/i);
  });
});
