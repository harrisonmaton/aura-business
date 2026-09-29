'use strict';
/* GENESIS-LITE — d'une opportunité validée à une expérience commerciale
   prête : offre, landing, plan de mesure, pipeline, critères, messages.

   Tout est dérivé du catalogue et de l'expérience. Ce qui n'est pas décidé
   (droits cédés, révisions, remboursement — BRIEF §10) n'est PAS écrit à la
   place du propriétaire : la FAQ omet ces réponses et les liste comme
   décisions dues. Pas de faux témoignage, pas de faux chiffre : la preuve
   affichée est la série de démonstration, présentée comme telle. */

const fs = require('fs');
const path = require('path');
const E = require('../core/etat.js');
const P = require('../hunter/prospects.js');
const C = require('../outreach/copie.js');
const CRM = require('../crm/crm.js');

const COMPTE_MAISON = 'polakpl_f44';   // documents/BRIEF-PRODUIT.md §5 — parcours de vente réel

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function offre(experience, profil){
  const o = profil.offre;
  const g = experience.offre.garantie;
  const decisionsDues = [
    {question: 'Quels droits sont cédés sur les visuels et les textes ?', source: 'BRIEF §10.1'},
    {question: 'Combien de révisions sont incluses ?', source: 'BRIEF §10.2'},
    {question: 'Que se passe-t-il si le client n\'est pas satisfait ?', source: 'BRIEF §10.5', partiel: g ? 'garantie proposée (hypothèse) : ' + g.texte : null},
  ];
  return {
    nom: o.nom, prix: o.prix, devise: 'EUR', delai: o.delai,
    positionnement: experience.offre.positionnement,
    contenu: [`${o.visuels} visuels prêts à publier`, `${o.textes} légendes`, `${o.messages} réponses types pour vos messages privés`].concat(o.bio ? ['une bio Instagram'] : []),
    garantie: g ? {texte: g.texte, statut: g.hypothese ? 'HYPOTHESE — à valider par le propriétaire' : 'VALIDEE'} : null,
    arguments: [
      'Écrit pour votre commerce à partir de trois lignes de brief, pas un modèle générique.',
      `Prix fixe : ${o.prix} €, sans abonnement.`,
      `Livré en ${o.delai}.`,
    ],
    objections: {
      prix: `${o.prix} € pour ${o.visuels} publications, soit ${Math.round(o.prix / o.visuels * 100) / 100} € la publication, textes compris.` + (g ? ' Et vous ne payez qu\'après avoir vu les deux premiers visuels.' : ''),
      confiance: 'Je vous montre d\'abord une série de démonstration, puis deux visuels faits pour vous.',
      timing: 'Trois lignes de brief suffisent ; vous ne perdez pas de temps.',
      besoin: 'Si vous publiez déjà régulièrement et que ça vous plaît, ce n\'est pas pour vous — et c\'est très bien.',
      concurrence: 'Pas d\'abonnement ni d\'engagement : un pack, un prix.',
    },
    faq: [
      {q: 'Que dois-je fournir ?', r: 'Trois lignes : ce que vous vendez, à qui, et votre compte Instagram.'},
      {q: 'Combien ça coûte ?', r: `${o.prix} €, prix fixe.`},
      {q: 'En combien de temps ?', r: o.delai + '.'},
      {q: 'Comment se passe le paiement ?', r: 'La maison confirme le prix et le délai en message privé, puis vous payez avant production' + (g ? ', une fois les deux visuels d\'essai validés' : '') + '.'},
    ],
    decisionsDues,
  };
}

function landing(of, experience){
  const ref = encodeURIComponent('Bonjour, je viens de la page ' + of.nom + ' (réf. ' + experience.id + ').');
  const cta = `https://ig.me/m/${COMPTE_MAISON}?text=${ref}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(of.nom)} — Aura Business</title>
<meta name="description" content="${esc(of.positionnement)}">
<style>
:root{--f:#111;--p:#fafaf7;--a:#c2410c;--m:#57534e}
@media (prefers-color-scheme:dark){:root{--f:#f5f5f4;--p:#161412;--a:#fb923c;--m:#a8a29e}}
*{box-sizing:border-box}body{margin:0;background:var(--p);color:var(--f);font:17px/1.55 system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:40px 16px 64px}h1{font-size:30px;line-height:1.15;margin:0 0 12px}
h2{font-size:15px;letter-spacing:.02em;color:var(--m);margin:36px 0 8px;font-weight:600}
.prix{font-size:28px;font-weight:700}.cta{display:inline-block;background:var(--a);color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:12px}
.note{color:var(--m);font-size:15px}ul{padding-left:20px}dt{font-weight:600;margin-top:12px}dd{margin:4px 0 0}
</style></head><body><main>
<section><h2>Le problème</h2><p>Publier régulièrement sur Instagram prend des soirées qu'un commerce indépendant n'a pas.</p></section>
<section><h1>${esc(of.positionnement)}</h1></section>
<section><h2>La preuve</h2><p class="note">Aura débute : aucun client à citer pour l'instant, et nous n'en inventerons pas. Ce que nous pouvons montrer, c'est une série de démonstration réalisée pour un commerce fictif — et deux visuels faits pour vous avant tout paiement${of.garantie ? '' : ' si vous le demandez'}.</p></section>
<section><h2>L'offre — ${esc(of.nom)}</h2><ul>${of.contenu.map(c => '<li>' + esc(c) + '</li>').join('')}</ul>${of.garantie ? '<p>' + esc(of.garantie.texte) + '</p>' : ''}</section>
<section><h2>Le prix</h2><p class="prix">${of.prix} €</p><p class="note">Prix fixe, sans abonnement. Livré en ${esc(of.delai)}.</p></section>
<section><a class="cta" href="${cta}" data-omega-cta="${esc(experience.id)}">Écrire à la maison sur Instagram</a><p class="note">Le message est pré-rempli avec une référence : c'est ainsi que nous savons que vous venez d'ici.</p></section>
<section><h2>Questions</h2><dl>${of.faq.map(f => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.r) + '</dd>').join('')}</dl></section>
</main></body></html>
`;
}

function genesisLite(dossierExperience, catalogue, {maintenant = new Date().toISOString()} = {}){
  const experience = P.chargerExperience(dossierExperience);
  const profil = P.icp(experience, catalogue);
  const of = offre(experience, profil);
  const base = path.join('ventures', experience.venture, experience.id);
  const exemple = {company: '[ENTREPRISE]', industry: 'amenity=restaurant', location: {ville: '[VILLE]'}, observations: []};
  const assets = {
    offre: of,
    landing: landing(of, experience),
    analytics: {
      principe: 'aucun traceur tiers ; chaque canal porte sa référence, la réponse la ramène',
      references: {landing: experience.id, dm: experience.id + '-dm', email: experience.id + '-email'},
      evenements: ['MESSAGE_SENT', 'REPLY_RECEIVED', 'STAGE_CHANGED', 'PAYMENT_CONFIRMED'],
      limite: 'landing non hébergée : aucune visite mesurable tant que la porte « hebergement » n\'est pas franchie',
    },
    pipeline: {etapes: CRM.ETAPES, won: 'uniquement par paiement enregistré avec preuve'},
    criteres: {icp: profil, criteres: experience.criteres, limites: experience.limites},
    outreach: Object.fromEntries(experience.variantes.map(v => [v, C.rediger(exemple, profil, experience, v)])),
  };
  E.ecrire(path.join(base, 'genesis.json'), Object.assign({genereLe: maintenant}, assets, {landing: undefined}));
  fs.mkdirSync(E.chemin(base), {recursive: true});
  fs.writeFileSync(E.chemin(path.join(base, 'landing.html')), assets.landing);
  return {dossier: E.chemin(base), assets, decisionsDues: of.decisionsDues};
}

/* Proposition personnalisée pour un prospect intéressé — relue avant envoi. */
function proposition(lead, experience, profil){
  const of = offre(experience, profil);
  return {
    lead: lead.id, mode: 'REVIEW',
    texte: [`Merci pour votre réponse. Voici ce que je propose pour ${lead.company} :`,
      of.contenu.map(c => '• ' + c).join('\n'),
      `Prix : ${of.prix} €, livré en ${of.delai}.`,
      of.garantie ? of.garantie.texte : null,
      'Pour démarrer, envoyez-moi trois lignes : ce que vous vendez, à qui, et ce que vous voulez mettre en avant ce mois-ci.',
      C.SIGNATURE].filter(Boolean).join('\n\n'),
    decisionsDues: of.decisionsDues.filter(d => !d.partiel).map(d => d.question),
  };
}

module.exports = {offre, landing, genesisLite, proposition, COMPTE_MAISON};
