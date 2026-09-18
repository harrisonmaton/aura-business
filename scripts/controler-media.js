#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   RECETTE D'UN PLAN MÉDIA

   Points 1 à 5 de la procédure d'arrivée : dimensions et recadrages, cohérence
   avec le manifeste, zones de texte, séparation sujet/fond, poids et format.

   Mesuré, pas jugé à l'œil. Une image « qui a l'air bien » sur un écran calibré
   peut avoir une zone de texte à luminance 90 — la typographie sera illisible
   par-dessus et on ne s'en apercevra qu'après l'intégration.

   Le contrôle de cohérence avec le master est le plus important de tous : c'est
   lui qui empêche de se retrouver avec six films différents.

   Usage :
     node scripts/controler-media.js <fichier> [--id aura-food]
     node scripts/controler-media.js --tous
     node scripts/controler-media.js <fichier> --optimiser
   ═══════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const CANDIDATS = [
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
  '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg',
];
const FFMPEG = process.env.FFMPEG || CANDIDATS.find(existsSync) || 'ffmpeg';

function ff(args) {
  return execFileSync(FFMPEG, ['-hide_banner', ...args],
    { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
}

/* ── Décodage ──────────────────────────────────────────────────────────────
   On travaille sur une réduction : 480×270 suffit pour la valeur, la teinte et
   la densité de contours, et tient en 400 Ko. Les contrôles de définition, eux,
   se font sur les dimensions réelles. */
const LG = 480, HT = 270;

function dimensions(fichier) {
  let t = '';
  try { ff(['-i', fichier]); } catch (e) { t = (e.stderr || Buffer.alloc(0)).toString('utf8'); }
  const m = t.match(/Video: .*?, (\d+)x(\d+)/);
  if (!m) throw new Error('image illisible : ' + fichier);
  return { l: +m[1], h: +m[2] };
}

function pixels(fichier) {
  const brut = ff(['-v', 'error', '-i', fichier,
    '-vf', `scale=${LG}:${HT}`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  return brut;
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* Teinte en degrés, 0 = rouge, 60 = jaune. L'ambre vit entre 20 et 50. */
function teinte(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return null;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/* Statistiques sur un rectangle exprimé en fractions du cadre. */
function zone(px, rect) {
  const x0 = Math.floor(rect.x * LG), x1 = Math.ceil((rect.x + rect.l) * LG);
  const y0 = Math.floor(rect.y * HT), y1 = Math.ceil((rect.y + rect.h) * HT);
  const vals = [];
  let somme = 0;
  for (let y = y0; y < Math.min(y1, HT); y++) {
    for (let x = x0; x < Math.min(x1, LG); x++) {
      const o = (y * LG + x) * 3;
      const v = lum(px[o], px[o + 1], px[o + 2]);
      vals.push(v); somme += v;
    }
  }
  const n = vals.length;
  if (!n) return { moyenne: 0, ecart: 0, n: 0 };
  const moy = somme / n;
  /* Variance en deux passes. La formule E[X²] − E[X]² tient en une passe mais
     se soustrait à elle-même : sur une zone quasi uniforme — exactement ce
     qu'une bonne zone de texte doit être — les deux termes sont presque égaux,
     la différence tombe sous la précision du flottant et devient NÉGATIVE.
     La racine rendait alors NaN, et un plan parfaitement conforme était
     recalé. Deux passes coûtent une boucle et ne peuvent pas produire ça. */
  let carres = 0;
  for (const v of vals) { const d = v - moy; carres += d * d; }
  return { moyenne: moy, ecart: Math.sqrt(carres / n), n, vals };
}

/* Densité de contours : moyenne du gradient. Un sujet détachable a beaucoup
   plus de structure que le fond — c'est ce qui le rend « détourable ». */
function contours(px, rect) {
  const x0 = Math.max(1, Math.floor(rect.x * LG)), x1 = Math.min(LG - 1, Math.ceil((rect.x + rect.l) * LG));
  const y0 = Math.max(1, Math.floor(rect.y * HT)), y1 = Math.min(HT - 1, Math.ceil((rect.y + rect.h) * HT));
  let s = 0, n = 0;
  const L = (x, y) => { const o = (y * LG + x) * 3; return lum(px[o], px[o + 1], px[o + 2]); };
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      s += Math.abs(L(x + 1, y) - L(x - 1, y)) + Math.abs(L(x, y + 1) - L(x, y - 1));
      n++;
    }
  }
  return n ? s / n : 0;
}

/* Teinte moyenne des 20 % de pixels les plus clairs : c'est la dominante de la
   lumière, et non celle de l'image entière — un fond noir écraserait tout. */
function dominante(px) {
  const tout = [];
  for (let i = 0; i < LG * HT; i++) {
    const o = i * 3, r = px[o], g = px[o + 1], b = px[o + 2];
    tout.push({ v: lum(r, g, b), r, g, b });
  }
  tout.sort((a, b) => b.v - a.v);
  const hauts = tout.slice(0, Math.floor(tout.length * 0.2));
  /* Moyenne circulaire : moyenner 350° et 10° en arithmétique donnerait 180°. */
  let sx = 0, sy = 0, n = 0;
  for (const p of hauts) {
    const t = teinte(p.r, p.g, p.b);
    if (t === null) continue;
    const a = t * Math.PI / 180;
    sx += Math.cos(a); sy += Math.sin(a); n++;
  }
  if (!n) return null;
  let d = Math.atan2(sy / n, sx / n) * 180 / Math.PI;
  return d < 0 ? d + 360 : d;
}

function partSombre(px) {
  let n = 0;
  for (let i = 0; i < LG * HT; i++) {
    const o = i * 3;
    if (lum(px[o], px[o + 1], px[o + 2]) < 20) n++;
  }
  return n / (LG * HT);
}

/* ── Recette d'un plan ─────────────────────────────────────────────────────── */
function controler(spec, fichier, master) {
  const R = [];
  const ok = (n, c, x) => R.push({ ok: c, nom: n, detail: x });

  const dim = dimensions(fichier);
  const px = pixels(fichier);

  /* 1 — dimensions et ratio */
  const ratio = dim.l / dim.h;
  ok('définition suffisante (≥ 1600 px de large)', dim.l >= 1600, `${dim.l}×${dim.h}`);
  ok('ratio 16:9', Math.abs(ratio - 16 / 9) < 0.02, ratio.toFixed(3));

  /* 2 — le recadrage mobile conserve le sujet */
  const s = spec.zone_sujet, c = spec.crop_mobile;
  const conserve = s.x >= c.x - 1e-9 && s.x + s.l <= c.x + c.l + 1e-9;
  ok('le recadrage mobile conserve le sujet', conserve,
     `sujet ${s.x.toFixed(2)}→${(s.x + s.l).toFixed(2)} / crop ${c.x.toFixed(2)}→${(c.x + c.l).toFixed(2)}`);

  /* 3 — la zone de texte est réellement vide */
  const zt = zone(px, spec.zone_texte);
  ok('zone de texte assez sombre (moyenne < 40)', zt.moyenne < 40, zt.moyenne.toFixed(1));
  ok('zone de texte assez unie (écart-type < 25)', zt.ecart < 25, zt.ecart.toFixed(1));

  /* 4 — séparation sujet / fond */
  const cSujet = contours(px, spec.zone_sujet);
  const cTexte = contours(px, spec.zone_texte);
  /* Une zone de texte sans aucun contour est le cas idéal, pas un cas limite :
     on le nomme au lieu d'afficher une division par zéro. */
  const vide = cTexte < 0.5;
  const rapport = vide ? Infinity : cSujet / cTexte;
  ok('le sujet se détache du fond (structure ≥ 2× la zone vide)', rapport >= 2,
     vide ? `${cSujet.toFixed(1)} contre une zone de texte sans relief`
          : `${cSujet.toFixed(1)} contre ${cTexte.toFixed(1)} — ×${rapport.toFixed(1)}`);

  /* 5 — la signature Aura */
  const sombre = partSombre(px);
  ok('noirs écrasés (≥ 25 % sous 20)', sombre >= 0.25, (sombre * 100).toFixed(1) + ' %');

  const dom = dominante(px);
  ok('dominante ambre (teinte des hautes lumières entre 20° et 50°)',
     dom !== null && dom >= 20 && dom <= 50, dom === null ? 'indéterminée' : dom.toFixed(1) + '°');

  /* 6 — cohérence avec le master */
  if (master && master.id !== spec.id) {
    const ecartTeinte = Math.abs(((dom - master.dominante + 540) % 360) - 180);
    const moyenne = zone(px, { x: 0, y: 0, l: 1, h: 1 }).moyenne;
    const ecartLum = Math.abs(moyenne - master.moyenne);
    ok('teinte cohérente avec le master (< 12°)', ecartTeinte < 12, ecartTeinte.toFixed(1) + '°');
    ok('luminance cohérente avec le master (< 18)', ecartLum < 18, ecartLum.toFixed(1));
  }

  /* 7 — poids */
  const ko = Math.round(statSync(fichier).size / 1024);
  const plafond = 220;
  ok(`poids ≤ ${plafond} Ko`, ko <= plafond, ko + ' Ko');

  return { R, mesures: { dominante: dom, moyenne: zone(px, { x: 0, y: 0, l: 1, h: 1 }).moyenne, dim, ko } };
}

/* ── Optimisation ─────────────────────────────────────────────────────────── */
function optimiser(spec, source) {
  const dst = path.join(RACINE, spec.destination);
  mkdirSync(path.dirname(dst), { recursive: true });
  ff(['-v', 'error', '-i', source, '-vf', 'scale=1600:-2',
      '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', '-y', dst]);

  /* La version mobile est un vrai recadrage, pas la même image rétrécie : le
     sujet doit rester à la même taille apparente sur un écran trois fois plus
     étroit. */
  const c = spec.crop_mobile;
  const dstM = dst.replace(/\.webp$/, '-mobile.webp');
  ff(['-v', 'error', '-i', source,
      '-vf', `crop=iw*${c.l}:ih:iw*${c.x}:0,scale=900:-2`,
      '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', '-y', dstM]);

  return {
    desktop: { chemin: path.relative(RACINE, dst), ko: Math.round(statSync(dst).size / 1024) },
    mobile: { chemin: path.relative(RACINE, dstM), ko: Math.round(statSync(dstM).size / 1024) },
  };
}

/* ── Programme ────────────────────────────────────────────────────────────── */
const M = JSON.parse(readFileSync(path.join(RACINE, 'AURA-MEDIA-MANIFEST.json'), 'utf8'));
const args = process.argv.slice(2);
const veutOptimiser = args.includes('--optimiser');
const tous = args.includes('--tous');
const iId = args.indexOf('--id');
const idForce = iId >= 0 ? args[iId + 1] : null;
const fichierArg = args.find(a => !a.startsWith('--') && a !== idForce);

if (!tous && !fichierArg) {
  console.error('usage : node scripts/controler-media.js <fichier> [--id aura-food] [--optimiser]');
  console.error('        node scripts/controler-media.js --tous');
  process.exit(2);
}

/* Le master sert de mètre étalon : on le mesure d'abord. */
let master = null;
const specMaster = M.medias.find(m => m.id === M.master.plan_maitre);
const fMaster = path.join(RACINE, specMaster.destination);
if (existsSync(fMaster)) {
  const px = pixels(fMaster);
  master = { id: specMaster.id, dominante: dominante(px), moyenne: zone(px, { x: 0, y: 0, l: 1, h: 1 }).moyenne };
}

const aTraiter = tous
  ? M.medias.filter(m => existsSync(path.join(RACINE, m.destination)))
      .map(m => ({ spec: m, fichier: path.join(RACINE, m.destination) }))
  : [{
      spec: M.medias.find(m => m.id === (idForce || path.basename(fichierArg, path.extname(fichierArg)))),
      fichier: fichierArg,
    }];

if (!aTraiter.length) {
  console.log('Aucun plan produit pour l’instant.');
  console.log('Attendu en premier : ' + M.master.plan_maitre + ' → ' + specMaster.destination);
  process.exit(0);
}

let echecs = 0;
for (const { spec, fichier } of aTraiter) {
  if (!spec) { console.error('plan inconnu du manifeste : ' + fichier); process.exit(2); }
  if (!existsSync(fichier)) { console.error('introuvable : ' + fichier); process.exit(2); }

  console.log('\n═══ ' + spec.titre + (spec.id === M.master.plan_maitre ? '  (MASTER)' : '') + ' ═══');
  if (spec.bloque_par && !master) {
    console.log('  ⚠ ' + spec.bloque_par + ' — la cohérence ne peut pas être mesurée.');
  }

  const { R, mesures } = controler(spec, fichier, master);
  for (const r of R) {
    console.log('  ' + (r.ok ? 'PASS ' : 'ÉCHEC') + ' — ' + r.nom + (r.detail ? '  [' + r.detail + ']' : ''));
    if (!r.ok) echecs++;
  }

  if (veutOptimiser) {
    const o = optimiser(spec, fichier);
    console.log('  → ' + o.desktop.chemin + '  ' + o.desktop.ko + ' Ko');
    console.log('  → ' + o.mobile.chemin + '  ' + o.mobile.ko + ' Ko');
  }

  if (spec.id === M.master.plan_maitre && !master) {
    master = { id: spec.id, dominante: mesures.dominante, moyenne: mesures.moyenne };
  }
}

console.log('\n' + (echecs ? echecs + ' contrôle(s) en échec' : 'tous les contrôles au vert'));
process.exit(echecs ? 1 : 0);
