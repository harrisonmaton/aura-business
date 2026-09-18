'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   SYSTÈME MÉDIA — la cohérence du manifeste, avant que les images existent.

   Un manifeste qui se contredit produit six images incohérentes, et on ne
   s'en aperçoit qu'après les avoir payées. C'est exactement ce qui a failli
   arriver : la première version faisait alterner les sujets à gauche et à
   droite, puis déclarait un recadrage mobile unique pris sur les 70 % droits.
   Beauty et Property auraient été coupés en deux.

   Ces contrôles tournent SANS les images. Ceux qui exigent un fichier sont
   déclarés « en attente » tant que le plan n'est pas produit, jamais comptés
   comme réussis.
   ══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const MANIFESTE = path.join(RACINE, 'AURA-MEDIA-MANIFEST.json');

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));
const attente = (n, x) => R.push('ATTENTE — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

/* ── Le manifeste se lit-il ? ─────────────────────────────────────────────── */
let M;
try {
  M = JSON.parse(fs.readFileSync(MANIFESTE, 'utf8'));
  ck('le manifeste est un JSON valide', true, M.medias.length + ' plans');
} catch (e) {
  console.log('ÉCHEC — le manifeste ne se lit pas : ' + e.message);
  process.exit(1);
}

/* ── Géométrie ────────────────────────────────────────────────────────────── */
const dedans = (petit, grand) =>
  petit.x >= grand.x - 1e-9 &&
  petit.y >= grand.y - 1e-9 &&
  petit.x + petit.l <= grand.x + grand.l + 1e-9 &&
  petit.y + petit.h <= grand.y + grand.h + 1e-9;

const chevauche = (a, b) =>
  a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.h && b.y < a.y + a.h;

const borne = z => z.x >= 0 && z.y >= 0 && z.x + z.l <= 1.0001 && z.y + z.h <= 1.0001;

{
  const ampute = [], deborde = [], collision = [];
  for (const m of M.medias) {
    if (!m.crop_mobile) { ampute.push(m.id + ' (aucun recadrage déclaré)'); continue; }
    if (!dedans(m.zone_sujet, m.crop_mobile)) {
      ampute.push(m.id + ' : sujet ' +
        m.zone_sujet.x.toFixed(2) + '→' + (m.zone_sujet.x + m.zone_sujet.l).toFixed(2) +
        ' hors du recadrage ' +
        m.crop_mobile.x.toFixed(2) + '→' + (m.crop_mobile.x + m.crop_mobile.l).toFixed(2));
    }
    for (const [nom, z] of [['sujet', m.zone_sujet], ['texte', m.zone_texte], ['crop', m.crop_mobile]]) {
      if (!borne(z)) deborde.push(m.id + '/' + nom);
    }
    if (chevauche(m.zone_sujet, m.zone_texte)) {
      collision.push(m.id);
    }
  }
  ck('aucun recadrage mobile n’ampute son sujet', ampute.length === 0,
     ampute.length ? ampute.join(' · ') : M.medias.length + '/' + M.medias.length);
  ck('toutes les zones tiennent dans le cadre', deborde.length === 0,
     deborde.length ? deborde.join(', ') : 'ok');
  ck('la zone de texte ne recouvre jamais le sujet', collision.length === 0,
     collision.length ? collision.join(', ') : 'ok');
}

/* ── Chaque plan est-il complètement spécifié ? ───────────────────────────── */
{
  const REQUIS = ['id', 'index', 'titre', 'etat', 'role_du_plan', 'role_timeline',
    'destination', 'cadrage', 'premier_plan', 'arriere_plan', 'zone_texte',
    'zone_sujet', 'mouvement_futur', 'prompt', 'modele_recommande', 'parametres',
    'coherence'];
  const incomplets = [];
  for (const m of M.medias) {
    const manque = REQUIS.filter(k => m[k] === undefined || m[k] === null || m[k] === '');
    if (manque.length) incomplets.push(m.id + ' : ' + manque.join(', '));
  }
  ck('les sept points du mandat sont renseignés pour chaque plan',
     incomplets.length === 0, incomplets.length ? incomplets.join(' | ') : '6/6');

  /* La reproductibilité est le but du fichier : un plan produit sans identifiant
     de job n'est pas reproductible, et ne doit donc pas être déclaré produit. */
  const nonTracables = M.medias.filter(m => m.etat === 'produit' && !m.job_id).map(m => m.id);
  ck('aucun plan déclaré produit sans identifiant de génération',
     nonTracables.length === 0, nonTracables.join(', ') || 'ok');
}

/* ── La direction artistique est-elle réellement dans les prompts ? ───────── */
{
  /* Le bloc direction_artistique ne sert à rien s'il reste un commentaire : ce
     qui compte est ce qui part au modèle. On vérifie donc les marqueurs dans
     le texte du prompt, pas dans le document. */
  const MARQUEURS = [
    { nom: 'clé tungstène 2900K', re: /2900K/i },
    { nom: 'contre cyan 6500K', re: /6500K/i },
    { nom: 'rebond magenta à 8 %', re: /magenta[^.]*eight percent|eight percent[^.]*magenta/i },
    { nom: 'optique 40 mm', re: /40\s*mm/i },
    { nom: 'noirs écrasés', re: /crushed blacks/i },
    { nom: 'grain filmique', re: /filmic grain/i },
    { nom: 'interdiction de texte', re: /no text/i },
    { nom: 'interdiction de logo', re: /no logos?/i },
  ];
  const trous = [];
  for (const m of M.medias) {
    for (const mk of MARQUEURS) {
      if (!mk.re.test(m.prompt)) trous.push(m.id + ' ← ' + mk.nom);
    }
  }
  ck('chaque prompt porte la signature lumineuse d’Aura',
     trous.length === 0, trous.length ? trous.slice(0, 6).join(' · ') : '6 plans × 8 marqueurs');
}

/* ── Les interdits sont-ils respectés ? ───────────────────────────────────── */
{
  const fautes = [];
  for (const m of M.medias) {
    /* Miami est un moment du film, pas un filtre : les palmiers n'existent que
       dans le plan Food. */
    if (/\bpalm\b/i.test(m.prompt) && m.id !== 'aura-food') {
      fautes.push(m.id + ' : palmier hors du plan Food');
    }
    /* Une interface générée est une promesse de fonctionnalité. Le plan
       produit doit donc arriver avec des écrans ÉTEINTS, l'interface étant
       ensuite posée en vrai HTML. */
    if (m.id === 'aura-os') {
      if (!/SCREENS ARE COMPLETELY BLACK|screens are completely black/i.test(m.prompt)) {
        fautes.push('aura-os : le prompt n’impose pas des écrans éteints');
      }
      if (!/no user interface/i.test(m.prompt)) {
        fautes.push('aura-os : le prompt n’interdit pas une interface inventée');
      }
    }
    if (/sunset/i.test(m.prompt) && !/no orange saturated sunset/i.test(m.prompt)) {
      fautes.push(m.id + ' : coucher de soleil non encadré');
    }
  }
  ck('les interdits communs sont tenus dans les prompts',
     fautes.length === 0, fautes.length ? fautes.join(' · ') : 'ok');
}

/* ── L'alternance de la galerie ───────────────────────────────────────────── */
{
  /* Le rythme gauche/droite est une décision de mise en scène : si tous les
     sujets tombent du même côté, la traversée devient mécanique. */
  const cotes = M.medias.map(m => (m.zone_sujet.x + m.zone_sujet.l / 2) >= 0.5 ? 'D' : 'G');
  const alternances = cotes.slice(0, 5).filter((c, i) => i > 0 && c !== cotes[i - 1]).length;
  ck('la galerie alterne les côtés au lieu d’aligner les sujets',
     alternances >= 3, cotes.join('') + ' — ' + alternances + ' changements sur les 5 métiers');
}

/* ── Les fichiers, quand ils existeront ───────────────────────────────────── */
{
  const MAX_KO = M.budget.poids_par_plan_ko;
  let presents = 0, absents = [];
  for (const m of M.medias) {
    const f = path.join(RACINE, m.destination);
    if (!fs.existsSync(f)) { absents.push(m.id); continue; }
    presents++;
    const ko = Math.round(fs.statSync(f).size / 1024);
    ck('poids de ' + m.id, ko <= MAX_KO, ko + ' Ko / ' + MAX_KO + ' Ko');
  }
  if (absents.length) {
    attente('contrôles sur fichier', absents.length + ' plans non produits : ' + absents.join(', '));
  }
  ck('l’état déclaré correspond aux fichiers réellement présents',
     M.medias.filter(m => m.etat === 'produit').length === presents,
     presents + ' présents, ' +
     M.medias.filter(m => m.etat === 'produit').length + ' déclarés produits');
}

/* ── Sortie ───────────────────────────────────────────────────────────────── */
console.log(R.join('\n'));
const echecs = R.filter(l => l.startsWith('ÉCHEC'));
const attentes = R.filter(l => l.startsWith('ATTENTE'));
console.log('\n' + (R.length - echecs.length - attentes.length) + '/' +
            (R.length - attentes.length) + ' contrôles au vert' +
            (attentes.length ? ', ' + attentes.length + ' en attente de production' : ''));
if (echecs.length) process.exit(1);
