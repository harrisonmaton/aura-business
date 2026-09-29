'use strict';
/* OMEGA HUNTER — du profil client idéal aux prospects notés.

   Trois règles, vérifiées par la recette :
   1. Un prospect est une ENTREPRISE, jamais une personne. Aucun nom de gérant,
      aucune fonction, aucun téléphone ou email personnel n'est accepté, même
      si la source le fournit : ces champs sont retirés à l'entrée.
   2. Ce qui n'est pas connu vaut « UNKNOWN ». Aucun champ n'est complété par
      déduction (pas d'email « contact@nom.be » supposé, pas de handle deviné).
   3. Chaque prospect garde sa source, sa date de collecte et une confiance. */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UNKNOWN = 'UNKNOWN';
const CHAMPS_PERSONNELS = ['nomContact', 'prenom', 'nomGerant', 'gerant', 'fonction', 'poste', 'emailPersonnel', 'telephonePersonnel', 'mobile', 'contactPersonne', 'proprietaire'];

/* ── ICP ─────────────────────────────────────────────────────────────────── */

function chargerExperience(dossier){
  const d = path.isAbsolute(dossier) ? dossier : path.join(__dirname, '..', '..', dossier);
  return JSON.parse(fs.readFileSync(path.join(d, 'experience.json'), 'utf8'));
}

/* Profil client idéal d'une offre. Tiré de l'expérience si elle existe ; les
   choix provisoires y sont marqués « hypothese » et remontent ici. */
function icp(experience, catalogue){
  const i = experience.icp;
  const ref = experience.offre.catalogue;
  const produit = (ref.genre === 'ready' ? catalogue.ready : catalogue.brief).find(p => p.id === ref.id);
  if(!produit) throw new Error('offre absente du catalogue : ' + JSON.stringify(ref));
  const zones = Array.isArray(i.zones) ? i.zones : i.zones.valeur;
  const hypotheses = [];
  if(i.zones && i.zones.hypothese) hypotheses.push('zone ' + zones.join(', ') + ' — ' + i.zones.motif);
  return {
    offre: {nom: produit.name, prix: produit.price, visuels: produit.visuals, textes: produit.texts, messages: produit.messages, bio: produit.bio, delai: produit.delay},
    industries: i.industries, taille: i.taille, pays: i.pays, zones, douleurs: i.douleurs,
    proxyBudget: i.proxyBudget, declencheurs: i.declencheurs,
    chaines: ((i.exclure || {}).chaines || []).map(c => c.toLowerCase()),
    scoreMin: (experience.criteres || {}).scoreMin ?? 50,
    fraicheurMaxJours: (experience.criteres || {}).fraicheurMaxJours ?? 180,
    hypotheses,
  };
}

/* ── Fiche prospect ───────────────────────────────────────────────────────── */

const inc = v => (v == null || v === '' ? UNKNOWN : v);
const normaliserHandle = h => {
  if(!h || h === UNKNOWN) return UNKNOWN;
  const m = String(h).trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9._]{1,30})\/?$/);
  return m ? m[1].toLowerCase() : UNKNOWN;
};
const domaine = u => { try { return new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch(_){ return null; } };

function cleDedoublonnage(e){
  const ig = normaliserHandle(e.instagram);
  if(ig !== UNKNOWN) return 'ig:' + ig;
  const d = e.siteWeb && domaine(e.siteWeb);
  if(d) return 'web:' + d;
  return 'nom:' + String(e.nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') + '|' + String(e.codePostal || e.ville || '').toLowerCase();
}

/* Un email public est accepté s'il est générique (contact@, info@…). Une
   adresse au format prenom.nom@ est traitée comme personnelle et retirée :
   on ne sait pas si la personne a consenti à sa publication commerciale. */
function emailProfessionnel(email){
  if(!email || email === UNKNOWN) return UNKNOWN;
  const e = String(email).trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return UNKNOWN;
  const local = e.split('@')[0];
  if(/^[a-z]+[._-][a-z]+$/.test(local) && !/^(info|contact|hello|bonjour|commande|reservation|booking|order|admin|shop|team)[._-]/.test(local)) return UNKNOWN;
  return e;
}

function versProspect(etab, {source, collecteLe, confianceSource, venture, opportunite}){
  const retires = CHAMPS_PERSONNELS.filter(k => etab[k] != null);
  const email = emailProfessionnel(etab.emailPublic);
  return {
    id: 'lead_' + crypto.createHash('sha256').update(cleDedoublonnage(etab)).digest('hex').slice(0, 12),
    cle: cleDedoublonnage(etab),
    company: etab.nom,
    location: {pays: inc(etab.pays), ville: inc(etab.ville), codePostal: inc(etab.codePostal), adresse: inc(etab.adresse)},
    website: inc(etab.siteWeb),
    publicContactData: {
      instagram: normaliserHandle(etab.instagram),
      facebook: inc(etab.facebook),
      email,
      telephone: inc(etab.telephonePublic),
    },
    industry: inc(etab.activite),
    observations: (etab.observations || []).filter(o => o && o.fait && o.source),
    fitReason: null, possiblePain: null, confidence: 0,
    source: {id: source, url: inc(etab.sourceUrl), identifiant: inc(etab.identifiantSource), lot: etab.lot || null},
    freshness: collecteLe,
    status: 'NEW',
    venture, opportunite,
    champsRetires: retires.concat(etab.emailPublic && email === UNKNOWN ? ['emailPublic (personnel ou invalide)'] : []),
    confianceSource,
  };
}

/* ── LeadScore /100 ───────────────────────────────────────────────────────
   Huit composantes, chacune justifiée. Une composante calculée sur une donnée
   absente vaut peu et fait baisser la confiance : un score élevé sur des
   inconnues serait un mensonge poli. */

const POIDS = {problemFit: 20, offerFit: 15, companyFit: 15, contactability: 15, locationFit: 10, observedSignals: 10, urgency: 8, budget: 7};

function scorer(p, profil, {maintenant} = {}){
  const d = {}, pourquoi = [];
  let connues = 0;
  const ind = String(p.industry || '').toLowerCase();
  const typeConnu = ind !== 'unknown';
  const dansIcp = profil.industries.some(i => ind.includes(i));
  d.problemFit = dansIcp ? 20 : typeConnu ? 6 : 5;
  if(dansIcp){ connues++; pourquoi.push('activité dans le profil (' + p.industry + ')'); }

  const ig = p.publicContactData.instagram !== UNKNOWN, web = p.website !== UNKNOWN;
  d.offerFit = ig ? 15 : web ? 8 : 3;
  if(ig || web){ connues++; pourquoi.push(ig ? 'présent sur Instagram : l\'offre parle de son canal' : 'a un site : présence en ligne'); }

  const nom = String(p.company).toLowerCase();
  const chaine = profil.chaines.some(c => nom.includes(c));
  d.companyFit = chaine ? 0 : 12;
  if(chaine) pourquoi.push('chaîne exclue du profil');
  connues++;

  const email = p.publicContactData.email !== UNKNOWN, tel = p.publicContactData.telephone !== UNKNOWN;
  d.contactability = ig ? 15 : email ? 11 : tel ? 5 : 0;
  if(d.contactability){ connues++; pourquoi.push('joignable par ' + (ig ? 'message Instagram' : email ? 'email professionnel public' : 'téléphone public')); }

  const ville = String(p.location.ville).toLowerCase();
  const zone = profil.zones.some(z => ville.includes(z.toLowerCase()));
  d.locationFit = zone ? 10 : p.location.pays === profil.pays ? 5 : 0;
  if(p.location.ville !== UNKNOWN) connues++;
  if(zone) pourquoi.push('dans la zone ' + p.location.ville);

  d.observedSignals = Math.min(p.observations.length * 5, 10);
  if(p.observations.length){ connues++; pourquoi.push(p.observations.length + ' observation(s) vérifiée(s)'); }

  const declencheur = p.observations.find(o => o.declencheur);
  d.urgency = declencheur ? 8 : 0;
  if(declencheur){ connues++; pourquoi.push('déclencheur : ' + declencheur.fait); }

  d.budget = (web ? 4 : 0) + (ig ? 3 : 0);

  const total = Object.values(d).reduce((a, b) => a + b, 0);
  const age = maintenant && p.freshness ? (Date.parse(maintenant) - Date.parse(p.freshness)) / 86400000 : 0;
  const perime = age > profil.fraicheurMaxJours;
  const confidence = Math.round((connues / 8) * (p.confianceSource ?? 0.5) * (perime ? 0.5 : 1) * 100) / 100;
  /* Qualifié = joignable par un canal que le pipeline sait utiliser. Un
     téléphone public compte dans le score mais ne qualifie pas : aucun envoi
     téléphonique n'est prévu, et un prospect qu'on ne peut pas contacter
     bloquerait l'entonnoir sans jamais avancer. */
  const qualifie = total >= profil.scoreMin && (ig || email) && !chaine;
  return {
    score: total, detail: d, pourquoi, confidence, qualifie, perime,
    fitReason: pourquoi.join(' ; ') || UNKNOWN,
    possiblePain: ig ? 'hypothèse : ' + profil.douleurs[0] : 'hypothèse : ' + profil.douleurs[1],
  };
}

module.exports = {UNKNOWN, CHAMPS_PERSONNELS, POIDS, chargerExperience, icp, versProspect, scorer, cleDedoublonnage, normaliserHandle, emailProfessionnel};
