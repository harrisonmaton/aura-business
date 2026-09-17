/* Le vertical est de la configuration : ces contrôles vérifient qu'il reste
   cohérent, et surtout qu'aucune logique métier n'a fui dans le cœur. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { food } from '../dist-test/verticals/food/index.js';
import { FacturationFactice, PLANS } from '../dist-test/billing/fournisseur.js';

describe('vertical food', () => {

  test('les cinq écrans validés, dans l’ordre', () => {
    assert.deepEqual(food.ecrans.map(e => e.id),
      ['business', 'brand', 'products', 'customers', 'review']);
  });

  test('chaque champ est rattaché à un écran qui existe', () => {
    const ecrans = new Set(food.ecrans.map(e => e.id));
    for (const c of food.champs) {
      assert.ok(ecrans.has(c.ecran), `${c.cle} pointe vers un écran inconnu : ${c.ecran}`);
    }
  });

  test('deux champs obligatoires au maximum', () => {
    /* Chaque champ obligatoire de plus est un commerçant qui abandonne
       l'inscription. Ce contrôle est là pour faire mal si quelqu'un en
       rajoute sans y penser. */
    const requis = food.champs.filter(c => c.requis).map(c => c.cle);
    assert.ok(requis.length <= 2, `trop de champs obligatoires : ${requis.join(', ')}`);
    assert.ok(requis.includes('nom'));
  });

  test('tout champ « choix » propose des options', () => {
    for (const c of food.champs.filter(c => c.type === 'choix')) {
      assert.ok(Array.isArray(c.options) && c.options.length > 1, `${c.cle} sans options`);
    }
  });

  test('les QR du pilote sont tous couverts par un libellé', async () => {
    const { LIBELLES } = await import('../dist-test/core/qr.js');
    for (const q of food.qr) assert.ok(LIBELLES[q], `libellé manquant pour ${q}`);
  });

  test('aucune clé de champ en double', () => {
    const cles = food.champs.map(c => c.cle);
    assert.equal(new Set(cles).size, cles.length);
  });
});

describe('facturation — contrat', () => {

  test('un checkout retient le commerce concerné', async () => {
    /* C'est l'identifiant du commerce qu'on relira dans le webhook. Se fier à
       une session en cours casse dès que le client paie depuis un autre
       appareil. */
    const f = new FacturationFactice();
    const s = await f.creerCheckout({ businessId: 'b-1', plan: 'pro',
      email: 'x@y.fr', retourSucces: 'https://a/ok', retourAnnule: 'https://a/no' });
    assert.ok(s.url.includes(s.id));
    assert.equal(f.sessions[0].businessId, 'b-1');
  });

  test('une signature invalide est refusée', async () => {
    const f = new FacturationFactice();
    const corps = JSON.stringify({ id: 'evt_1', type: 'abonnement.actif' });
    await assert.rejects(() => f.lireEvenement(corps, 'n-importe-quoi'), /signature/i);
  });

  test('un événement signé devient un événement du domaine', async () => {
    const f = new FacturationFactice();
    const corps = JSON.stringify({ id: 'evt_2', type: 'abonnement.actif',
      businessId: 'b-1', plan: 'pro', statut: 'actif' });
    const e = await f.lireEvenement(corps, f.signer(corps));
    assert.equal(e.type, 'abonnement.actif');
    assert.equal(e.businessId, 'b-1');
    /* Le reste de l'application ne voit jamais un objet Stripe. */
    assert.equal('object' in e, false);
  });

  test('les plans vivent en un seul endroit, en centimes', () => {
    assert.equal(PLANS.free.cents, 0);
    for (const p of Object.values(PLANS)) {
      assert.ok(Number.isInteger(p.cents), 'un prix en flottant finit par afficher 3,99');
    }
  });
});
