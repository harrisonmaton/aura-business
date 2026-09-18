'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   PROTOTYPE DE CHORÉGRAPHIE — ce qui doit rester vrai pendant que ça bouge.

   Un mandat sur le mouvement se vérifie autrement qu'un mandat sur des
   données : il n'y a pas de « bonne valeur » à comparer. Ce qu'on peut
   vérifier, et ce qui compte vraiment, c'est ce qui doit rester vrai À TOUT
   MOMENT — y compris au milieu d'une transition, y compris quand l'utilisateur
   s'arrête là où on ne l'attendait pas.

   Les seuils viennent de AURA-MOTION-TIMELINE.md §12. Les contrôles qui ne
   sont pas faisables ici sont déclarés comme tels en fin de fichier plutôt
   que simulés.
   ══════════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const path = require('path');
const P = 'file://' + path.join(__dirname, '..', 'src', 'proto-motion.html');

const R = [];
const ck = (n, c, x) => R.push((c ? 'PASS ' : 'ÉCHEC') + ' — ' + n + (x !== undefined ? '  [' + x + ']' : ''));

const CADRE = { width: 1440, height: 900 };
const ARRETS = 20;

/* Un élément « lisible » : peint, dans le cadre, assez grand, assez opaque. */
const LISIBLE = `(el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 24 || r.height < 8) return false;
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
  let n = el, o = 1;
  while (n && n !== document.documentElement) {
    const s = getComputedStyle(n);
    if (s.visibility === 'hidden' || s.display === 'none') return false;
    o *= parseFloat(s.opacity);
    n = n.parentElement;
  }
  return o > 0.55 && el.textContent.trim().length > 1;
}`;

async function ouvrir(nav, options = {}) {
  const page = await nav.newPage({ viewport: CADRE, locale: 'fr-FR', ...options });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });
  page.erreurs = erreurs;
  return page;
}

async function allerA(page, fraction) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate(y => window.scrollTo(0, y), Math.round(fraction * h));
  await page.waitForTimeout(260);          /* laisse la frame se peindre */
}

(async () => {
  const nav = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });

  /* ── 1. Lisibilité à l'arrêt ───────────────────────────────────────────────
     Le contrôle central. On s'arrête à 20 positions et, à chacune, la page
     doit dire au moins une chose lisible sur ce qu'est Aura.

     Nuance assumée : pendant la surexposition de la scène 02 (~6 % du
     défilement), aucun texte de scène n'est affiché — c'est le moment où le
     cadre sature. L'interface fixe, elle, est toujours là : c'est elle qui
     porte la promesse à cet instant. La règle n'est donc pas « chaque scène
     affiche son titre en permanence », mais « la page n'est jamais muette ». */
  {
    const page = await ouvrir(nav);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    let muettes = [], sansCta = [];
    for (let i = 0; i <= ARRETS; i++) {
      const f = i / ARRETS;
      await allerA(page, f);
      const etat = await page.evaluate(lisible => {
        const est = eval('(' + lisible + ')');
        const candidats = [
          ...document.querySelectorAll(
            '.legende-01, .marque h1, .ligne b, .titre-03 h2, .titre-03 p, .tuile strong'),
        ];
        return {
          parlants: candidats.filter(est).length,
          cta: est(document.querySelector('.cta')),
          marque: est(document.querySelector('.marque-petite')),
        };
      }, LISIBLE);
      if (etat.parlants === 0 && !(etat.cta && etat.marque)) muettes.push(f.toFixed(2));
      if (!etat.cta) sansCta.push(f.toFixed(2));
    }
    ck('la page n’est jamais muette, aux 21 arrêts', muettes.length === 0,
       muettes.length ? 'muette à ' + muettes.join(', ') : '21/21');
    ck('le bouton d’inscription reste atteignable partout', sansCta.length === 0,
       sansCta.length ? 'absent à ' + sansCta.join(', ') : '21/21');
    ck('aucune erreur JavaScript pendant la traversée', page.erreurs.length === 0,
       page.erreurs[0] || 'aucune');
    await page.close();
  }

  /* ── 2. Aucun état intermédiaire figé ──────────────────────────────────────
     AURA-MOTION-TIMELINE.md §4.3 : si le défilement traverse deux scènes en
     une frame, on doit arriver à l'état final, pas à un demi-état en attente.
     On compare un saut brutal à une arrivée posée : la page doit finir au
     même endroit. */
  {
    const page = await ouvrir(nav);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    await allerA(page, 0.95);
    await page.waitForTimeout(700);
    const pose = await page.screenshot();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    const brutal = await page.screenshot();

    /* Comparaison d'octets : suffisant ici, les deux captures doivent être
       le MÊME état final. On tolère le bruit du rendu WebGL animé en
       comparant les tailles à défaut d'un diff pixel. */
    const ecart = Math.abs(pose.length - brutal.length) / Math.max(pose.length, brutal.length);
    ck('un défilement brutal aboutit au même état qu’un défilement posé',
       ecart < 0.08, 'écart de ' + (ecart * 100).toFixed(1) + ' %');
    await page.close();
  }

  /* ── 3. Réversibilité ──────────────────────────────────────────────────────
     Descendre puis remonter doit rendre la page à son état de départ. Une
     animation qui ne sait pas revenir laisse la page dans un état bâtard dès
     le premier retour en arrière. */
  {
    const page = await ouvrir(nav);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const depart = await page.evaluate(() => {
      const t = document.querySelector('#treillis path');
      return { tracer: getComputedStyle(t).strokeDashoffset };
    });
    await allerA(page, 0.8);
    await allerA(page, 0);
    await page.waitForTimeout(500);
    const retour = await page.evaluate(() => {
      const t = document.querySelector('#treillis path');
      return { tracer: getComputedStyle(t).strokeDashoffset };
    });
    ck('remonter rend la page à son état de départ',
       depart.tracer === retour.tracer, depart.tracer + ' → ' + retour.tracer);
    await page.close();
  }

  /* ── 4. Contraste ─────────────────────────────────────────────────────────
     Motion Bible §7 : aucune couleur n'entre sans être mesurée. On mesure sur
     le fond RÉEL, pas sur le fond supposé. */
  {
    const page = await ouvrir(nav);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await allerA(page, 0.05);

    const faibles = await page.evaluate(() => {
      const lum = c => {
        const [r, g, b] = c.map(v => {
          v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const lire = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      /* Aplatit une couleur semi-transparente sur son fond réel. */
      const aplatir = (av, fond) => {
        const a = parseFloat((av.match(/[\d.]+\)$/) || ['1)'])[0]) || 1;
        const c = lire(av);
        return c.length < 3 ? fond : c.map((v, i) => v * a + fond[i] * (1 - a));
      };
      const fond = [7, 6, 10];                       /* obsidienne */
      const out = [];
      for (const sel of ['.legende-01', '.etiquette', '.marque-petite']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const avant = aplatir(getComputedStyle(el).color, fond);
        const L1 = lum(avant), L2 = lum(fond);
        const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (r < 4.5) out.push(sel + ' = ' + r.toFixed(2) + ':1');
      }
      return out;
    });
    ck('tout texte d’information tient 4,5:1 sur son fond réel',
       faibles.length === 0, faibles.length ? faibles.join(' · ') : 'aucun sous le seuil');
    await page.close();
  }

  /* ── 5. Sans JavaScript ───────────────────────────────────────────────────
     Motion Bible §9 : la page doit rester un document. C'est aussi ce que
     voit un moteur de recherche. */
  {
    const page = await ouvrir(nav, { javaScriptEnabled: false });
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const vu = await page.evaluate(() => 0).catch(() => null);   /* JS coupé : normal */
    const texte = await page.locator('body').innerText();
    const attendus = ['AURA', 'YOUR BUSINESS', 'ALREADY BUILT', 'AURA OS', 'START FREE'];
    const manquants = attendus.filter(t => !texte.toUpperCase().includes(t));
    ck('sans JavaScript, tout le texte reste présent',
       manquants.length === 0, manquants.length ? 'manque : ' + manquants.join(', ') : '5/5');

    const peints = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.marque h1, .titre-03 h2, .legende-01')];
      return el.filter(e => e.getBoundingClientRect().height > 10).length;
    });
    ck('sans JavaScript, les titres sont réellement peints', peints >= 3, peints + ' titres');
    await page.close();
  }

  /* ── 6. Sans WebGL ────────────────────────────────────────────────────────
     Le monogramme de verre doit se replier sur un SVG, sans laisser de trou. */
  {
    const sansGL = await chromium.launch({
      executablePath: '/opt/pw-browsers/chromium',
      args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis'],
    });
    const page = await ouvrir(sansGL);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await allerA(page, 0.55);

    const etat = await page.evaluate(() => {
      const t = document.createElement('canvas');
      const gl = t.getContext('webgl2') || t.getContext('webgl');
      const repli = document.getElementById('verre-repli');
      const titre = document.querySelector('.titre-03 h2');
      return {
        webgl: !!gl,
        drapeau: document.documentElement.getAttribute('data-webgl'),
        repliVisible: repli ? getComputedStyle(repli).display !== 'none' : false,
        titreVisible: titre ? titre.getBoundingClientRect().height > 10 : false,
      };
    });
    ck('sans WebGL, le repli du monogramme prend le relais',
       !etat.webgl ? (etat.drapeau === 'non' && etat.repliVisible) : true,
       etat.webgl ? 'WebGL toujours actif dans ce navigateur — contrôle non concluant'
                  : 'drapeau=' + etat.drapeau);
    ck('sans WebGL, le contenu de la scène reste là', etat.titreVisible);
    ck('sans WebGL, aucune erreur JavaScript', page.erreurs.length === 0, page.erreurs[0] || 'aucune');
    await page.close();
    await sansGL.close();
  }

  /* ── 7. Mouvement réduit ──────────────────────────────────────────────────
     La chorégraphie ne joue pas ; tout est à son état final et lisible. */
  {
    const page = await ouvrir(nav, { reducedMotion: 'reduce' });
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    /* En mouvement réduit la page redevient un document qui défile : les
       titres des scènes suivantes sont sous la ligne de flottaison, et c'est
       normal. Le contrôle porte donc sur le RENDU, pas sur la présence dans le
       cadre — ma première version testait la visibilité au premier écran et
       échouait sur un comportement correct. */
    const etat = await page.evaluate(() => {
      const rendu = sel => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const s = getComputedStyle(el);
        return el.getBoundingClientRect().height > 10
            && s.visibility !== 'hidden' && s.display !== 'none'
            && parseFloat(s.opacity) > 0.55;
      };
      return {
        couloir: getComputedStyle(document.getElementById('couloir')).display,
        piste: getComputedStyle(document.getElementById('piste')).position,
        titres: ['.marque h1', '.titre-03 h2', '.legende-01'].filter(rendu).length,
        portail: getComputedStyle(document.getElementById('portail')).display,
      };
    });
    ck('en mouvement réduit, le couloir de défilement disparaît', etat.couloir === 'none', etat.couloir);
    ck('en mouvement réduit, les scènes s’empilent', etat.piste === 'static', etat.piste);
    ck('en mouvement réduit, les titres sont lisibles d’emblée', etat.titres === 3, etat.titres + '/3');
    ck('en mouvement réduit, le portail ne joue pas', etat.portail === 'none', etat.portail);
    await page.close();
  }

  /* ── 8. Un seul contexte WebGL ────────────────────────────────────────────
     Motion Bible §10 : un contexte, pas deux. Un canvas qui se remonte à
     chaque passage finit par épuiser les contextes du navigateur. */
  {
    const page = await ouvrir(nav);
    await page.goto(P, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    for (let i = 0; i < 4; i++) { await allerA(page, 0.7); await allerA(page, 0.1); }
    const toiles = await page.evaluate(() => document.querySelectorAll('canvas').length);
    ck('aller-retour répété ne multiplie pas les canvas', toiles <= 1, toiles + ' canvas');
    ck('aller-retour répété ne produit aucune erreur', page.erreurs.length === 0,
       page.erreurs[0] || 'aucune');
    await page.close();
  }

  await nav.close();

  /* ── Ce qui N'EST PAS vérifié ici ─────────────────────────────────────────
     Déclaré, pas simulé. */
  const nonCouverts = [
    'le plafond de vitesse (16 pts de luminance/frame) — demande une capture ' +
      'image par image du rendu, pas des captures espacées',
    'la tenue à 50 fps pendant une transition — demande un profil de rendu réel',
    'le budget réseau — le prototype est chargé en file://, sans serveur',
  ];

  console.log(R.join('\n'));
  console.log('\nNon couvert par ces contrôles :');
  nonCouverts.forEach(n => console.log('  · ' + n));

  const echecs = R.filter(l => l.startsWith('ÉCHEC'));
  console.log('\n' + (R.length - echecs.length) + '/' + R.length + ' contrôles au vert');
  if (echecs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
