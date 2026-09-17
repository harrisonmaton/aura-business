/* ══════════════════════════════════════════════════════════════════════════
   AURA — SCÈNES MIAMI
   Générateur d'imagerie. C'est lui qui décide si le site ressemble à une
   maquette premium ou à des cartes sombres alignées.

   Chaque scène est une prise de vue construite en couches :
     ciel → soleil à raies → brume d'horizon → skyline lointaine →
     skyline art déco → néons (halo + tracé net) → eau → reflet miroir →
     colonne solaire → promenade → palmiers de premier plan → vignette → grain

   Tout est écrit ici. Aucune photographie, aucun élément tiers, aucune
   génération payante. Le hasard est déterministe (graine par scène), donc
   deux constructions donnent exactement le même fichier.

   Deux choix structurants, appris en regardant le rendu précédent :
   — La skyline est d'abord produite comme DONNÉES, puis dessinée une fois
     à l'endroit et une fois renversée. Le reflet est donc le vrai miroir de
     la ville, pas une approximation de traînées verticales.
   — Les palmes sont des frondes segmentées (folioles le long d'un rachis
     courbe) et non des traits nus. C'est la différence entre un palmier et
     une patte d'araignée.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'src', 'scenes');

/* Générateur pseudo-aléatoire déterministe : même graine, même image. */
function alea(graine) {
  let s = 0;
  for (let i = 0; i < graine.length; i++) s = (s * 31 + graine.charCodeAt(i)) >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* Les coordonnées sont arrondies : à 1600 px de large, le dixième de pixel
   n'est pas visible mais pèse dans un fichier qui part en ligne. */
const n = v => Math.round(v);
const n1 = v => Math.round(v * 10) / 10;
const SANS = "Archivo, Helvetica Neue, Arial, sans-serif";

/* ── Ambiances ─────────────────────────────────────────────────────────────
   Chaque scène porte une heure et une dominante. C'est ce qui donne à chaque
   pack et à chaque réalisation une identité propre au lieu d'un filtre.
   Les valeurs ont été remontées en luminosité et en saturation : la version
   précédente virait au violet boueux au lieu du magenta → orange recherché. */
const AMBIANCES = {
  aube: {
    haut: '#1E2A6B', milieu: '#C2578E', bas: '#FFB477', soleil: '#FFF0C9',
    neon: '#FF4D9D', neon2: '#36D6D0', eau: '#241C4E', eauHaut: '#8E4F7E'
  },
  crepuscule: {
    haut: '#190C3C', milieu: '#C22A7B', bas: '#FF6F42', soleil: '#FFE3A8',
    neon: '#FF2E88', neon2: '#57E9FF', eau: '#150E33', eauHaut: '#8C2A63'
  },
  nuit: {
    /* « Nuit » ne veut pas dire noir : à #04060F en haut de ciel, la scène
       perdait toute la richesse du crépuscule. On garde une nuit bleue
       profonde, pas une absence d'image. */
    haut: '#0A0A2A', milieu: '#3E167E', bas: '#A62BAE', soleil: '#FFD2EE',
    neon: '#FF2E88', neon2: '#36D6D0', eau: '#0A0E28', eauHaut: '#4A1A72'
  },
  orchidee: {
    haut: '#190840', milieu: '#9A2EBE', bas: '#F58FE2', soleil: '#FFE6F9',
    neon: '#E27BFF', neon2: '#57E9FF', eau: '#170D3B', eauHaut: '#6B2387'
  },
  or: {
    haut: '#26123F', milieu: '#C04A62', bas: '#FFB65C', soleil: '#FFF3CE',
    neon: '#FFB454', neon2: '#FF2E88', eau: '#1E1236', eauHaut: '#8A3F4E'
  }
};

/* ── Défs communes ─────────────────────────────────────────────────────────
   Le dégradé de ciel est en userSpaceOnUse : n'importe quelle forme peinte
   avec lui se fond exactement dans le fond. C'est ce qui permet de creuser
   les raies du soleil sans repeindre le ciel. */
function defs(id, a, W, H, hz, solEau) {
  return `<linearGradient id="ciel-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${n(hz)}">
    <stop offset="0" stop-color="${a.haut}"/>
    <stop offset=".34" stop-color="${a.haut}"/>
    <stop offset=".62" stop-color="${a.milieu}"/>
    <stop offset=".90" stop-color="${a.bas}"/>
    <stop offset="1" stop-color="${a.bas}"/>
  </linearGradient>
  <linearGradient id="brume-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(hz - H * .22)}" x2="0" y2="${n(hz)}">
    <stop offset="0" stop-color="${a.soleil}" stop-opacity="0"/>
    <stop offset=".72" stop-color="${a.soleil}" stop-opacity=".18"/>
    <stop offset="1" stop-color="${a.soleil}" stop-opacity=".32"/>
  </linearGradient>
  <linearGradient id="eau-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(hz)}" x2="0" y2="${n(solEau)}">
    <stop offset="0" stop-color="${a.eauHaut}"/>
    <stop offset=".45" stop-color="${a.eau}"/>
    <stop offset="1" stop-color="#05070F"/>
  </linearGradient>
  <radialGradient id="halo-${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${a.soleil}" stop-opacity=".85"/>
    <stop offset=".40" stop-color="${a.bas}" stop-opacity=".38"/>
    <stop offset="1" stop-color="${a.bas}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="disque-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(hz - H * .34)}" x2="0" y2="${n(hz)}">
    <stop offset="0" stop-color="${a.soleil}"/>
    <stop offset=".55" stop-color="${a.soleil}"/>
    <stop offset="1" stop-color="${a.bas}"/>
  </linearGradient>
  <linearGradient id="bas-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(H * .55)}" x2="0" y2="${n(H)}">
    <stop offset="0" stop-color="#05070F" stop-opacity="0"/>
    <stop offset=".70" stop-color="#05070F" stop-opacity=".30"/>
    <stop offset="1" stop-color="#05070F" stop-opacity=".62"/>
  </linearGradient>
  <linearGradient id="voile-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(H * .66)}" x2="0" y2="${n(H)}">
    <stop offset="0" stop-color="#05070F" stop-opacity="0"/>
    <stop offset=".55" stop-color="#05070F" stop-opacity=".42"/>
    <stop offset="1" stop-color="#05070F" stop-opacity=".80"/>
  </linearGradient>
  <radialGradient id="vignette-${id}" cx="50%" cy="46%" r="72%">
    <stop offset=".55" stop-color="#05070F" stop-opacity="0"/>
    <stop offset="1" stop-color="#05070F" stop-opacity=".62"/>
  </radialGradient>
  <clipPath id="coupeEau-${id}"><rect x="0" y="${n(hz)}" width="${n(W)}" height="${n(solEau - hz)}"/></clipPath>
  <filter id="flou-${id}" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="${n1(H * .012)}"/>
  </filter>
  <filter id="flouEau-${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="${n1(H * .011)}"/>
  </filter>`;
}

/* ── Le soleil ─────────────────────────────────────────────────────────────
   Disque lumineux mordu par des raies horizontales peintes avec le dégradé
   de ciel. Les raies s'épaississent vers le bas : c'est ce qui fait lire un
   coucher de soleil plutôt qu'un rond jaune. */
function soleil(id, a, cx, cy, rayon, hz) {
  let d = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rayon * 3.1)}" ry="${n(rayon * 2.2)}" fill="url(#halo-${id})"/>
  <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rayon)}" fill="url(#disque-${id})"/>`;
  /* Raies : douze, de plus en plus épaisses et rapprochées vers le bas.
     Elles sont peintes avec le dégradé de ciel, donc elles CREUSENT le
     disque au lieu de le recouvrir d'une couleur approchée. */
  /* Les raies mordent, elles n'effacent pas : au premier essai elles
     mangeaient les deux tiers bas du disque, qui se confondait alors avec le
     ciel. Le vide doit rester majoritaire sur le plein. */
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = cy - rayon * .10 + Math.pow(t, .85) * rayon * 1.15;
    const ep = rayon * (.012 + t * t * .052);
    if (y - ep / 2 > hz) break;
    /* Largeur suivant la corde du disque : les raies ne dépassent pas. */
    const dy = Math.min(.99, Math.abs(y - cy) / rayon);
    const demi = rayon * Math.sqrt(1 - dy * dy) * 1.02;
    d += `<rect x="${n(cx - demi)}" y="${n1(y - ep / 2)}" width="${n(demi * 2)}" height="${n1(ep)}" fill="url(#ciel-${id})"/>`;
  }
  return d;
}

/* ── Nuages ────────────────────────────────────────────────────────────────
   Des bandes étirées, plus denses près de l'horizon, éclairées par-dessous. */
function nuages(r, W, hz, a) {
  let d = '';
  for (let i = 0; i < 18; i++) {
    const y = hz * (.14 + .78 * Math.pow(r(), 1.4));
    const l = W * (.16 + r() * .46), h = 4 + r() * 13;
    const x = -W * .12 + r() * W * 1.15;
    const bas = y / hz;                       /* 0 en haut du ciel, 1 à l'horizon */
    const o = (.05 + r() * .13) + bas * .12;
    d += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(l)}" ry="${n(h)}" fill="${bas > .6 ? a.soleil : a.milieu}" opacity="${n1(o * 100) / 100}"/>`;
    /* Liseré lumineux sous le nuage : la lumière vient d'en bas. */
    if (bas > .45 && r() > .45) {
      d += `<ellipse cx="${n(x)}" cy="${n(y + h * .7)}" rx="${n(l * .82)}" ry="${n1(h * .28)}" fill="${a.soleil}" opacity="${n1((.10 + r() * .14) * 100) / 100}"/>`;
    }
  }
  return d;
}

/* ── La skyline, d'abord comme données ─────────────────────────────────────
   Produire la géométrie avant de la dessiner permet de la réutiliser telle
   quelle pour le reflet. Trois familles de silhouettes, empruntées au
   quartier art déco : gradins, dôme, tour à flèche. */
function immeubles(r, W, hz, hauteurMax, ecartMin) {
  const liste = [];
  let x = -W * .04;
  while (x < W * 1.04) {
    const l = hauteurMax * (.16 + r() * .40);
    const h = hauteurMax * (.26 + Math.pow(r(), 1.5) * .74);
    const tirage = r();
    const type = tirage > .74 ? 'gradins' : (tirage > .58 ? 'dome' : 'droit');
    liste.push({ x, l, h, type, fleche: h > hauteurMax * .66 && r() > .45, graine: r() });
    x += l + ecartMin + r() * hauteurMax * .10;
  }
  return liste;
}

/* Règle de composition : la ville ne mange pas le soleil.
   Sans elle, un tirage un peu haut plante une tour devant le point le plus
   lumineux de l'image et la scène perd son coucher de soleil — c'est
   exactement ce qui est arrivé au format portrait au premier essai. Les
   immeubles proches du soleil sont donc rabaissés, en deux paliers pour que
   l'ouverture ne se lise pas comme une encoche. */
function degagerLeSoleil(bats, hz, sunX, sunY, sunR) {
  const plafond = hz - sunY + sunR * .55;    /* toit sous le disque, pas en travers */
  for (const b of bats) {
    const centre = b.x + b.l / 2;
    const ecart = Math.abs(centre - sunX);
    if (ecart < sunR * 1.25) b.h = Math.min(b.h, plafond);
    else if (ecart < sunR * 2.5) b.h = Math.min(b.h, plafond * 1.75);
    /* Une tour rabaissée ne garde pas sa flèche : elle trahirait la coupe. */
    if (ecart < sunR * 1.25) b.fleche = false;
  }
}

/* Contour d'un immeuble. `base` est la ligne où il s'enfonce dans l'eau. */
function contour(b, hz, base) {
  const x = b.x, l = b.l, h = b.h, y = hz - h;
  if (b.type === 'gradins') {
    const e1 = l * .16, e2 = l * .32, p1 = y + h * .30, p2 = y + h * .14;
    return `M${n(x)} ${n(base)}V${n(p1)}H${n(x + e1)}V${n(p2)}H${n(x + e2)}V${n(y)}`
         + `H${n(x + l - e2)}V${n(p2)}H${n(x + l - e1)}V${n(p1)}H${n(x + l)}V${n(base)}Z`;
  }
  if (b.type === 'dome') {
    const rr = l / 2;
    return `M${n(x)} ${n(base)}V${n(y + rr * .8)}A${n(rr)} ${n(rr * .8)} 0 0 1 ${n(x + l)} ${n(y + rr * .8)}V${n(base)}Z`;
  }
  return `M${n(x)} ${n(base)}V${n(y)}H${n(x + l)}V${n(base)}Z`;
}

/* Dessin d'un plan de skyline. Les fenêtres sont regroupées en deux chemins
   (chaudes / froides) au lieu d'un rectangle par fenêtre : même image, une
   fraction du poids. */
function skyline(bats, hz, base, couleur, opacite, fenetres, a, r) {
  let corps = '', fleches = '';
  for (const b of bats) {
    corps += contour(b, hz, base);
    if (b.fleche) {
      const cx = b.x + b.l / 2, y = hz - b.h;
      fleches += `M${n(cx - 1)} ${n(y)}h2v${-n(b.h * .16 + b.graine * b.h * .12)}h-2Z`;
    }
  }
  let d = `<path d="${corps}${fleches}" fill="${couleur}" opacity="${opacite}"/>`;
  if (!fenetres) return d;

  let chaud = '', froid = '';
  for (const b of bats) {
    const y = hz - b.h;
    const cols = Math.max(2, Math.floor(b.l / (b.l > 70 ? 15 : 11)));
    const lignes = Math.max(3, Math.floor(b.h / 19));
    const lw = Math.min(5, b.l / cols * .42), lh = lw * 1.45;
    for (let c = 0; c < cols; c++) for (let li = 0; li < lignes; li++) {
      if (r() > .46) continue;
      const fx = b.x + b.l * .10 + c * ((b.l * .80) / cols);
      const fy = y + b.h * .10 + li * ((b.h * .84) / lignes);
      const bloc = `M${n(fx)} ${n(fy)}h${n1(lw)}v${n1(lh)}h${-n1(lw)}Z`;
      if (r() > .34) chaud += bloc; else froid += bloc;
    }
  }
  d += `<path d="${chaud}" fill="${a.soleil}" opacity=".62"/>`;
  d += `<path d="${froid}" fill="${a.neon2}" opacity=".50"/>`;

  /* Arêtes éclairées : une tour entièrement noire est une découpe de papier.
     Un liseré sur le côté qui fait face aux enseignes lui donne du volume. */
  let aretes = '';
  for (const b of bats) {
    if (b.graine < .62) continue;
    const cote = b.graine > .81 ? b.x + b.l - 2 : b.x;
    aretes += `M${n(cote)} ${n(hz - b.h)}v${n(b.h)}`;
  }
  d += `<path d="${aretes}" stroke="${a.neon2}" stroke-width="1.6" opacity=".22" fill="none"/>`;
  return d;
}

/* ── Palmiers ──────────────────────────────────────────────────────────────
   Une fronde = un rachis courbe + des folioles réparties le long de ce
   rachis, plus courtes aux deux extrémités. Toutes les folioles d'une même
   fronde tiennent dans un seul chemin : c'est net à l'écran et léger dans
   le fichier. */
function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
          u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

function fronde(ox, oy, angle, longueur, tombant, r) {
  const p0 = [ox, oy];
  const p1 = [ox + Math.cos(angle) * longueur * .52, oy + Math.sin(angle) * longueur * .52];
  const p2 = [ox + Math.cos(angle) * longueur * .92,
              oy + Math.sin(angle) * longueur * .92 + tombant];
  let rachis = `M${n(p0[0])} ${n(p0[1])}Q${n(p1[0])} ${n(p1[1])} ${n(p2[0])} ${n(p2[1])}`;
  let folioles = '';
  const N = 16;
  for (let i = 1; i <= N; i++) {
    const t = i / (N + 1);
    const p = bezier(p0, p1, p2, t);
    const q = bezier(p0, p1, p2, Math.min(1, t + .06));
    const tx = q[0] - p[0], ty = q[1] - p[1];
    const norme = Math.hypot(tx, ty) || 1;
    const ux = tx / norme, uy = ty / norme;
    /* Courte, et maximale au premier tiers. Une foliole qui fait le tiers de
       la fronde donne une toile d'araignée, pas une palme : c'est exactement
       ce que montrait le rendu précédent. */
    const lg = longueur * .135 * Math.pow(Math.sin(Math.PI * t), .6) * (.85 + r() * .3);
    for (const sens of [1, -1]) {
      const px = -uy * sens, py = ux * sens;
      /* La foliole sort peu de la fronde et se couche franchement vers la
         pointe : direction = un peu de normale, beaucoup de tangente. */
      const bx = p[0] + px * lg * .62 + ux * lg * 1.05;
      const by = p[1] + py * lg * .62 + uy * lg * 1.05 + lg * .30;
      const cx = p[0] + px * lg * .68 + ux * lg * .34;
      const cy = p[1] + py * lg * .68 + uy * lg * .34;
      folioles += `M${n(p[0])} ${n(p[1])}Q${n(cx)} ${n(cy)} ${n(bx)} ${n(by)}`;
    }
  }
  return { rachis, folioles };
}

function palmier(x, sol, hauteur, couleur, opacite, r, pencher, rimLight) {
  const cx = x + pencher * hauteur * .20;
  const cime = sol - hauteur;
  const ep = hauteur * .052;
  const qx = x + pencher * hauteur * .09, qy = sol - hauteur * .55;
  /* Le stipe est une forme pleine qui s'affine vers la couronne, pas un trait
     d'épaisseur constante : un tronc de palmier est large au pied. */
  const wb = ep * .95, wm = ep * .52, wc = ep * .30;
  let d = `<path d="M${n(x - wb)} ${n(sol)}Q${n(qx - wm)} ${n(qy)} ${n(cx - wc)} ${n(cime)}`
        + `L${n(cx + wc)} ${n(cime)}Q${n(qx + wm)} ${n(qy)} ${n(x + wb)} ${n(sol)}Z"`
        + ` fill="${couleur}" opacity="${opacite}"/>`;
  /* Anneaux du stipe : il est annelé, pas lisse. */
  let anneaux = '';
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    const p = bezier([x, sol], [qx, qy], [cx, cime], t);
    const w = wb + (wc - wb) * t;
    anneaux += `M${n(p[0] - w * .8)} ${n(p[1])}h${n1(w * 1.6)}`;
  }
  d += `<path d="${anneaux}" stroke="#05070F" stroke-width="${n1(ep * .16)}" opacity="${opacite * .5}" fill="none"/>`;

  const nb = 10;
  let rachis = '', folioles = '';
  for (let i = 0; i < nb; i++) {
    /* En SVG l'axe y descend : un angle négatif monte. La couronne balaie
       donc de +0,08π (à peine sous l'horizontale à droite) à −1,08π (à peine
       sous l'horizontale à gauche) EN PASSANT PAR LE HAUT. La version
       précédente balayait par le bas — d'où le parasol renversé. */
    const ang = Math.PI * (.08 - 1.16 * i / (nb - 1)) + (r() - .5) * .10;
    const lg = hauteur * (.28 + r() * .10);
    /* Les palmes basses tombent plus que celles qui pointent vers le ciel. */
    const vertical = Math.abs(Math.sin(ang));
    const f = fronde(cx, cime, ang, lg, lg * (.30 + (1 - vertical) * .38 + r() * .12), r);
    rachis += f.rachis; folioles += f.folioles;
  }
  d += `<path d="${folioles}" stroke="${couleur}" stroke-width="${n1(hauteur * .0055)}" fill="none"
    opacity="${opacite}" stroke-linecap="round"/>`;
  d += `<path d="${rachis}" stroke="${couleur}" stroke-width="${n1(hauteur * .010)}" fill="none"
    opacity="${opacite}" stroke-linecap="round"/>`;
  /* Régime de noix de coco sous la couronne. */
  d += `<circle cx="${n(cx - ep * .8)}" cy="${n(cime + ep * 1.2)}" r="${n1(ep * .62)}" fill="${couleur}" opacity="${opacite}"/>
        <circle cx="${n(cx + ep * .9)}" cy="${n(cime + ep * 1.5)}" r="${n1(ep * .55)}" fill="${couleur}" opacity="${opacite}"/>`;
  /* Liseré : le néon de la ville accroche le bord du tronc. Sans lui, un
     palmier noir sur fond sombre disparaît complètement. */
  if (rimLight) {
    d += `<path d="M${n(x + wb * .72)} ${n(sol)}Q${n(qx + wm * .72)} ${n(qy)} ${n(cx + wc * .7)} ${n(cime)}"
      stroke="${rimLight}" stroke-width="${n1(ep * .13)}" fill="none" opacity=".28" stroke-linecap="round"/>`;
  }
  return d;
}

/* ── Enseignes au néon ─────────────────────────────────────────────────────
   Renvoie deux calques : la géométrie qui part dans le groupe flouté (le
   halo) et la géométrie nette. Un néon sans halo reste un rectangle. */
function enseigne(x, y, l, h, couleur, texte, taille, vertical) {
  const corps = `<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(h)}" fill="none"
      stroke="${couleur}" stroke-width="${n1(Math.max(2.5, h * .05))}" rx="${n1(Math.min(l, h) * .10)}"/>`;
  const lettres = texte
    ? (vertical
      ? esc(texte).split('').map((c, i) =>
          `<text x="${n(x + l / 2)}" y="${n(y + h * .16 + i * taille * 1.18)}" text-anchor="middle"
             font-family="${SANS}" font-size="${n(taille)}" font-weight="700" fill="${couleur}">${c}</text>`).join('')
      /* Le dx compense l'interlettrage : en SVG, `letter-spacing` ajoute un
         blanc APRÈS la dernière lettre, que `text-anchor=middle` compte dans
         la largeur. Sans ça le mot est décalé à gauche dans son cadre. */
      : `<text x="${n(x + l / 2)}" dx="${n1(taille * .07)}" y="${n(y + h / 2 + taille * .36)}" text-anchor="middle" font-family="${SANS}"
           font-size="${n(taille)}" font-weight="700" letter-spacing="${n1(taille * .14)}" fill="${couleur}">${esc(texte)}</text>`)
    : '';
  return {
    halo: `<g opacity=".95">${corps}${lettres}
      <rect x="${n(x - h * .12)}" y="${n(y - h * .12)}" width="${n(l + h * .24)}" height="${n(h + h * .24)}"
        fill="${couleur}" opacity=".22" rx="${n1(Math.min(l, h) * .14)}"/></g>`,
    net: `<g>${corps}<g opacity=".92">${lettres}</g>
      <rect x="${n(x + h * .07)}" y="${n(y + h * .07)}" width="${n(l - h * .14)}" height="${n(h - h * .14)}"
        fill="none" stroke="${couleur}" stroke-width="1" opacity=".42" rx="${n1(Math.min(l, h) * .08)}"/></g>`
  };
}

/* ── L'eau et son reflet ───────────────────────────────────────────────────
   Le reflet est le miroir réel de la skyline : même chemin, renversé et
   comprimé. Les rayures horizontales par-dessus rendent la surface. */
function eau(id, W, hz, solEau, a, r, sunX) {
  let d = `<rect x="0" y="${n(hz)}" width="${n(W)}" height="${n(solEau - hz)}" fill="url(#eau-${id})"/>`;
  /* Colonne solaire : la traînée verticale sous le soleil. Le repère le plus
     lisible pour que l'œil accepte une surface d'eau. */
  let colonne = '';
  const bandes = 26;
  for (let i = 0; i < bandes; i++) {
    const t = i / bandes;
    const y = hz + (solEau - hz) * Math.pow(t, .78);
    const larg = W * (.028 + t * .085) * (.4 + r() * 1.1);
    const dec = (r() - .5) * W * .05 * (1 + t * 2);
    const ep = (solEau - hz) * (.008 + t * .012);
    colonne += `<rect x="${n(sunX - larg / 2 + dec)}" y="${n1(y)}" width="${n(larg)}" height="${n1(ep)}"
      fill="${a.soleil}" opacity="${n1((.42 * (1 - t * .72)) * 100) / 100}" rx="${n1(ep / 2)}"/>`;
  }
  d += `<g clip-path="url(#coupeEau-${id})">${colonne}</g>`;
  /* Ondulations : de fines lignes claires, plus espacées vers le bas. */
  let ondes = '';
  for (let i = 0; i < 22; i++) {
    const t = i / 22;
    const y = hz + (solEau - hz) * Math.pow(t, .72) + r() * 4;
    const x0 = r() * W * .35, lg = W * (.2 + r() * .7);
    ondes += `M${n(x0)} ${n1(y)}h${n(lg)}`;
  }
  d += `<path d="${ondes}" stroke="${a.soleil}" stroke-width="1.2" opacity=".14" fill="none"/>`;
  return d;
}

/* ── Promenade de premier plan ─────────────────────────────────────────────
   Une balustrade sombre : elle ferme le bas de l'image et donne la
   profondeur qui manquait. Sans elle la scène flotte. */
function promenade(id, W, H, y, a, r) {
  const h = H - y;                       /* hauteur totale du quai */
  const yRail = y + h * .06;             /* main courante */
  const yDeck = y + h * .42;             /* le sol commence ici */
  /* Le sol reçoit la lumière des enseignes : sans cette nappe, le bas de
     l'image était une bande noire morte sur un cinquième de la hauteur. */
  let d = `<defs><linearGradient id="quai-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(yDeck)}" x2="0" y2="${n(H)}">
      <stop offset="0" stop-color="${a.eau}"/>
      <stop offset=".35" stop-color="#0A0D1E"/>
      <stop offset="1" stop-color="#05070F"/>
    </linearGradient>
    <linearGradient id="nappe-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(yDeck)}" x2="0" y2="${n(H)}">
      <stop offset="0" stop-color="${a.neon2}" stop-opacity=".30"/>
      <stop offset=".55" stop-color="${a.neon}" stop-opacity=".11"/>
      <stop offset="1" stop-color="${a.neon}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="flaque1-${id}"><stop offset="0" stop-color="${a.neon}" stop-opacity=".34"/><stop offset="1" stop-color="${a.neon}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flaque2-${id}"><stop offset="0" stop-color="${a.neon2}" stop-opacity=".30"/><stop offset="1" stop-color="${a.neon2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flaque3-${id}"><stop offset="0" stop-color="${a.soleil}" stop-opacity=".20"/><stop offset="1" stop-color="${a.soleil}" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="${n(yDeck)}" width="${n(W)}" height="${n(H - yDeck + 2)}" fill="url(#quai-${id})"/>
    <rect x="0" y="${n(yDeck)}" width="${n(W)}" height="${n(H - yDeck + 2)}" fill="url(#nappe-${id})"/>`;
  /* Lattes du platelage, en perspective : de plus en plus espacées. */
  let lattes = '';
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    lattes += `M0 ${n(yDeck + (H - yDeck) * Math.pow(t, 1.7))}H${n(W)}`;
  }
  d += `<path d="${lattes}" stroke="${a.soleil}" stroke-width="1" opacity=".07" fill="none"/>`;
  /* Flaques de lumière : les enseignes éclairent le sol. C'est ce qui évite
     que le bas de l'image reste une bande noire. */
  for (let i = 1; i <= 3; i++) {
    const cx = W * (.12 + r() * .76), cy = yDeck + (H - yDeck) * (.15 + r() * .6);
    d += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(W * (.16 + r() * .18))}" ry="${n((H - yDeck) * (.28 + r() * .3))}" fill="url(#flaque${i}-${id})"/>`;
  }
  /* Balustrade : main courante, lisse basse, balustres. */
  let balustres = '';
  const pas = W / Math.max(12, Math.round(W / 44));
  for (let x = pas * .5; x < W; x += pas) {
    balustres += `M${n(x - pas * .055)} ${n(yRail)}h${n1(pas * .11)}v${n(yDeck - yRail)}h${-n1(pas * .11)}Z`;
  }
  d += `<path d="${balustres}" fill="#05070F" opacity=".94"/>
    <rect x="0" y="${n(yRail)}" width="${n(W)}" height="${n1(h * .055)}" fill="#05070F" rx="${n1(h * .02)}"/>
    <rect x="0" y="${n(yRail)}" width="${n(W)}" height="1.5" fill="${a.neon2}" opacity=".45"/>
    <rect x="0" y="${n(yDeck - h * .04)}" width="${n(W)}" height="${n1(h * .045)}" fill="#05070F"/>`;
  return d;
}

function grain(id, W, H) {
  return `<filter id="gr-${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer></filter>
  <rect width="${n(W)}" height="${n(H)}" filter="url(#gr-${id})" opacity=".6"/>`;
}

/* ── La scène complète ─────────────────────────────────────────────────── */
function scene({ id, ambiance, W, H, enseignes, titre, sousTitre, numero, sujet }) {
  const a = AMBIANCES[ambiance] || AMBIANCES.crepuscule;
  const r = alea(id + ambiance);
  /* En portrait, la même composition qu'en paysage laisse un tiers de ciel
     vide en haut. On remonte l'horizon et on grandit la ville : le cadrage
     suit le format au lieu de le subir. */
  const portrait = H > W;
  const hz = Math.round(H * (portrait ? .50 : .56));
  const solEau = Math.round(H * .82);      /* bord de l'eau, début de la promenade */
  const sunX = W * .40, sunY = hz - H * (portrait ? .085 : .105), sunR = H * (portrait ? .10 : .125);

  /* Géométrie de la ville, produite une seule fois puis réutilisée à
     l'endroit et renversée. */
  const loin = immeubles(r, W, hz, H * (portrait ? .30 : .26), W * .012);
  const pres = immeubles(r, W, hz, H * (portrait ? .46 : .40), W * .008);
  degagerLeSoleil(loin, hz, sunX, sunY, sunR);
  degagerLeSoleil(pres, hz, sunX, sunY, sunR);
  const villeLoin = skyline(loin, hz, hz + 6, a.haut, .62, false, a, r);
  const villePres = skyline(pres, hz, hz + 6, '#07091A', .92, true, a, r);

  /* Néons : halo d'abord, tracé net ensuite. */
  let halos = '', nets = '';
  (enseignes || []).forEach(function (e, i) {
    const s = enseigne(W * e[0], H * e[1], W * e[2], H * e[3], i % 2 ? a.neon2 : a.neon,
                       e[4] || '', H * (e[5] || .022), !!e[6]);
    halos += s.halo; nets += s.net;
  });

  let d = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
    role="img" aria-label="${esc(titre || 'Scène Aura')}" preserveAspectRatio="xMidYMid slice">
<defs>${defs(id, a, W, H, hz, solEau)}</defs>
<rect width="${W}" height="${n(hz + 2)}" fill="url(#ciel-${id})"/>
${soleil(id, a, sunX, sunY, sunR, hz)}
${nuages(r, W, hz, a)}
<rect x="0" y="${n(hz - H * .22)}" width="${W}" height="${n(H * .22)}" fill="url(#brume-${id})"/>
<g id="ville-${id}">${villeLoin}${villePres}</g>
<g id="neons-${id}"><g filter="url(#flou-${id})">${halos}</g>${nets}</g>`;

  /* L'eau, puis le reflet : la ville et les néons renversés et comprimés. */
  d += eau(id, W, hz, solEau, a, r, sunX);
  d += `<g clip-path="url(#coupeEau-${id})" opacity=".55" filter="url(#flouEau-${id})">
    <g transform="translate(0 ${n(hz)}) scale(1 -0.62) translate(0 ${n(-hz)})">
      <use href="#ville-${id}"/><use href="#neons-${id}"/>
    </g></g>`;

  /* Ligne d'horizon nette : sépare la ville de l'eau. */
  d += `<rect x="0" y="${n(hz)}" width="${W}" height="1.5" fill="${a.soleil}" opacity=".30"/>`;

  /* L'assombrissement du bas vient AVANT le quai. Peint après, il éteignait
     l'éclairage du sol qu'on venait d'installer : la bande basse redevenait
     noire et morte. L'ordre des calques n'est pas un détail. */
  d += `<rect width="${W}" height="${H}" fill="url(#bas-${id})"/>`;
  d += promenade(id, W, H, solEau, a, r);

  /* Rangée de palmiers du quai : plantés DANS le sol, derrière la balustrade
     visuellement mais devant l'eau. Ils donnent l'échelle de la promenade. */
  const nbMoyen = Math.max(3, Math.round(W / 380));
  for (let i = 0; i < nbMoyen; i++) {
    const x = W * (.05 + .90 * (i + .2 + r() * .6) / nbMoyen);
    /* Hauteurs franchement inégales : une rangée de palmiers identiques se
       lit comme un motif, pas comme une promenade. */
    const h = H * (.26 + Math.pow(r(), .7) * .22);
    d += palmier(x, H * (.96 + r() * .05), h, '#070A18', .9, r, r() * 1.2 - .6, a.neon2);
  }

  /* Sujet éventuel : un comptoir éclairé au premier plan. */
  if (sujet === 'comptoir') {
    const y = H * .885;
    d += `<rect x="${n(W * .05)}" y="${n(y)}" width="${n(W * .90)}" height="${n(H * .030)}" rx="${n(H * .012)}" fill="#0C1020"/>
      <rect x="${n(W * .05)}" y="${n(y)}" width="${n(W * .90)}" height="2" fill="${a.neon2}" opacity=".55"/>`;
  }

  /* Voile de lisibilité : uniquement quand la scène porte du texte. Sur le
     décor du premier écran, il n'y en a pas — et le quai reste éclairé. */
  if (titre || sousTitre) d += `<rect width="${W}" height="${H}" fill="url(#voile-${id})"/>`;

  /* Palmiers de cadrage : volontairement coupés par les bords. Une couronne
     entière au premier plan mange la composition ; une couronne coupée
     ouvre l'image, comme un objectif large. */
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? -W * .015 : W * 1.015;
    d += palmier(x, H * 1.02, H * (.56 + r() * .10), '#04060E', .97, r,
                 (i === 0 ? .42 : -.42), a.neon2);
  }

  d += `<rect width="${W}" height="${H}" fill="url(#vignette-${id})"/>`;

  /* Typographie de la scène. */
  if (numero) {
    d += `<text x="${n(W * .062)}" y="${n(H * .17)}" font-family="${SANS}" font-size="${n(H * .085)}" font-weight="700"
      letter-spacing="${n1(-H * .004)}" fill="#FFF5E8" opacity=".92">${esc(numero)}</text>`;
  }
  /* Le corps s'adapte à la longueur du mot. « BEAUTY STUDIO » et « CAFÉ »
     ne peuvent pas partager la même taille dans la même largeur : sans ce
     calcul, le titre long sort du cadre. 0,62 em par capitale est la largeur
     moyenne mesurée sur l'Archivo gras utilisée ici. */
  const tiens = (texte, maxi, ratio) => Math.min(maxi, (W * .876) / (texte.length * ratio));
  if (titre) {
    const t = tiens(titre, H * .105, .62);
    d += `<text x="${n(W * .062)}" y="${n(H * .845)}" font-family="${SANS}" font-size="${n1(t)}" font-weight="700"
      letter-spacing="${n1(-t * .035)}" fill="#FFF5E8">${esc(titre)}</text>`;
  }
  if (sousTitre) {
    const t = tiens(sousTitre, H * .042, .50);
    d += `<text x="${n(W * .062)}" y="${n(H * .915)}" font-family="${SANS}" font-size="${n1(t)}" font-weight="500"
      letter-spacing="${n1(t * .01)}" fill="#FFF5E8" opacity=".78">${esc(sousTitre)}</text>`;
  }
  d += grain(id, W, H) + '</svg>';
  return d;
}

/* ── Le catalogue de scènes ────────────────────────────────────────────── */
const SCENES = [
  /* Décor du premier écran : large, sans texte, il porte le hero. */
  { id: 'hero', ambiance: 'crepuscule', W: 1600, H: 1000,
    enseignes: [[.685,.245,.075,.175,'',.02,true],[.775,.215,.115,.052,'OCEAN',.028],
                [.205,.255,.115,.058,'VICE',.030],[.885,.305,.055,.115,'',.02]],
    sujet: 'comptoir' },

  /* Les quatre packs : quatre heures, quatre dominantes, quatre identités. */
  { id: 'pack-1', ambiance: 'aube',       W: 760, H: 900, numero: '01', titre: 'STARTER', sousTitre: "L'essentiel pour démarrer avec impact.",
    enseignes: [[.63,.265,.19,.055,'OPEN',.030]] },
  { id: 'pack-2', ambiance: 'crepuscule', W: 760, H: 900, numero: '02', titre: 'GROWTH',  sousTitre: 'Plus de visibilité. Plus de clients.',
    enseignes: [[.56,.235,.26,.052,'GROWTH',.028],[.70,.335,.075,.105,'',.02,true]] },
  { id: 'pack-3', ambiance: 'nuit',       W: 760, H: 900, numero: '03', titre: 'ELITE',   sousTitre: 'Une marque puissante et distinctive.',
    enseignes: [[.54,.215,.30,.058,'ELITE',.032],[.66,.325,.085,.115,'',.02,true]] },
  { id: 'pack-4', ambiance: 'or',         W: 760, H: 900, numero: '04', titre: 'LEGEND',  sousTitre: 'Un univers complet, sans limites.',
    enseignes: [[.52,.195,.34,.062,'LEGEND',.034],[.64,.315,.09,.10,'',.022,true]] },

  /* Les réalisations : un secteur, une ambiance. */
  { id: 'real-cafe',    ambiance: 'aube',       W: 620, H: 760, titre: 'CAFÉ',       sousTitre: 'Identité & contenu',
    enseignes: [[.55,.265,.33,.058,'CAFÉ',.030]] },
  { id: 'real-resto',   ambiance: 'crepuscule', W: 620, H: 760, titre: 'RESTAURANT', sousTitre: 'Image & réservation',
    enseignes: [[.52,.245,.36,.058,'TAVOLA',.028]], sujet: 'comptoir' },
  { id: 'real-boutique',ambiance: 'orchidee',   W: 620, H: 760, titre: 'BOUTIQUE',   sousTitre: 'Univers de marque',
    enseignes: [[.56,.235,.30,.054,'ATELIER',.026]] },
  { id: 'real-beauty',  ambiance: 'nuit',       W: 620, H: 760, titre: 'BEAUTY STUDIO', sousTitre: 'Contenu & acquisition',
    enseignes: [[.54,.265,.32,.058,'STUDIO',.028]] },
  { id: 'real-event',   ambiance: 'orchidee',   W: 620, H: 760, titre: 'ÉVÉNEMENT',  sousTitre: 'Expérience immersive',
    enseignes: [[.46,.195,.42,.068,'LIVE',.036]] },

  /* Le club. */
  { id: 'club', ambiance: 'orchidee', W: 760, H: 560,
    enseignes: [[.50,.235,.38,.072,'CLUB',.040]] }
];

/* ── Écriture ──────────────────────────────────────────────────────────── */
fs.mkdirSync(SORTIE, { recursive: true });
let total = 0;
for (const s of SCENES) {
  const svg = scene(s);
  fs.writeFileSync(path.join(SORTIE, s.id + '.svg'), svg);
  total += Buffer.byteLength(svg);
}
const manifeste = {
  _provenance: "Scènes construites par scripts/build-scenes.js. Aucune photographie, "
    + "aucun élément sous licence tierce, aucune génération payante. Le hasard est "
    + "déterministe : deux constructions donnent des fichiers identiques.",
  genere: new Date().toISOString().slice(0, 10),
  scenes: SCENES.map(s => ({ id: s.id, ambiance: s.ambiance, dimensions: s.W + '×' + s.H,
                             titre: s.titre || null, role: s.numero ? 'pack' : (s.id.startsWith('real') ? 'realisation' : 'decor') }))
};
fs.writeFileSync(path.join(SORTIE, 'MANIFESTE.json'), JSON.stringify(manifeste, null, 1) + '\n');

/* Injection dans la vitrine, avant le script principal.

   On injecte le CATALOGUE, pas les images. Les onze compositions pèsent plus
   de 600 Ko : en ligne, elles faisaient passer src/vitrine.html au-dessus du
   mégaoctet, à charger intégralement avant le premier pixel et à recharger à
   chaque visite. Les fichiers restent des fichiers — mis en cache par le
   navigateur, chargeables en différé, et référençables par `<img>` ou par
   `background-image`. La page ne reçoit ici que ce dont elle a besoin pour
   les placer : chemin, dimensions, ambiance, rôle. */
const cible = path.join(RACINE, 'src', 'vitrine.html');
let html = fs.readFileSync(cible, 'utf8');
const DEB = '<!--SCENES:DEBUT-->', FIN = '<!--SCENES:FIN-->';
const catalogue = {};
for (const s of SCENES) {
  catalogue[s.id] = {
    src: 'scenes/' + s.id + '.svg', l: s.W, h: s.H, ambiance: s.ambiance,
    titre: s.titre || null,
    alt: s.titre ? (s.titre + (s.sousTitre ? ' — ' + s.sousTitre : '')) : 'Scène Aura'
  };
}
const bloc = DEB + '\n<script>var SCENES = ' + JSON.stringify(catalogue) + ';</script>\n' + FIN;
if (html.includes(DEB)) html = html.replace(new RegExp(DEB + '[\\s\\S]*?' + FIN), bloc);
else {
  const i = html.indexOf('<script>');
  if (i < 0) throw new Error('aucun <script> dans src/vitrine.html');
  html = html.slice(0, i) + bloc + '\n' + html.slice(i);
}
fs.writeFileSync(cible, html);
console.log(`scènes : ${SCENES.length} composition(s), ${(total / 1024).toFixed(1)} Ko`);
console.log('  manifeste : src/scenes/MANIFESTE.json');
