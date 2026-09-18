#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Dépouillement d'une vidéo de référence

   Rejoue exactement les mesures de REFERENCE-SHOTLIST.md. Si un chiffre du
   document ne sort plus d'ici, c'est que le fichier analysé a changé — ou que
   le document a menti.

   Aucune dépendance réseau : ffmpeg est pris dans le binaire embarqué par
   imageio_ffmpeg s'il est présent, sinon dans le PATH.

   Usage :
     node scripts/depouiller-reference.js <video.mp4> [--sortie <dossier>]
   ═══════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

/* ── Où est ffmpeg ─────────────────────────────────────────────────────────
   Cet environnement n'a pas ffmpeg installé, mais le paquet Python
   imageio_ffmpeg en embarque un binaire statique. On le préfère quand il est
   là ; sinon on se rabat sur le PATH. */
const CANDIDATS = [
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
];

function trouverFfmpeg() {
  for (const c of CANDIDATS) if (existsSync(c)) return c;
  try {
    return execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(
      'ffmpeg introuvable. Installe-le, ou pose son chemin dans la variable FFMPEG.'
    );
  }
}
const FFMPEG = process.env.FFMPEG || trouverFfmpeg();

function ff(args, { silencieux = true } = {}) {
  return execFileSync(FFMPEG, ['-hide_banner', ...args], {
    encoding: 'buffer',
    stdio: silencieux ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 1 << 28,
  });
}

/* ── Sonde ─────────────────────────────────────────────────────────────────
   ffmpeg écrit les métadonnées sur stderr et sort en erreur quand aucune
   sortie n'est demandée : c'est normal, on lit quand même stderr. */
function sonder(video) {
  let texte = '';
  try {
    ff(['-i', video]);
  } catch (e) {
    texte = (e.stderr || Buffer.alloc(0)).toString('utf8');
  }
  const duree = texte.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const flux = texte.match(/Video: (\w+).*?, (\d+)x(\d+).*?, ([\d.]+) fps/);
  if (!duree || !flux) throw new Error('flux vidéo illisible :\n' + texte.slice(0, 600));
  return {
    duree: (+duree[1]) * 3600 + (+duree[2]) * 60 + parseFloat(duree[3]),
    codec: flux[1],
    largeur: +flux[2],
    hauteur: +flux[3],
    fps: parseFloat(flux[4]),
  };
}

/* ── Zone écran ────────────────────────────────────────────────────────────
   La référence est un téléphone qui filme un portable : le site n'occupe
   qu'une fraction de l'image. Ces proportions ont été calibrées à la main sur
   une frame pleine résolution, et sont exprimées en fractions pour rester
   valables si la définition change. */
const ZONE = { x: 75 / 720, y: 535 / 1280, l: 600 / 720, h: 385 / 1280 };

function crop(m) {
  const r = n => Math.round(n / 2) * 2;                   // pair : yuv420p l'exige
  return `crop=${r(m.largeur * ZONE.l)}:${r(m.hauteur * ZONE.h)}:` +
         `${r(m.largeur * ZONE.x)}:${r(m.hauteur * ZONE.y)}`;
}

/* ── Luminance et ruptures ─────────────────────────────────────────────────
   On décode tout en gris 40×25 : 1 000 octets par frame, donc une vidéo de
   500 frames tient dans 500 Ko. Assez fin pour la valeur et les coupes, assez
   grossier pour ignorer le bruit du capteur. */
const GL = 40, GH = 25;

function serie(video, m, sortie) {
  const brut = path.join(sortie, 'gris.raw');
  ff(['-v', 'error', '-i', video,
      '-vf', `${crop(m)},scale=${GL}:${GH},format=gray`,
      '-f', 'rawvideo', '-y', brut]);

  const b = readFileSync(brut);
  const N = GL * GH;
  const F = b.length / N;
  const moyenne = [], ecart = [];

  for (let f = 0; f < F; f++) {
    let s = 0;
    for (let i = 0; i < N; i++) s += b[f * N + i];
    moyenne.push(s / N);
    if (f === 0) { ecart.push(0); continue; }
    let d = 0;
    for (let i = 0; i < N; i++) d += Math.abs(b[f * N + i] - b[(f - 1) * N + i]);
    ecart.push(d / N);
  }
  rmSync(brut, { force: true });
  return { F, moyenne, ecart };
}

/* Première frame de [de,a] dont la luminance franchit `seuil`. */
function franchit(moyenne, de, a, seuil, montant) {
  for (let f = de; f <= Math.min(a, moyenne.length - 1); f++) {
    if (montant ? moyenne[f] >= seuil : moyenne[f] <= seuil) return f;
  }
  return -1;
}

/* ── Planches-contact ──────────────────────────────────────────────────────
   Une grille d'images vaut mieux qu'une description. Le pas est choisi pour
   que chaque planche couvre une durée lisible. */
function planche(video, m, sortie, nom, premiere, derniere, pas, cols, lignes) {
  const dst = path.join(sortie, `${nom}.png`);
  ff(['-v', 'error', '-i', video,
      '-vf', `${crop(m)},scale=300:193,` +
             `select='between(n\\,${premiere}\\,${derniere})*not(mod(n\\,${pas}))',` +
             `tile=${cols}x${lignes}:margin=3:padding=3:color=0x00FF00`,
      '-frames:v', '1', '-y', dst]);
  return dst;
}

/* ── Programme ─────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const video = args.find(a => !a.startsWith('--'));
if (!video) {
  console.error('usage : node scripts/depouiller-reference.js <video.mp4> [--sortie <dossier>]');
  process.exit(2);
}
if (!existsSync(video)) {
  console.error(`introuvable : ${video}`);
  process.exit(2);
}
const iSortie = args.indexOf('--sortie');
const sortie = iSortie >= 0 ? args[iSortie + 1] : 'preview/reference';
mkdirSync(sortie, { recursive: true });

const m = sonder(video);
const t = f => (f / m.fps).toFixed(3);

console.log('═══ SONDE ═══');
console.log(`  ${m.largeur}×${m.hauteur}  ${m.codec}  ${m.fps} fps  ${m.duree.toFixed(3)} s`);
if (m.hauteur > m.largeur) {
  console.log('  ⚠ image VERTICALE — ce n’est pas une capture de site, mais un écran filmé');
}

const { F, moyenne, ecart } = serie(video, m, sortie);
console.log(`  ${F} frames décodées`);

/* Fin du contenu utile : dernière chute durable vers le noir. */
let finUtile = F - 1;
for (let f = F - 1; f > F * 0.5; f--) {
  if (moyenne[f] > 30) { finUtile = f; break; }
}
console.log('\n═══ CONTENU UTILE ═══');
console.log(`  0,000 s → ${t(finUtile)} s   (${finUtile + 1} frames)`);
if (finUtile < F - 15) {
  console.log(`  les ${F - finUtile - 1} dernières frames sont noires : hors sujet`);
}

console.log('\n═══ BASCULES DE VALEUR ═══');
/* Une bascule ne se repère pas à un seuil de luminance franchi — ce seuil est
   arbitraire et décale la mesure de plusieurs frames selon l'endroit où on le
   pose. On la repère à la VITESSE de variation : une transition, c'est
   l'intervalle pendant lequel la valeur change vite.

   La série est d'abord lissée sur 3 frames, sinon le tremblement de la prise
   de vue à main levée crée de fausses ruptures. La tolérance de 2 frames
   absorbe les paliers au milieu d'une transition. */
const SEUIL_VITESSE = 4;      // points de luminance par frame
const TOLERANCE = 2;          // frames molles admises dans une même bascule

const lisse = moyenne.map((_, i) =>
  (moyenne[Math.max(0, i - 1)] + moyenne[i] + moyenne[Math.min(moyenne.length - 1, i + 1)]) / 3);
const vitesse = lisse.map((v, i) => (i ? v - lisse[i - 1] : 0));

const bascules = [];
let debut = null, mou = 0;
for (let f = 1; f <= finUtile; f++) {
  if (Math.abs(vitesse[f]) >= SEUIL_VITESSE) { if (debut === null) debut = f; mou = 0; }
  else if (debut !== null && ++mou > TOLERANCE) {
    const fin = f - mou;
    if (fin - debut >= 4) bascules.push([debut, fin]);
    debut = null; mou = 0;
  }
}
for (const [a, b] of bascules) {
  const sens = moyenne[b] > moyenne[a] ? 'vers le clair' : 'vers le sombre';
  const pointe = Math.max(...vitesse.slice(a, b + 1).map(Math.abs));
  console.log(`  ${sens.padEnd(15)} f${a} → f${b}   ${t(a)}s → ${t(b)}s   ` +
              `${b - a} frames = ${((b - a) / m.fps).toFixed(3)} s   ` +
              `lum ${Math.round(moyenne[a])} → ${Math.round(moyenne[b])}   ` +
              `pointe ${pointe.toFixed(1)}/frame`);
}
console.log(`  (seuil ${SEUIL_VITESSE} pts/frame ; à 5 et 6 les bornes se resserrent` +
            ` de 1 à 2 frames — aucune de ces mesures n’est exacte à la frame près)`);

console.log('\n═══ 12 PLUS FORTES RUPTURES ═══');
ecart.slice(0, finUtile).map((d, i) => [d, i])
  .sort((x, y) => y[0] - x[0]).slice(0, 12).sort((x, y) => x[1] - y[1])
  .forEach(([d, i]) => console.log(`  f${String(i).padEnd(4)} ${t(i)}s   écart ${d.toFixed(1)}   lum ${Math.round(moyenne[i])}`));

console.log('\n═══ LUMINANCE, 1 relevé / 5 frames ═══');
let ligne = [];
for (let f = 0; f <= finUtile; f += 5) ligne.push(`${t(f)}:${Math.round(moyenne[f])}`);
console.log('  ' + ligne.join('  '));

console.log('\n═══ PLANCHES-CONTACT ═══');
const tiers = Math.ceil(finUtile / 3);
for (let i = 0; i < 3; i++) {
  const a = i * tiers, b = Math.min((i + 1) * tiers - 1, finUtile);
  const pas = Math.max(1, Math.round((b - a) / 24));
  console.log('  ' + planche(video, m, sortie, `planche-${i + 1}`, a, b, pas, 4, 6));
}

writeFileSync(path.join(sortie, 'mesures.json'), JSON.stringify({
  fichier: path.basename(video), sonde: m, frames: F, finUtile,
  luminance: moyenne.map(v => Math.round(v * 10) / 10),
}, null, 2));
console.log(`  ${path.join(sortie, 'mesures.json')}`);
