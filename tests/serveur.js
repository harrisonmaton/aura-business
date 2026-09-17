'use strict';
/* Recette du noyau commercial. Chaque scénario correspond à une manière dont
   une boutique perd de l'argent ou trahit un client : prix manipulé, événement
   rejoué, lien qui fuite, panne d'email, produit vide vendu quand même.

   Ces tests sont des SIMULATIONS locales : ils construisent des événements et
   les signent avec un secret de test. Ils prouvent la logique, pas la
   connexion à Stripe. Un test de bout en bout avec Stripe sandbox reste à
   faire quand le compte sandbox et une URL accessible existeront. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../server/boutique.js');

const R = [];
const ck = (nom, fn) => {
  try { fn(); R.push('PASS  — ' + nom); }
  catch(e){ R.push('ÉCHEC — ' + nom + '\n        ' + (e && e.message)); }
};

const SECRET_WH = 'whsec_secret_de_test_local_seulement';
const SECRET_LIEN = 'lien_secret_de_test_local_seulement';
const CLIENT = {id:'cli_alice', email:'alice@example.test'};
const AUTRE   = 'cli_bob';

function magasinNeuf(){
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aura-')), 'magasin.json');
  return B.creerMagasin(f);
}

/* Une collection complète, fabriquée sur disque pour la durée du test.
   On n'invente pas un inventaire : on en crée un vrai, puis on le retire. */
/* Fabrique une collection de test sur le disque. Deux règles :
   — elle REFUSE d'écrire dans un dossier existant, pour ne jamais polluer un
     produit réellement livrable (l'ancienne version ajoutait ses fichiers dans
     le vrai dossier Street dès que celui-ci a existé) ;
   — elle produit des fichiers que le contrôle d'inventaire accepte : un PNG
     doit porter sa signature et peser plus de 8 Ko, une légende doit contenir
     du texte. Écrire huit fichiers vides ne doit rien débloquer. */
function avecCollection(nom, {visuels = 0, textes = 0, pngValide = true, poidsPng = 12 * 1024} = {}, fn){
  const dossier = path.join(__dirname, '..', 'src', 'collections', nom.toLowerCase());
  if(fs.existsSync(dossier))
    throw new Error('refus : ' + dossier + ' existe déjà — une fixture ne doit pas écrire dans un vrai produit');
  fs.mkdirSync(dossier, {recursive:true});
  const SIGNATURE = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  try {
    for(let i = 1; i <= visuels; i++){
      const tete = pngValide ? SIGNATURE : Buffer.from('PAS UN PNG');
      fs.writeFileSync(path.join(dossier, `0${i}-visuel.png`),
        Buffer.concat([tete, Buffer.alloc(poidsPng)]));
    }
    for(let i = 1; i <= textes; i++)
      fs.writeFileSync(path.join(dossier, `0${i}-legende.txt`),
        'Légende de démonstration numéro ' + i + ', assez longue pour être acceptée.');
    return fn();
  } finally { fs.rmSync(dossier, {recursive:true, force:true}); }
}

function evenement(session, {id, type = 'checkout.session.completed', livemode = false} = {}){
  return JSON.stringify({
    id: id || 'evt_' + Math.random().toString(16).slice(2),
    type, livemode, data: {object: session}
  });
}

/* ── Catalogue et inventaire ───────────────────────────────────────────────── */

ck('le prix vient du serveur, jamais du client', () => {
  const m = magasinNeuf();
  const cat = B.chargerCatalogue();
  const signature = cat.brief.find(p => p.name === 'Signature');
  /* On tente d'imposer 1 centime : le paramètre n'existe même pas. */
  const {commande} = B.creerCommande(m, {genre:'brief', produitId:signature.id, client:CLIENT,
                                          montantCentimes: 1, prix: 1});
  assert.strictEqual(commande.montantCentimes, signature.price * 100,
    `montant ${commande.montantCentimes} au lieu de ${signature.price * 100}`);
});

/* Street est devenue livrable : le cas « aucun fichier » se vérifie sur une
   collection qui l'est encore, sinon le contrôle testerait le contraire de son
   intention sans rougir. */
ck('une collection sans fichier ne peut pas être commandée', () => {
  const cat = B.chargerCatalogue();
  const vide = cat.ready.find(r => !(r.assets > 0));
  assert.ok(vide, 'aucune collection vide dans le catalogue : ce contrôle n\'a plus de sujet');
  const m = magasinNeuf();
  const r = B.creerCommande(m, {genre:'ready', produitId:vide.id, client:CLIENT});
  assert.strictEqual(r.erreur, 'assets_missing', 'erreur reçue : ' + JSON.stringify(r));
  assert.ok(!r.commande, 'une commande a été créée malgré un inventaire vide');
});

ck('un inventaire partiel bloque aussi la vente', () => {
  const cat = B.chargerCatalogue();
  const nuit = cat.ready.find(r => r.name === 'Night');   /* en promet 8 + 8 */
  avecCollection('Night', {visuels:3, textes:3}, () => {
    const m = magasinNeuf();
    const r = B.creerCommande(m, {genre:'ready', produitId:nuit.id, client:CLIENT});
    assert.strictEqual(r.erreur, 'inventaire_incomplet', JSON.stringify(r));
  });
});

/* Le mandat le demande explicitement : vérifier le format et le contenu, pas
   seulement le nombre. Ces deux contrôles échouaient avant le renforcement. */
ck('le bon nombre de fichiers ne suffit pas : un PNG invalide bloque la vente', () => {
  const cat = B.chargerCatalogue();
  const nuit = cat.ready.find(r => r.name === 'Night');
  avecCollection('Night', {visuels:nuit.visuals, textes:nuit.texts, pngValide:false}, () => {
    const inv = B.inventaire('ready', nuit.id);
    assert.ok(!inv.vendable, 'des PNG sans signature ont été acceptés');
    assert.ok(inv.defauts.some(d => d.motif === 'png_invalide'), JSON.stringify(inv.defauts));
  });
});

ck('un PNG de quelques octets ne compte pas comme un visuel', () => {
  const cat = B.chargerCatalogue();
  const nuit = cat.ready.find(r => r.name === 'Night');
  avecCollection('Night', {visuels:nuit.visuals, textes:nuit.texts, poidsPng:200}, () => {
    const inv = B.inventaire('ready', nuit.id);
    assert.ok(!inv.vendable, 'des PNG de 200 octets ont été acceptés comme visuels');
    assert.ok(inv.defauts.some(d => d.motif === 'png_trop_leger'), JSON.stringify(inv.defauts));
  });
});

ck('une collection complète devient commandable', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const m = magasinNeuf();
    const {commande, erreur} = B.creerCommande(m, {genre:'ready', produitId:street.id, client:CLIENT});
    assert.ok(!erreur, 'erreur : ' + erreur);
    assert.strictEqual(commande.montantCentimes, street.price * 100);
    assert.strictEqual(commande.livraisonImmediate, true);
  });
});

ck('une prestation sur mesure n\'est jamais en livraison immédiate', () => {
  const m = magasinNeuf();
  const {commande} = B.creerCommande(m, {genre:'brief', produitId:2, client:CLIENT});
  assert.strictEqual(commande.livraisonImmediate, false);
});

/* ── Signature de l'événement ──────────────────────────────────────────────── */

ck('un événement correctement signé est accepté', () => {
  const corps = evenement({id:'cs_1', amount_total:9000, currency:'eur', payment_status:'paid'});
  const r = B.verifierSignature(corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH);
  assert.ok(r.ok, r.motif);
});

ck('une signature invalide est refusée', () => {
  const corps = evenement({id:'cs_1', amount_total:9000, currency:'eur', payment_status:'paid'});
  const entete = B.signerPourTest(corps, 'whsec_mauvais_secret');
  assert.strictEqual(B.verifierSignature(corps, entete, SECRET_WH).ok, false);
});

ck('un corps modifié après signature est refusé', () => {
  const corps = evenement({id:'cs_1', amount_total:9000, currency:'eur', payment_status:'paid'});
  const entete = B.signerPourTest(corps, SECRET_WH);
  const falsifie = corps.replace('9000', '100');
  assert.strictEqual(B.verifierSignature(falsifie, entete, SECRET_WH).ok, false);
});

ck('un horodatage trop ancien est refusé (rejeu)', () => {
  const corps = evenement({id:'cs_1', amount_total:9000, currency:'eur', payment_status:'paid'});
  const vieux = Math.floor(Date.now()/1000) - 3600;
  const entete = B.signerPourTest(corps, SECRET_WH, vieux);
  const r = B.verifierSignature(corps, entete, SECRET_WH);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motif, 'horodatage_hors_tolerance');
});

ck('le schéma v0 seul ne suffit pas (attaque par rétrogradation)', () => {
  const corps = evenement({id:'cs_1', amount_total:9000, currency:'eur', payment_status:'paid'});
  const t = Math.floor(Date.now()/1000);
  const v0 = require('crypto').createHmac('sha256', SECRET_WH).update(t+'.'+corps).digest('hex');
  const r = B.verifierSignature(corps, `t=${t},v0=${v0}`, SECRET_WH);
  assert.strictEqual(r.ok, false, 'un en-tête sans v1 a été accepté');
});

ck('un corps déjà transformé en objet est refusé', () => {
  const r = B.verifierSignature({id:'evt_1'}, 't=1,v1=abc', SECRET_WH);
  assert.strictEqual(r.motif, 'corps_non_brut');
});

/* ── Parcours complet ──────────────────────────────────────────────────────── */

function parcoursPaye(){
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  const m = magasinNeuf();
  const {commande} = B.creerCommande(m,
    {genre:'ready', produitId:street.id, client:CLIENT, sessionPaiement:'cs_ok'});
  const session = {id:'cs_ok', amount_total:street.price*100, currency:'eur', payment_status:'paid'};
  const corps = evenement(session, {id:'evt_paye'});
  const res = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH,
    {livemodeAttendu:false});
  return {m, commande, res, street, corps};
}

/* Ce contrôle ne s'appuie plus sur une fixture : il achète la collection Street
   réellement présente sur le disque, et vérifie que ce sont SES fichiers qui
   sont livrés — pas un nombre, les noms. */
ck('paiement confirmé : commande payée et accès accordé', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  const {m, commande, res} = parcoursPaye();
  assert.ok(res.ok, res.motif);
  assert.strictEqual(m.lireCommande(commande.id).etat, 'livree');
  const acces = m.accesDeCommande(commande.id);
  assert.strictEqual(acces.length, 1, acces.length + ' accès');
  const f = acces[0].fichiers;
  assert.ok(f.filter(x => /\.png$/.test(x)).length >= street.visuals,
    'visuels livrés : ' + f.filter(x => /\.png$/.test(x)).length);
  assert.ok(f.filter(x => /-legende\.txt$/.test(x)).length >= street.texts,
    'légendes livrées : ' + f.filter(x => /-legende\.txt$/.test(x)).length);
  assert.ok(f.includes('LISEZ-MOI.txt'), 'mode d\'emploi absent : ' + f.join(', '));
});

/* Le client doit recevoir CE qu'il a payé. Un accès qui livrerait les fichiers
   d'une autre collection passerait tous les contrôles de nombre. */
ck('l\'accès livre les fichiers du produit acheté, pas ceux d\'un autre', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  const {m, commande} = parcoursPaye();
  const acces = m.accesDeCommande(commande.id)[0];
  const surDisque = fs.readdirSync(
    path.join(__dirname, '..', 'src', 'collections', 'street')).filter(f => !f.startsWith('.')).sort();
  assert.deepStrictEqual(acces.fichiers.slice().sort(), surDisque,
    'livré : ' + acces.fichiers.join(', ') + '\nsur disque : ' + surDisque.join(', '));
  assert.strictEqual(acces.produit, street.name, 'produit livré : ' + acces.produit);
  assert.strictEqual(acces.genre, 'ready', 'genre livré : ' + acces.genre);
  assert.strictEqual(acces.produitId, street.id);
});

ck('événement dupliqué : aucun second accès, aucune double livraison', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande, corps} = parcoursPaye();
    const rejeu = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH,
      {livemodeAttendu:false});
    assert.strictEqual(rejeu.doublon, true, 'le doublon n\'a pas été détecté');
    assert.strictEqual(m.accesDeCommande(commande.id).length, 1, 'un second accès a été créé');
  });
});

ck('montant manipulé dans l\'événement : refus, aucun accès', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const m = magasinNeuf();
    const {commande} = B.creerCommande(m,
      {genre:'ready', produitId:street.id, client:CLIENT, sessionPaiement:'cs_x'});
    const corps = evenement({id:'cs_x', amount_total:100, currency:'eur', payment_status:'paid'},
      {id:'evt_x'});
    const r = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH);
    assert.strictEqual(r.motif, 'montant_divergent', JSON.stringify(r));
    assert.strictEqual(m.accesDeCommande(commande.id).length, 0, 'un accès a été accordé');
    assert.notStrictEqual(m.lireCommande(commande.id).etat, 'livree');
  });
});

ck('paiement refusé ou en attente : aucun accès', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const m = magasinNeuf();
    const {commande} = B.creerCommande(m,
      {genre:'ready', produitId:street.id, client:CLIENT, sessionPaiement:'cs_np'});
    const corps = evenement(
      {id:'cs_np', amount_total:street.price*100, currency:'eur', payment_status:'unpaid'},
      {id:'evt_np'});
    const r = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH);
    assert.strictEqual(r.differe, true, JSON.stringify(r));
    assert.strictEqual(m.accesDeCommande(commande.id).length, 0);
  });
});

ck('un événement du mauvais environnement est refusé', () => {
  const m = magasinNeuf();
  const corps = evenement({id:'cs_live', amount_total:4000, currency:'eur', payment_status:'paid'},
    {id:'evt_live', livemode:true});
  const r = B.traiterEvenement(m, corps, B.signerPourTest(corps, SECRET_WH), SECRET_WH,
    {livemodeAttendu:false});
  assert.strictEqual(r.motif, 'mauvais_environnement');
});

/* ── Accès et liens ────────────────────────────────────────────────────────── */

ck('le lien de téléchargement expire', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    const acces = m.accesDeCommande(commande.id)[0];
    const {jeton} = B.creerLien(acces, SECRET_LIEN, {duree:1000});
    const apres = B.ouvrirLien(m, jeton, SECRET_LIEN, CLIENT.id, {maintenant:Date.now() + 5000});
    assert.strictEqual(apres.motif, 'jeton_expire');
  });
});

ck('un autre client ne peut pas ouvrir le lien, même valide', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    const acces = m.accesDeCommande(commande.id)[0];
    const {jeton} = B.creerLien(acces, SECRET_LIEN);
    const vol = B.ouvrirLien(m, jeton, SECRET_LIEN, AUTRE);
    assert.strictEqual(vol.ok, false, 'un autre client a obtenu l\'accès');
    assert.strictEqual(vol.motif, 'client_different');
    const propre = B.ouvrirLien(m, jeton, SECRET_LIEN, CLIENT.id);
    assert.ok(propre.ok, 'le client légitime a été refusé');
  });
});

ck('un jeton falsifié est refusé', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    const acces = m.accesDeCommande(commande.id)[0];
    const {jeton} = B.creerLien(acces, SECRET_LIEN);
    const parts = jeton.split('.');
    parts[2] = String(Number(parts[2]) + 86400000);   /* on repousse l'expiration */
    const r = B.ouvrirLien(m, parts.join('.'), SECRET_LIEN, CLIENT.id);
    assert.strictEqual(r.motif, 'signature_invalide');
  });
});

ck('l\'accès porte la version achetée, pas la version courante', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    const acces = m.accesDeCommande(commande.id)[0];
    assert.strictEqual(acces.version, commande.versionAchetee);
    assert.ok(/^v[0-9a-f]{12}$/.test(acces.version), 'version : ' + acces.version);
  });
});

/* ── Email et récupération ─────────────────────────────────────────────────── */

ck('email en panne : l\'achat reste récupérable', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    const enPanne = () => { throw new Error('SMTP indisponible'); };
    const r = B.envoyerConfirmation(m, m.lireCommande(commande.id), enPanne);
    assert.strictEqual(r.envoye, false);
    assert.strictEqual(r.accesPreserve, true);
    /* L'accès existe toujours et un lien neuf peut être émis. */
    const recup = B.recupererAcces(m, CLIENT.id, SECRET_LIEN);
    assert.strictEqual(recup.length, 1, 'aucun accès récupérable');
    const ouvert = B.ouvrirLien(m, recup[0].lien.jeton, SECRET_LIEN, CLIENT.id);
    assert.ok(ouvert.ok, ouvert.motif);
    assert.strictEqual(m.lireCommande(commande.id).etat, 'livree');
  });
});

ck('une reprise après échec d\'email ne duplique pas l\'accès', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m, commande} = parcoursPaye();
    B.envoyerConfirmation(m, m.lireCommande(commande.id), () => { throw new Error('panne'); });
    const ok = B.envoyerConfirmation(m, m.lireCommande(commande.id), () => ({ok:true}));
    assert.strictEqual(ok.envoye, true);
    assert.strictEqual(m.accesDeCommande(commande.id).length, 1);
    assert.strictEqual(m.lireCommande(commande.id).tentativesEmail, 2);
  });
});

ck('chaque étape est journalisée', () => {
  const cat = B.chargerCatalogue();
  const street = cat.ready.find(r => r.name === 'Street');
  (() => {
    const {m} = parcoursPaye();
    const etapes = m.journal().map(x => x.etape);
    ['commande_creee','paiement_confirme','acces_accorde'].forEach(e =>
      assert.ok(etapes.includes(e), 'étape absente du journal : ' + e));
  });
});

/* ── Bilan ─────────────────────────────────────────────────────────────────── */

console.log(R.join('\n'));
const echecs = R.filter(x => x.startsWith('ÉCHEC')).length;
console.log(`\n${R.length} contrôles serveur — ${R.length - echecs} PASS, ${echecs} ÉCHEC`);
console.log('portée : simulation locale — la connexion réelle à Stripe sandbox reste à faire');
process.exit(echecs > 0 ? 1 : 0);
