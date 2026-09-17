/* Contrôles du cœur : validation des demandes, QR, messages préremplis.
   Aucun besoin de base ni de navigateur — ces modules sont purs, c'est
   précisément pour cela qu'ils sont séparés du reste. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validerDemande, transitionPermise, STATUTS } from '../dist-test/core/leads.js';
import { destination, lienWhatsApp, normaliserNumero, estInternational, messageEvenement } from '../dist-test/core/qr.js';

describe('validation des demandes', () => {

  test('une demande complète passe', () => {
    const r = validerDemande({ type: 'event', nom: 'Marie', telephone: '0470 12 34 56',
      date_evt: '2026-07-18', personnes: '40', lieu: 'Lille' });
    assert.equal(r.ok, true);
    assert.equal(r.valeur.personnes, 40);
    assert.equal(r.valeur.type, 'event');
  });

  test('sans nom, refus', () => {
    const r = validerDemande({ nom: '   ', telephone: '0470123456' });
    assert.equal(r.ok, false);
    assert.ok(r.refus.some(x => x.champ === 'nom'));
  });

  test('sans aucun moyen de rappel, refus', () => {
    /* Une demande qu'on ne peut pas rappeler est une demande perdue. */
    const r = validerDemande({ nom: 'Marie' });
    assert.equal(r.ok, false);
    assert.ok(r.refus.some(x => x.champ === 'contact'));
  });

  test('un événement sans date est refusé', () => {
    const r = validerDemande({ type: 'event', nom: 'Marie', telephone: '0470123456' });
    assert.equal(r.ok, false);
    assert.ok(r.refus.some(x => x.champ === 'date_evt'));
  });

  test('un type inconnu retombe sur « contact » au lieu de passer', () => {
    const r = validerDemande({ type: 'administrateur', nom: 'X', email: 'x@y.fr' });
    assert.equal(r.ok, true);
    assert.equal(r.valeur.type, 'contact');
  });

  test('les champs trop longs sont tronqués, pas rejetés', () => {
    const r = validerDemande({ nom: 'A'.repeat(500), email: 'x@y.fr' });
    assert.equal(r.ok, true);
    assert.equal(r.valeur.nom.length, 120);
  });

  test('les caractères de contrôle sont retirés', () => {
    /* Ils servent à casser les journaux et les exports CSV. */
    const sale = 'Marie' + String.fromCharCode(0) + String.fromCharCode(27) + '[31m';
    const r = validerDemande({ nom: sale, email: 'x@y.fr' });
    assert.equal(r.ok, true);
    assert.ok(!/[\u0000-\u001F]/.test(r.valeur.nom));
  });

  test('un nombre de personnes absurde est refusé', () => {
    for (const p of ['0', '-3', '2.5', '999999999']) {
      const r = validerDemande({ nom: 'X', email: 'x@y.fr', personnes: p });
      assert.equal(r.ok, false, `${p} aurait dû être refusé`);
    }
  });

  test('les transitions de statut sont contraintes', () => {
    assert.equal(transitionPermise('nouveau', 'reserve'), true);
    assert.equal(transitionPermise('reserve', 'nouveau'), false);
    assert.equal(transitionPermise('perdu', 'contacte'), true);
    assert.equal(STATUTS.length, 5);
  });
});

describe('QR et messages', () => {

  const ctx = { slug: 'glaces-alice', base: 'https://app.aura.test',
                whatsapp: '+32 470 12 34 56', avisUrl: null, nomCommerce: 'Glaces Alice' };

  test('les destinations pointent sur la page publique', () => {
    assert.equal(destination('page', ctx), 'https://app.aura.test/glaces-alice');
    assert.equal(destination('menu', ctx), 'https://app.aura.test/glaces-alice#carte');
    assert.equal(destination('booking', ctx), 'https://app.aura.test/glaces-alice#demande');
  });

  test('un QR sans information renvoie null plutôt qu’un lien mort', () => {
    /* Mieux vaut ne pas proposer le QR que d’en imprimer un qui ne mène nulle
       part — il est collé sur un véhicule pour des mois. */
    assert.equal(destination('avis', ctx), null);
    assert.equal(destination('whatsapp', { ...ctx, whatsapp: null }), null);
  });

  test('les numéros WhatsApp sont normalisés quelle que soit la saisie', () => {
    /* « 00 » est l'indicatif international, équivalent à « + ». Les trois
       écritures ci-dessous sont le MÊME numéro et doivent donner un seul
       lien : sans cette règle, deux personnes saisissant le même numéro
       obtenaient deux liens dont un invalide. */
    for (const n of ['+32 470 12 34 56', '0032470123456', '(0032) 470.12.34.56']) {
      assert.equal(normaliserNumero(n), '32470123456', `échec sur ${n}`);
    }
    assert.equal(normaliserNumero('123'), null);
  });

  test('un numéro en format national est signalé, pas deviné', () => {
    /* Deviner le pays produirait un lien qui appelle quelqu'un d'autre. */
    assert.equal(estInternational('0470123456'), false);
    assert.equal(estInternational('+32470123456'), true);
    assert.equal(estInternational('0032470123456'), true);
  });

  test('le lien WhatsApp encode le message', () => {
    const l = lienWhatsApp('+32470123456', 'Bonjour & merci');
    assert.ok(l.startsWith('https://wa.me/32470123456?text='));
    assert.ok(l.includes('%26'), 'le & doit être encodé');
  });

  test('le message d’événement se lit comme une phrase', () => {
    const m = messageEvenement({ nomCommerce: 'Glaces Alice', type: 'Anniversaire',
      date: '2026-07-18', personnes: 40, lieu: 'Lille' });
    assert.ok(m.includes('Glaces Alice'));
    assert.ok(m.includes('18 juillet 2026'));
    assert.ok(m.includes('40 personnes'));
    assert.ok(m.includes('Lille'));
  });

  test('le message reste correct quand tout est vide', () => {
    const m = messageEvenement({});
    assert.ok(m.startsWith('Bonjour,'));
    assert.ok(m.endsWith('.'));
  });
});
