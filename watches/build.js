'use strict';
/* AURA WATCHES — génère l'accueil et les fiches depuis data/modeles.json.
   node watches/build.js
   Règle absolue : aucun prix, nulle part — ni en texte, ni en données structurées. */
const fs = require('fs');
const path = require('path');

const RACINE = __dirname;
const D = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'modeles.json'), 'utf8'));
const IG = D.instagram.url;
const HANDLE = D.instagram.handle;
const M = D.modeles;
const parSlug = Object.fromEntries(M.map(m => [m.slug, m]));

if (IG !== 'https://www.instagram.com/polakpl_f44/') throw new Error('URL Instagram inattendue : ' + IG);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const titreModele = nom => nom.replace(/^AURA /, '');

const SPEC_LIBELLES = { mouvement: 'Mouvement', verre: 'Verre', materiaux: 'Matériaux', diametre: 'Diamètre', etancheite: 'Étanchéité' };

function tete({ titre, description, base, image, jsonld }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#070609">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${base}img/${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23070609'/%3E%3Ctext x='32' y='45' font-family='Georgia,serif' font-size='40' text-anchor='middle' fill='%23e2cfae'%3EA%3C/text%3E%3C/svg%3E">
<link rel="preload" href="${base}fonts/bodoni-moda-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Mrs+Saint+Delafield&display=swap">
<link rel="stylesheet" href="${base}assets/aura.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>`;
}

function entete(base, accueil) {
  return `<header class="entete">
  <a class="marque" href="${base}index.html" aria-label="AURA WATCHES — accueil">AURA<small>WATCHES</small></a>
  <nav class="nav" aria-label="Navigation principale">
    <a class="cache-mobile" href="${accueil ? '' : base + 'index.html'}#selection">La sélection</a>
    <a class="cache-mobile" href="${accueil ? '' : base + 'index.html'}#fonctionnement">Fonctionnement</a>
    <a class="ig" href="${IG}" target="_blank" rel="noopener">Instagram ↗</a>
  </nav>
</header>`;
}

function pied(base) {
  return `<footer class="pied">
  <div>
    <p class="sign">More than time. A lifestyle called Aura.</p>
    <p style="margin-top:18px">AURA WATCHES est une maison indépendante qui sélectionne des montres custom, préparées sur commande via un atelier partenaire. Sans affiliation avec aucune manufacture horlogère. Tarif, disponibilité et délai communiqués individuellement, en privé. Remise en main propre uniquement : ${D.zones.join(', ')}.</p>
  </div>
  <a class="lien" href="${IG}" target="_blank" rel="noopener">${esc(HANDLE)} ↗</a>
</footer>
<script src="${base}assets/aura.js" defer></script>
</body>
</html>
`;
}

/* Une pièce sans photo AURA validée affiche un cartouche typographique, jamais une image de remplacement. */
const aPhoto = slug => fs.existsSync(path.join(RACINE, 'img', slug + '.webp'));
const MANQUANTES = M.filter(m => !aPhoto(m.slug)).map(m => m.slug);
function visuel(m, base, attrs) {
  return aPhoto(m.slug)
    ? `<img src="${base}img/${m.slug}.webp" alt="${esc(m.nom)}" ${attrs}>`
    : `<div class="attente" role="img" aria-label="${esc(m.nom)} — photo en préparation"><span>${esc(titreModele(m.nom))}</span><small>Photo en préparation</small></div>`;
}

function carte(m, base, classe = '') {
  return `<a class="piece revele${classe}" href="${base}montre/${m.slug}.html">
  <div class="piece__cadre"><span class="piece__n">${m.n}</span>${visuel(m, base, 'loading="lazy" decoding="async" width="1664" height="2080"')}</div>
  <div class="piece__info">
    <div><h3 class="piece__nom">${esc(m.nom)}</h3><div class="piece__ligne">${esc(m.ligne)}</div></div>
    <span class="piece__go">Découvrir →</span>
  </div>
</a>`;
}

/* Demande privée : lien réel vers le profil + copie du message par aura.js. */
function demande(m, libelle = 'Demander le prix', classe = 'cta') {
  const attr = m ? esc(m.nom) : '';
  return `<a class="${classe}" href="${IG}" target="_blank" rel="noopener" data-demande="${attr}">${libelle} <span aria-hidden="true">→</span></a>`;
}

const ORGA = { '@type': 'Organization', name: 'AURA WATCHES', sameAs: [IG] };

/* ─── Accueil ────────────────────────────────────────────────────────── */
function accueil() {
  const base = '';
  const trois = ['lagoon', 'open-rose', 'skull-blue'].map(s => parSlug[s]);
  const finale = aPhoto('open-rose') ? parSlug['open-rose'] : (M.find(m => aPhoto(m.slug)) || parSlug['open-rose']);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ORGA,
      { '@type': 'ItemList', name: 'The Aura Edit', itemListElement: M.map((m, i) => ({
        '@type': 'ListItem', position: i + 1, url: `montre/${m.slug}.html`, name: m.nom })) }
    ]
  };
  const faq = [
    ['Pourquoi le tarif n’est-il pas affiché ?', 'Chaque demande est traitée individuellement. Disponibilité, tarif et délai sont confirmés en privé avant validation.'],
    ['Comment faire une demande ?', `Ouvrez la pièce qui vous parle et touchez « Demander le prix ». Un message est copié, notre profil Instagram ${HANDLE} s’ouvre : collez-le dans la conversation.`],
    ['Comment se passe le paiement ?', 'Paiement intégral par virement bancaire, uniquement après confirmation en privé de la pièce, du tarif et du délai. Aucun paiement sur ce site.'],
    ['Quel est le délai ?', 'Chaque pièce est préparée sur commande. Un délai indicatif vous est communiqué avant validation.'],
    ['Où a lieu la remise ?', `En main propre uniquement : ${D.zones.join(', ')}. Pas d’envoi postal.`],
    ['S’agit-il de montres de grandes maisons ?', 'Non. AURA sélectionne des montres custom, préparées via un atelier partenaire spécialisé. Elles ne sont affiliées à aucune manufacture horlogère.'],
    ['Et si le modèle que je cherche n’est pas ici ?', 'D’autres modèles sont disponibles sur demande. Écrivez-nous sur Instagram.']
  ];

  return tete({
    titre: 'AURA WATCHES — Sélection privée de montres custom',
    description: 'Sélection privée de montres custom. Des pièces choisies pour leur présence. Disponibilité et tarif communiqués en privé. Remise en main propre à Estinnes, Mons, Binche et La Louvière.',
    base, image: 'bg-hero.webp', jsonld
  }) + `
<body>
${entete(base, true)}
<main>

<!-- 01 — HERO -->
<section class="hero" data-barre-apres>
  <div class="hero__fond"><img src="img/bg-hero.webp" alt="" fetchpriority="high" width="1280" height="720"></div>
  <span class="hero__script script" aria-hidden="true">Miami Vibes Always</span>
  <div class="hero__corps">
    <h1>AURA<span>WATCHES</span></h1>
    <div class="hero__droite">
      <p class="display">Sélection privée<br>de montres custom</p>
      <p class="texte">Des pièces choisies pour leur présence.<br>Disponibilité et tarif communiqués en privé.</p>
      <div class="hero__actions">
        <a class="cta" href="#selection">Découvrir la sélection <span aria-hidden="true">→</span></a>
        <a class="lien" href="${IG}" target="_blank" rel="noopener">Instagram ↗</a>
      </div>
      <p class="hero__micro">Sur commande<b>•</b>Remise en main propre</p>
    </div>
  </div>
</section>

<!-- 02 — THE THREE -->
<section class="section" aria-labelledby="t-trois">
  <div class="entete-section revele">
    <div><span class="sur">The Three</span><h2 class="titre" id="t-trois">Trois <em>présences.</em></h2></div>
    <p class="texte">Votre prochaine pièce commence ici.</p>
  </div>
  <div class="trois">
${trois.map(m => carte(m, base)).join('\n')}
  </div>
</section>

<!-- 03 — THE AURA TEN -->
<section class="section" id="selection" aria-labelledby="t-dix" style="padding-top:calc(var(--section) * .6)">
  <div class="entete-section revele">
    <div><span class="sur">La sélection</span><h2 class="titre" id="t-dix">The Aura <em>Edit.</em></h2></div>
    <p class="texte">${M.length} pièces. Chacune sur commande, chacune confirmée en privé.</p>
  </div>
  <div class="dix">
${M.map(m => carte(m, base)).join('\n')}
  </div>
  <p class="texte revele" style="margin:clamp(96px,12vw,200px) auto 0;text-align:center">Autres modèles disponibles sur demande.<br><a class="lien" style="margin-top:18px" href="${IG}" target="_blank" rel="noopener" data-demande="">Écrire sur Instagram ↗</a></p>
</section>

<!-- 04 — MORE THAN TIME -->
<section class="section manifeste" aria-label="Manifeste">
  <span class="script revele" aria-hidden="true">More than Time</span>
  <p class="revele">Une montre ne donne pas l’heure. Elle donne <em>le ton.</em></p>
  <hr class="filet" style="margin:48px auto 0">
</section>

<!-- 05 — THE DETAILS -->
<section class="section" aria-labelledby="t-details">
  <div class="details">
    <figure class="revele">${fs.existsSync(path.join(RACINE, 'img', 'details.webp'))
      ? '<img src="img/details.webp" alt="Pièces AURA posées sur du marbre noir" loading="lazy">'
      : '<img src="img/bg-night.webp" alt="" loading="lazy">'}</figure>
    <div class="revele">
      <span class="sur">The Details</span>
      <h2 class="titre" id="t-details" style="font-size:clamp(40px,5.4vw,80px);margin-top:22px">Le détail, <em>confirmé.</em></h2>
      <ol>
        <li><b>01</b><span><strong>Sélection</strong>Des pièces retenues pour leur dessin et leur tenue au poignet.</span></li>
        <li><b>02</b><span><strong>Caractéristiques exactes</strong>Mouvement, verre, matériaux, diamètre, étanchéité : communiqués pour chaque pièce avant validation. Rien n’est promis qui ne soit confirmé.</span></li>
        <li><b>03</b><span><strong>Contrôle</strong>Chaque pièce est réceptionnée et contrôlée par AURA avant la remise.</span></li>
      </ol>
    </div>
  </div>
</section>

<!-- 06 — HOW IT WORKS -->
<section class="section" id="fonctionnement" aria-labelledby="t-fonc">
  <div class="entete-section revele">
    <div><span class="sur">Fonctionnement</span><h2 class="titre" id="t-fonc">Simple. <em>Privé.</em></h2></div>
    <p class="texte">Chaque demande est traitée individuellement. Disponibilité, tarif et délai sont confirmés en privé avant validation.</p>
  </div>
  <div class="etapes revele">
    <div class="etape"><b>01</b><h3>Découvrir</h3><p>Parcourez la sélection et ouvrez la pièce qui vous parle.</p></div>
    <div class="etape"><b>02</b><h3>Demander en privé</h3><p>« Demander le prix » ouvre ${esc(HANDLE)}, message prêt à coller.</p></div>
    <div class="etape"><b>03</b><h3>Confirmer</h3><p>Disponibilité, tarif, caractéristiques, délai et conditions, en privé. Puis virement intégral.</p></div>
    <div class="etape"><b>04</b><h3>Recevoir</h3><p>Préparation par l’atelier partenaire, contrôle AURA, remise en main propre.</p></div>
  </div>
  <div class="parcours revele" aria-label="Après la confirmation">
    <p><b>05 — Paiement</b>Virement bancaire intégral, uniquement après confirmation.</p>
    <p><b>06 — Préparation</b>La pièce est préparée via l’atelier partenaire spécialisé.</p>
    <p><b>07 — Contrôle</b>AURA réceptionne et contrôle la pièce.</p>
    <p><b>08 — Remise</b>En main propre uniquement.</p>
  </div>
</section>

<!-- 07 — PRIVATE HANDOVER -->
<section class="remise" aria-labelledby="t-remise">
  <img src="img/bg-hero.webp" alt="" loading="lazy" width="1280" height="720">
  <div class="revele" style="padding:0 var(--marge)">
    <span class="sur">Remise en main propre uniquement</span>
    <h2 class="titre" id="t-remise" style="margin-top:26px">Private <em>Handover.</em></h2>
    <ul class="zones">${D.zones.map(z => `<li>${esc(z)}</li>`).join('')}</ul>
  </div>
</section>

<!-- 08 — FAQ -->
<section class="section" aria-labelledby="t-faq">
  <div class="faq">
    <div class="revele" style="margin-bottom:56px"><span class="sur">Questions</span><h2 class="titre" id="t-faq" style="margin-top:22px;font-size:clamp(40px,5.4vw,80px)">En <em>privé.</em></h2></div>
${faq.map(([q, r]) => `    <details class="revele"><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('\n')}
  </div>
</section>

<!-- 09 — INSTAGRAM -->
<section class="section" aria-labelledby="t-ig">
  <div class="ig-bloc">
    <div class="revele">
      <span class="sur">Instagram</span>
      <h2 class="titre" id="t-ig" style="margin-top:22px">Follow the <em>Aura.</em></h2>
      <a class="ig-handle" href="${IG}" target="_blank" rel="noopener">${esc(HANDLE)}</a>
      <p class="texte">Nouvelles pièces, disponibilités et demandes privées.</p>
      <a class="cta cta--xxl" style="margin-top:36px" href="${IG}" target="_blank" rel="noopener">Ouvrir Instagram <span aria-hidden="true">↗</span></a>
    </div>
    <div class="mosaique revele" aria-label="Aperçu éditorial de la sélection">
      <a class="grand" href="${IG}" target="_blank" rel="noopener" aria-label="Instagram ${esc(HANDLE)}"><img src="img/bg-hero.webp" alt="" loading="lazy"></a>
${['lagoon', 'emerald', 'carre-ivory', 'octa-blue', 'skull-silver'].map(k => parSlug[k]).map(m =>
      `      <a class="piece-ig" href="montre/${m.slug}.html">${visuel(m, '', 'loading="lazy"')}</a>`).join('\n')}
    </div>
  </div>
</section>

<!-- 10 — FINAL -->
<section class="final" aria-labelledby="t-final" data-barre-fin>
  <div class="final__fond"><img src="img/bg-night.webp" alt="" loading="lazy"></div>
  <div class="final__texte revele">
    <span class="sur">Find your Aura</span>
    <h2 class="titre" id="t-final" style="margin-top:24px">Find your <em>Aura.</em></h2>
    <p class="texte" style="margin:28px 0 40px">Découvrez votre prochaine pièce.</p>
    ${demande(null, 'Demander le prix en privé', 'cta cta--xxl')}
    <p class="final__sous"><a href="${IG}" target="_blank" rel="noopener">${esc(HANDLE)}</a><br>Disponibilité • tarif • délai<br>confirmés individuellement.</p>
  </div>
  <div class="final__piece revele">${visuel(finale, '', 'loading="lazy"')}</div>
</section>

</main>

<div class="barre" aria-label="Demande privée">
  <span class="barre__nom">Instagram · ${esc(HANDLE)}</span>
  ${demande(null, 'Demander')}
</div>
` + pied(base);
}

/* ─── Fiche pièce ────────────────────────────────────────────────────── */
function fiche(m) {
  const base = '../';
  const i = M.indexOf(m);
  const autres = [1, 2, 3].map(k => M[(i + k) % M.length]);
  const specs = Object.entries(m.specs || {}).filter(([k, v]) => SPEC_LIBELLES[k] && String(v).trim());
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: m.nom,
    description: m.accroche.join(' '),
    image: `${base}img/${m.slug}.webp`,
    brand: { '@type': 'Brand', name: 'AURA WATCHES' }
  };
  return tete({
    titre: `${m.nom} — AURA WATCHES`,
    description: `${m.nom}. ${m.accroche.join(' ')} Tarif et disponibilité communiqués en privé.`,
    base, image: `${m.slug}.webp`, jsonld
  }) + `
<body>
${entete(base, false)}
<main>
<section class="fiche">
  <a class="fiche__retour lien" href="../index.html#selection">← La sélection</a>
  <div class="fiche__vue">
    <span class="fiche__n" aria-hidden="true">${m.n}</span>
    ${visuel(m, '../', 'fetchpriority="high" width="1664" height="2080"')}
  </div>
  <div class="fiche__texte">
    <span class="sur">The Aura Edit — ${m.n}/${M.length}</span>
    <h1 class="titre" style="margin-top:22px">AURA<br><em>${esc(titreModele(m.nom))}</em></h1>
    <p class="ligne">${esc(m.ligne.replace(' • ', ' / '))}</p>
    <p class="fiche__accroche">${m.accroche.map(esc).join('<br>')}</p>
    <div data-barre-apres>${demande(m, 'Demander le prix', 'cta cta--xxl')}</div>
    <p class="fiche__micro">Tarif &amp; disponibilité communiqués en privé.<br>Le message est copié : collez-le dans la conversation Instagram.</p>
    <p style="margin-top:28px"><a class="lien" href="${IG}" target="_blank" rel="noopener">Voir notre Instagram ↗</a></p>
  </div>
</section>

<section class="section" aria-labelledby="t-det" style="padding-top:calc(var(--section) * .6)">
  <div class="revele" style="max-width:1100px">
    <span class="sur">Détails</span>
    <h2 class="titre" id="t-det" style="margin:22px 0 48px;font-size:clamp(36px,4.6vw,64px)">Caractéristiques</h2>
${specs.length
    ? `    <dl class="specs">${specs.map(([k, v]) => `<div><dt>${SPEC_LIBELLES[k]}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
    : `    <p class="specs-attente">Mouvement, verre, matériaux, diamètre et étanchéité vous sont communiqués en privé pour cette pièce, avant toute validation. Nous n’affichons que ce qui est confirmé.</p>`}
  </div>
</section>

<section class="section" aria-labelledby="t-proc" style="padding-top:0">
  <div class="etapes revele">
    <div class="etape"><b>01</b><h3>Demande</h3><p>Message privé sur Instagram.</p></div>
    <div class="etape"><b>02</b><h3>Confirmation</h3><p>Disponibilité, tarif, délai et conditions.</p></div>
    <div class="etape"><b>03</b><h3>Virement</h3><p>Paiement intégral, uniquement après confirmation.</p></div>
    <div class="etape"><b>04</b><h3>Remise</h3><p>En main propre : ${D.zones.join(', ')}.</p></div>
  </div>
  <h2 class="sr" id="t-proc">Fonctionnement</h2>
</section>

<section class="section" aria-labelledby="t-autres" style="padding-top:0">
  <div class="entete-section revele" style="margin-bottom:56px">
    <div><span class="sur">Continuer</span><h2 class="titre" id="t-autres" style="margin-top:22px;font-size:clamp(36px,4.6vw,64px)">Autres <em>pièces.</em></h2></div>
    <a class="lien" href="../index.html#selection">Toute la sélection →</a>
  </div>
  <div class="autres">
${autres.map(a => carte(a, base)).join('\n')}
  </div>
</section>
</main>

<div class="barre" aria-label="Demande privée" data-toujours>
  <span class="barre__nom">${esc(m.nom)}</span>
  ${demande(m, 'Demander le prix')}
</div>
` + pied(base);
}

fs.writeFileSync(path.join(RACINE, 'index.html'), accueil());
for (const m of M) fs.writeFileSync(path.join(RACINE, 'montre', `${m.slug}.html`), fiche(m));
console.log(`AURA WATCHES : accueil + ${M.length} fiches générés.`);
if (MANQUANTES.length) console.log(`Photos AURA manquantes (${MANQUANTES.length}) : ${MANQUANTES.join(', ')}`);
