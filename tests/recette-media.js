'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   L'OUTIL DE RECETTE EST-IL ENCORE CAPABLE DE DIRE NON ?

   scripts/controler-media.js décide si un plan entre dans le site. Un outil
   de contrôle qui se met à tout accepter ne prévient pas : il devient vert.
   On lui soumet donc deux images fabriquées — une conforme, une qui accumule
   les défauts — et on vérifie qu'il les sépare.

   Ces images ne sont PAS des médias Aura. Elles sont construites ici, en
   mémoire, et n'entrent jamais dans src/medias/.

   Ce banc a déjà servi : il a révélé que la variance calculée en une passe
   rendait NaN sur une zone parfaitement unie — c'est-à-dire qu'une zone de
   texte idéale faisait échouer le contrôle censé la valider.
   ══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('child_process');
const { mkdtempSync, rmSync, existsSync } = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const CANDIDATS = [
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
  '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg',
];
const FFMPEG = process.env.FFMPEG || CANDIDATS.find(existsSync) || 'ffmpeg';

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

const W = 1920, H = 1080;

function encoder(buf, sortie) {
  execFileSync(FFMPEG, ['-hide_banner', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-s', `${W}x${H}`, '-i', 'pipe:0', '-c:v', 'libwebp', '-quality', '88', '-y', sortie],
    { input: buf });
}

/* Conforme : noirs écrasés, moitié gauche vide et plate, sujet ambre
   structuré dans le tiers droit, reflet au sol, contre-jour cyan discret. */
function conforme() {
  const b = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3, fx = x / W, fy = y / H;
    let r = 7, g = 6, bl = 10;
    if (fx > 0.58 && fx < 0.98 && fy > 0.28 && fy < 0.86) {
      const cx = (fx - 0.78) / 0.16, cy = (fy - 0.55) / 0.26;
      const chute = Math.exp(-(cx * cx + cy * cy) * 1.8);
      const struct = 0.55 + 0.45 * Math.sin(x * 0.09) * Math.sin(y * 0.07)
                          + 0.12 * Math.sin((x * 7 + y * 13) % 97);
      const i = Math.max(0, Math.min(1, chute * struct));
      r += 235 * i; g += 150 * i; bl += 52 * i;
    }
    if (fx > 0.60 && fx < 0.96 && fy > 0.86 && fy < 0.97) {
      const i = Math.max(0, (0.97 - fy) / 0.11) * 0.30 * (0.6 + 0.4 * Math.sin(x * 0.05));
      r += 190 * i; g += 118 * i; bl += 44 * i;
    }
    if (fx > 0.565 && fx < 0.60 && fy > 0.30 && fy < 0.84) {
      const i = (1 - Math.abs(fx - 0.582) / 0.018) * 0.34;
      r += 8 * i; g += 54 * i; bl += 56 * i;
    }
    b[o] = Math.min(255, r); b[o + 1] = Math.min(255, g); b[o + 2] = Math.min(255, bl);
  }
  return b;
}

/* Non conforme : zone de texte encombrée, image levée, dominante cyan,
   sujet plat. Quatre défauts distincts, qui doivent être nommés séparément. */
function nonConforme() {
  const b = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3, fx = x / W;
    let r = 60, g = 72, bl = 80;
    if (fx < 0.50) {
      const n = 0.5 + 0.5 * Math.sin(x * 0.13) * Math.cos(y * 0.11);
      r += 90 * n; g += 100 * n; bl += 110 * n;
    }
    if (fx > 0.58 && fx < 0.95 && y / H > 0.30 && y / H < 0.84) { r += 40; g += 120; bl += 140; }
    b[o] = Math.min(255, r); b[o + 1] = Math.min(255, g); b[o + 2] = Math.min(255, bl);
  }
  return b;
}

function passer(fichier) {
  try {
    const out = execFileSync('node',
      [path.join(RACINE, 'scripts/controler-media.js'), fichier, '--id', 'aura-food'],
      { encoding: 'utf8', cwd: RACINE });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'aura-recette-'));
try {
  const bon = path.join(tmp, 'conforme.webp');
  const mauvais = path.join(tmp, 'non-conforme.webp');
  encoder(conforme(), bon);
  encoder(nonConforme(), mauvais);

  const a = passer(bon);
  const echecsA = (a.out.match(/ÉCHEC/g) || []).length;
  ck('un plan conforme passe tous les contrôles', echecsA === 0 && a.code === 0,
     echecsA + ' échec(s), code ' + a.code);

  const b = passer(mauvais);
  const echecsB = (b.out.match(/ÉCHEC/g) || []).length;
  ck('un plan non conforme est refusé', b.code !== 0, 'code ' + b.code);
  ck('les défauts sont nommés séparément', echecsB >= 4, echecsB + ' défauts relevés');

  /* Chaque défaut fabriqué doit être attribué au bon contrôle : un outil qui
     échoue pour la mauvaise raison ne guide pas la correction. */
  const attendus = [
    ['zone de texte encombrée', /ÉCHEC.*zone de texte assez sombre/],
    ['sujet non détaché', /ÉCHEC.*se détache du fond/],
    ['noirs non écrasés', /ÉCHEC.*noirs écrasés/],
    ['dominante hors ambre', /ÉCHEC.*dominante ambre/],
  ];
  const rates = attendus.filter(([, re]) => !re.test(b.out)).map(([n]) => n);
  ck('chaque défaut est attribué au bon contrôle', rates.length === 0,
     rates.length ? 'non détecté : ' + rates.join(', ') : '4/4');

  /* Le piège numérique qui a déjà mordu : une zone parfaitement unie. */
  ck('aucune mesure ne rend NaN sur une zone unie', !/NaN/.test(a.out),
     /NaN/.test(a.out) ? 'NaN présent dans la sortie' : 'aucun');

} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/* Le dossier des médias ne doit jamais contenir de fixture. */
{
  const dossier = path.join(RACINE, 'src/medias');
  const fichiers = existsSync(dossier)
    ? require('fs').readdirSync(dossier).filter(f => !f.startsWith('.') && f !== 'LISEZ-MOI.md')
    : [];
  const M = JSON.parse(require('fs').readFileSync(path.join(RACINE, 'AURA-MEDIA-MANIFEST.json'), 'utf8'));
  const declares = new Set(M.medias.flatMap(m => {
    const base = path.basename(m.destination);
    return [base, base.replace(/\.webp$/, '-mobile.webp')];
  }));
  const intrus = fichiers.filter(f => !declares.has(f));
  ck('aucun fichier étranger dans src/medias', intrus.length === 0, intrus.join(', ') || 'ok');
}

console.log(R.join('\n'));
const echecs = R.filter(l => l.startsWith('ÉCHEC'));
console.log('\n' + (R.length - echecs.length) + '/' + R.length + ' contrôles au vert');
if (echecs.length) process.exit(1);
