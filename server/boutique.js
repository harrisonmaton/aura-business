'use strict';
/* Noyau commercial d'Aura — prix, commandes, événements de paiement, accès.

   Ce module est délibérément sans serveur HTTP et sans dépendance : il contient
   les décisions qu'aucun navigateur ne doit pouvoir prendre. Il tourne et se
   teste en local aujourd'hui, et se branche derrière n'importe quelle route
   serveur le jour où il y en a une (Next.js, Vercel, Workers).

   Règle directrice : le navigateur propose, le serveur décide. Un montant, un
   droit d'accès ou un statut de commande qui viendrait du client est ignoré. */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');

/* ── 1. Catalogue : la seule autorité sur les prix ────────────────────────── */

function chargerCatalogue(){
  return JSON.parse(fs.readFileSync(path.join(RACINE, 'src', 'catalog.json'), 'utf8'));
}

/* La version d'un produit est l'empreinte de ce qu'il promet. Si le contenu
   change, la version change, et une commande passée reste attachée à la
   version achetée — pas à la version courante. */
function versionProduit(p){
  const empreinte = JSON.stringify([p.name, p.price, p.visuals, p.texts, p.bio, p.assets]);
  return 'v' + crypto.createHash('sha256').update(empreinte).digest('hex').slice(0, 12);
}

function produit(genre, id, catalogue){
  const cat = catalogue || chargerCatalogue();
  const liste = genre === 'ready' ? cat.ready : cat.brief;
  const p = liste.find(x => x.id === Number(id));
  if(!p) return null;
  return Object.assign({}, p, {genre, version: versionProduit(p)});
}

/* Un produit n'est vendable que si les fichiers promis existent réellement.
   Le compteur du catalogue ne suffit pas : on vérifie le disque. */
function inventaire(genre, id, catalogue){
  const p = produit(genre, id, catalogue);
  if(!p) return {vendable:false, motif:'produit_inconnu', fichiers:[]};
  if(p.genre === 'brief'){
    /* Une prestation sur mesure n'a pas de fichiers préexistants : elle est
       commandable, mais elle ne se livre jamais automatiquement. */
    return {vendable:true, livraisonImmediate:false, fichiers:[], produit:p};
  }
  const dossier = path.join(RACINE, 'src', 'collections', p.name.toLowerCase());
  const entrees = fs.existsSync(dossier)
    ? fs.readdirSync(dossier).filter(f => !f.startsWith('.')).sort()
    : [];
  /* Compter n'établit rien : neuf fichiers vides passeraient. On vérifie le
     format ET le contenu de chacun — un PNG doit commencer par sa signature et
     faire un poids plausible, une légende doit contenir du texte. Un dossier
     rempli de fichiers de zéro octet n'est pas un produit livrable. */
  const fichiers = [], defauts = [];
  for(const f of entrees){
    const chemin = path.join(dossier, f);
    if(!fs.statSync(chemin).isFile()){ defauts.push({f, motif:'pas_un_fichier'}); continue; }
    const taille = fs.statSync(chemin).size;
    if(/\.png$/i.test(f)){
      const tete = Buffer.alloc(8);
      const fd = fs.openSync(chemin, 'r');
      fs.readSync(fd, tete, 0, 8, 0);
      fs.closeSync(fd);
      const SIGNATURE = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
      if(!tete.equals(SIGNATURE)){ defauts.push({f, motif:'png_invalide'}); continue; }
      if(taille < 8 * 1024){ defauts.push({f, motif:'png_trop_leger', taille}); continue; }
    } else if(/\.txt$/i.test(f)){
      if(fs.readFileSync(chemin, 'utf8').trim().length < 40){
        defauts.push({f, motif:'texte_vide'}); continue;
      }
    }
    fichiers.push(f);
  }
  const visuels = fichiers.filter(f => /\.png$/i.test(f)).length;
  const textes  = fichiers.filter(f => /-legende\.txt$/i.test(f)).length;
  if(fichiers.length === 0)
    return {visuels, textes, vendable:false, motif:'assets_missing', fichiers, defauts, produit:p};
  if(visuels < (p.visuals || 0) || textes < (p.texts || 0))
    return {visuels, textes, vendable:false, motif:'inventaire_incomplet', fichiers, defauts,
            attendus:{visuels:p.visuals || 0, textes:p.texts || 0}, produit:p};
  return {visuels, textes, vendable:true, livraisonImmediate:true, fichiers, defauts, produit:p};
}

/* ── 2. Magasin : persistance remplaçable ─────────────────────────────────── */

/* Un objet en mémoire adossé à un fichier JSON. L'interface est volontairement
   étroite pour qu'une vraie base (Postgres, Supabase) la remplace sans toucher
   au reste. Le stockage navigateur n'entre jamais ici : ce registre est la
   source commerciale, pas un cache d'affichage. */
function creerMagasin(chemin){
  let data = {commandes:{}, evenements:{}, acces:{}, journal:[]};
  if(chemin && fs.existsSync(chemin)) data = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  const sauver = () => { if(chemin) fs.writeFileSync(chemin, JSON.stringify(data, null, 2)); };
  return {
    lireCommande: id => data.commandes[id] ? JSON.parse(JSON.stringify(data.commandes[id])) : null,
    ecrireCommande: c => { data.commandes[c.id] = c; sauver(); return c; },
    commandeParSession: sid =>
      Object.values(data.commandes).find(c => c.sessionPaiement === sid) || null,
    /* Retourne false si l'événement a déjà été vu : c'est le verrou
       d'idempotence, et il est posé AVANT tout traitement. */
    marquerEvenement: (id, meta) => {
      if(data.evenements[id]) return false;
      data.evenements[id] = Object.assign({recuLe: Date.now()}, meta || {});
      sauver(); return true;
    },
    evenementVu: id => !!data.evenements[id],
    ecrireAcces: a => { data.acces[a.id] = a; sauver(); return a; },
    lireAcces: id => data.acces[id] ? JSON.parse(JSON.stringify(data.acces[id])) : null,
    accesDeCommande: cid => Object.values(data.acces).filter(a => a.commande === cid),
    journaliser: (etape, detail) => { data.journal.push({t:Date.now(), etape, detail}); sauver(); },
    journal: () => data.journal.slice(),
    tout: () => JSON.parse(JSON.stringify(data))
  };
}

/* ── 3. Commandes ─────────────────────────────────────────────────────────── */

const ETATS = ['creee', 'payee', 'livree', 'remboursee', 'echouee'];

/* Le montant n'est JAMAIS un paramètre. Il est calculé ici à partir du
   catalogue. Un client qui poste « prix: 1 » obtient le prix réel. */
function creerCommande(magasin, {genre, produitId, client, sessionPaiement}){
  const inv = inventaire(genre, produitId);
  if(!inv.produit) return {erreur:'produit_inconnu'};
  if(!inv.vendable) return {erreur:inv.motif, produit:inv.produit.name};
  if(!client || !client.id) return {erreur:'client_requis'};

  const c = {
    id: 'cmd_' + crypto.randomBytes(9).toString('hex'),
    creeeLe: Date.now(),
    etat: 'creee',
    genre,
    produit: inv.produit.name,
    produitId: Number(produitId),
    versionAchetee: inv.produit.version,
    montantCentimes: inv.produit.price * 100,   /* autorité serveur */
    devise: 'eur',
    livraisonImmediate: inv.livraisonImmediate,
    client: {id: client.id, email: client.email || null},
    sessionPaiement: sessionPaiement || null,
    emailEnvoye: false,
    tentativesEmail: 0
  };
  magasin.ecrireCommande(c);
  magasin.journaliser('commande_creee', {commande:c.id, montant:c.montantCentimes});
  return {commande:c};
}

/* ── 4. Vérification de signature Stripe ──────────────────────────────────── */

/* Implémentée d'après la procédure manuelle documentée par Stripe :
   en-tête « t=…,v1=…,v0=… », charge signée « timestamp.corpsBrut »,
   HMAC-SHA256 avec le secret de terminaison, comparaison en temps constant.
   Les schémas autres que v1 sont ignorés — v0 n'est qu'une aide de test, et
   l'accepter ouvrirait une attaque par rétrogradation. */
function verifierSignature(corpsBrut, entete, secret, {tolerance = 300, maintenant} = {}){
  if(typeof corpsBrut !== 'string') return {ok:false, motif:'corps_non_brut'};
  if(!entete || !secret)            return {ok:false, motif:'signature_ou_secret_absent'};

  const elements = String(entete).split(',').map(x => x.split('='));
  const t  = elements.filter(e => e[0].trim() === 't').map(e => e[1])[0];
  const v1 = elements.filter(e => e[0].trim() === 'v1').map(e => e[1]);
  if(!t || !v1.length) return {ok:false, motif:'entete_malformee'};

  const horodatage = Number(t);
  if(!Number.isFinite(horodatage)) return {ok:false, motif:'horodatage_invalide'};

  const now = Math.floor((maintenant !== undefined ? maintenant : Date.now()) / 1000);
  if(Math.abs(now - horodatage) > tolerance) return {ok:false, motif:'horodatage_hors_tolerance'};

  const attendue = crypto.createHmac('sha256', secret)
    .update(horodatage + '.' + corpsBrut, 'utf8').digest('hex');

  /* Plusieurs v1 peuvent coexister pendant une rotation de secret. */
  const attenduBuf = Buffer.from(attendue, 'utf8');
  const correspond = v1.some(sig => {
    const b = Buffer.from(String(sig).trim(), 'utf8');
    return b.length === attenduBuf.length && crypto.timingSafeEqual(b, attenduBuf);
  });
  return correspond ? {ok:true, horodatage} : {ok:false, motif:'signature_non_correspondante'};
}

/* Utilitaire de test : fabrique un en-tête valide. Sert uniquement à prouver
   que la vérification accepte le bon et refuse le reste. */
function signerPourTest(corpsBrut, secret, horodatage){
  const t = horodatage || Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(t + '.' + corpsBrut, 'utf8').digest('hex');
  return `t=${t},v1=${v1}`;
}

/* ── 5. Traitement d'un événement de paiement ─────────────────────────────── */

/* Idempotent par construction : le verrou est posé sur l'identifiant de
   l'événement avant tout effet. Un doublon, un retard ou un désordre ne
   produit ni seconde commande ni second droit d'accès. */
function traiterEvenement(magasin, corpsBrut, entete, secret, options = {}){
  const v = verifierSignature(corpsBrut, entete, secret, options);
  if(!v.ok){
    magasin.journaliser('evenement_refuse', {motif:v.motif});
    return {ok:false, motif:v.motif, http:400};
  }

  let ev;
  try { ev = JSON.parse(corpsBrut); }
  catch(e){ return {ok:false, motif:'json_invalide', http:400}; }
  if(!ev || !ev.id) return {ok:false, motif:'evenement_sans_id', http:400};

  /* Environnement attendu : un événement de production ne doit jamais être
     traité par une instance de test, ni l'inverse. */
  if(options.livemodeAttendu !== undefined && ev.livemode !== options.livemodeAttendu){
    magasin.journaliser('evenement_refuse', {evenement:ev.id, motif:'mauvais_environnement'});
    return {ok:false, motif:'mauvais_environnement', http:400};
  }

  if(!magasin.marquerEvenement(ev.id, {type:ev.type})){
    magasin.journaliser('evenement_doublon', {evenement:ev.id});
    return {ok:true, doublon:true, http:200};
  }

  if(ev.type !== 'checkout.session.completed'){
    return {ok:true, ignore:ev.type, http:200};
  }

  const s = (ev.data && ev.data.object) || {};
  const commande = magasin.commandeParSession(s.id);
  if(!commande){
    magasin.journaliser('evenement_sans_commande', {evenement:ev.id, session:s.id});
    return {ok:false, motif:'commande_introuvable', http:404};
  }

  /* Le montant annoncé par l'événement doit correspondre au montant calculé
     par le serveur à la création. Sinon on ne livre pas. */
  if(Number(s.amount_total) !== commande.montantCentimes ||
     String(s.currency).toLowerCase() !== commande.devise){
    magasin.journaliser('montant_divergent', {
      commande:commande.id, attendu:commande.montantCentimes, recu:s.amount_total});
    return {ok:false, motif:'montant_divergent', http:400};
  }
  if(s.payment_status !== 'paid'){
    magasin.journaliser('paiement_non_confirme', {commande:commande.id, etat:s.payment_status});
    return {ok:true, differe:true, http:200};
  }

  commande.etat = 'payee';
  commande.payeeLe = Date.now();
  magasin.ecrireCommande(commande);
  magasin.journaliser('paiement_confirme', {commande:commande.id, evenement:ev.id});

  const acces = commande.livraisonImmediate ? accorderAcces(magasin, commande) : null;
  return {ok:true, commande:commande.id, acces:acces && acces.id, http:200};
}

/* ── 6. Droits d'accès et liens de téléchargement ─────────────────────────── */

const DUREE_LIEN_MS = 15 * 60 * 1000;

function accorderAcces(magasin, commande){
  const existant = magasin.accesDeCommande(commande.id)[0];
  if(existant) return existant;                  /* idempotent */
  const inv = inventaire(commande.genre, commande.produitId);
  const a = {
    id: 'acc_' + crypto.randomBytes(9).toString('hex'),
    commande: commande.id,
    client: commande.client.id,
    produit: commande.produit,
    /* Le genre voyage avec l'accès : « Street » seul ne dit pas s'il s'agit
       d'une collection ou d'une prestation sur brief, et c'est sur cette
       distinction que repose la livraison automatique. */
    genre: commande.genre,
    produitId: commande.produitId,
    version: commande.versionAchetee,           /* la version achetée, pas la courante */
    fichiers: inv.fichiers,
    accordeLe: Date.now()
  };
  magasin.ecrireAcces(a);
  commande.etat = 'livree';
  magasin.ecrireCommande(commande);
  magasin.journaliser('acces_accorde', {commande:commande.id, acces:a.id, fichiers:a.fichiers.length});
  return a;
}

/* Le lien est signé et expire. Il ne donne jamais accès au disque : il porte
   l'identifiant d'accès, que le serveur revérifie à l'ouverture. */
function creerLien(acces, secret, {duree = DUREE_LIEN_MS, maintenant} = {}){
  const exp = (maintenant !== undefined ? maintenant : Date.now()) + duree;
  const charge = `${acces.id}.${acces.client}.${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(charge).digest('hex');
  return {jeton:`${charge}.${sig}`, expireLe:exp};
}

/* Deux refus distincts et tous deux nécessaires : un jeton périmé, et un jeton
   valide présenté par quelqu'un d'autre. Le second est le cas qui compte —
   sans lui, un lien qui fuite donne accès à la commande d'autrui. */
function ouvrirLien(magasin, jeton, secret, clientDemandeur, {maintenant} = {}){
  const parts = String(jeton).split('.');
  if(parts.length !== 4) return {ok:false, motif:'jeton_malforme'};
  const [accesId, client, expStr, sig] = parts;
  const charge = `${accesId}.${client}.${expStr}`;
  const attendue = crypto.createHmac('sha256', secret).update(charge).digest('hex');
  const a = Buffer.from(sig, 'utf8'), b = Buffer.from(attendue, 'utf8');
  if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) return {ok:false, motif:'signature_invalide'};

  const now = maintenant !== undefined ? maintenant : Date.now();
  if(now > Number(expStr)) return {ok:false, motif:'jeton_expire'};

  const acces = magasin.lireAcces(accesId);
  if(!acces) return {ok:false, motif:'acces_inconnu'};
  if(acces.client !== clientDemandeur) {
    magasin.journaliser('acces_refuse_autre_client', {acces:accesId, demandeur:clientDemandeur});
    return {ok:false, motif:'client_different'};
  }
  return {ok:true, acces};
}

/* ── 7. Confirmation par email ────────────────────────────────────────────── */

/* L'envoi est un effet secondaire, jamais une condition. Son échec est
   enregistré et réessayable ; il ne retire pas l'accès déjà accordé, sinon une
   panne de messagerie effacerait un achat payé. */
function envoyerConfirmation(magasin, commande, transport){
  commande.tentativesEmail = (commande.tentativesEmail || 0) + 1;
  let resultat;
  try { resultat = transport(commande); }
  catch(e){ resultat = {ok:false, erreur:e.message}; }
  commande.emailEnvoye = !!(resultat && resultat.ok);
  magasin.ecrireCommande(commande);
  magasin.journaliser(commande.emailEnvoye ? 'email_envoye' : 'email_echoue',
    {commande:commande.id, tentative:commande.tentativesEmail});
  return {envoye:commande.emailEnvoye, accesPreserve:true};
}

/* Récupération : un client qui a payé retrouve sa commande et un lien neuf,
   même si l'email n'est jamais parti et même après expiration du premier lien. */
function recupererAcces(magasin, clientId, secret, options){
  const tout = magasin.tout();
  return Object.values(tout.acces)
    .filter(a => a.client === clientId)
    .map(a => ({acces:a, lien:creerLien(a, secret, options)}));
}

module.exports = {
  chargerCatalogue, produit, versionProduit, inventaire,
  creerMagasin, creerCommande, ETATS,
  verifierSignature, signerPourTest, traiterEvenement,
  accorderAcces, creerLien, ouvrirLien,
  envoyerConfirmation, recupererAcces,
  DUREE_LIEN_MS
};
