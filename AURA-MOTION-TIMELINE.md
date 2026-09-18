# AURA — Motion Timeline

La tête de lecture, scène par scène. Une seule timeline maîtresse, normalisée
`0 → 1`. Tout mouvement majeur est accroché à elle ; rien ne s'anime dans son
coin.

Les règles de vitesse, de courbe et de profondeur sont dans
`AURA-MOTION-BIBLE.md`. Ici : le découpage, les durées, et la mécanique du
scroll.

---

## 1. Découpage maître

| Scène | Fenêtre `t` | Distance | Titre | Valeur | WebGL |
|:--|:--|:--|:--|:--|:--:|
| **01** | 0,000 – 0,070 | 60 vh | Construction du A | obsidienne | — |
| **02** | 0,070 – 0,150 | 70 vh | Révélation de la marque | obsidienne → bleu | ✅ |
| **03** | 0,150 – 0,310 | 140 vh | Aura OS | obsidienne | ✅ |
| **04** | 0,310 – 0,480 | 150 vh | Univers métiers | obsidienne | ✅ |
| **05** | 0,480 – 0,590 | 100 vh | Rupture éditoriale | **ivoire** | — |
| **06** | 0,590 – 0,740 | 130 vh | Aura Food | sombre coloré | — |
| **07** | 0,740 – 0,850 | 100 vh | Mur produit | obsidienne | ✅ |
| **08** | 0,850 – 0,940 | 80 vh | Les plans | obsidienne | — |
| **09** | 0,940 – 1,000 | 60 vh | Final | obsidienne | ✅ |

**Total : 890 vh.** Soit ~9 écrans de défilement. C'est long, et c'est
volontaire : les 3,6 s de carrousel de la référence ne se transposent pas en
temps, elles se transposent en **distance**.

### Ce que j'ai changé par rapport à ton découpage

Ta proposition allait de `0 → 0,08` pour l'intro puis `0,08 → 0,18` pour le
wordmark. Je l'ai resserrée à `0 → 0,07` et `0,07 → 0,15`, pour une raison
mesurée : dans la référence, **l'intro et la révélation de marque occupent
ensemble 1,53 s sur 12,3, soit 12,4 % du film**. Ton découpage leur en donnait
18 %. Un visiteur qui doit scroller deux écrans avant de savoir ce qu'on lui
vend, c'est deux écrans de trop.

Le temps récupéré va à la scène 04 (univers métiers), qui dans la référence
est la plus longue de toutes — 3,6 s, soit 29 % du film. C'est elle qui porte
la valeur.

---

## 2. Scène 01 — Construction du A · `t 0,000 → 0,070`

**Ce qu'on voit.** Obsidienne. Des filets chrome traversent le cadre depuis
six directions, en perspective, et convergent en un A géométrique. Dérive très
lente et continue de l'ensemble. Une pulsation lumineuse parcourt un filet
toutes les ~2 s.

**Ce que la référence ne dit pas.** Son treillis est déjà tracé à la première
frame : on ne sait pas comment il se construit. Le tracé progressif est **notre
décision**, pas une reprise.

| `t` local | Mouvement | Courbe |
|:--|:--|:--|
| 0,00 → 0,55 | Tracé des 6 filets, décalés de 60 ms | `power2.out` |
| 0,30 → 1,00 | Dérive lente de l'ensemble, ±3° | linéaire |
| 0,70 → 1,00 | Le contre-poinçon du A s'éclaire | `power2.out` |

**Technique.** SVG, `stroke-dasharray` / `stroke-dashoffset`. Pas de WebGL.
Pas de canvas. Six `<path>` et une transformation.

**Sans JS** : le SVG s'affiche entièrement tracé. C'est un logo.

---

## 3. Scène 02 — Révélation de la marque · `t 0,070 → 0,150`

**Ce qu'on voit.** Le contre-poinçon du A s'ouvre, grandit jusqu'à dépasser le
cadre, et la lumière sature. Derrière, **AURA** est déjà là, à ~250 % de la
largeur, et redescend à 100 %. Puis `YOUR BUSINESS.` / `ALREADY BUILT.`
arrivent, décalées.

| `t` local | Mouvement | Durée équiv. | Courbe |
|:--|:--|:--|:--|
| 0,00 → 0,30 | Portail : `scale 0,02 → 1,4`, halo | 0,20 s | `power3.in` |
| 0,25 → 0,35 | Surexposition — amplitude ~80 | 0,20 s | `power2.out` |
| 0,30 → 0,62 | AURA `scale 2,5 → 1`, flou directionnel 24px → 0 | 0,35 s | `power2.out` |
| 0,62 → 0,78 | `YOUR BUSINESS.` — masque montant | 0,22 s | `power3.out` |
| 0,70 → 0,88 | `ALREADY BUILT.` — masque montant, +80 ms | 0,22 s | `power3.out` |
| 0,80 → 1,00 | Réfraction magenta qui balaie le wordmark | — | linéaire |

**Les deux lignes n'arrivent pas ensemble** — 80 ms d'écart. C'est ce décalage
qui fait la chorégraphie ; simultanées, elles font une diapositive.

**Technique.** Le wordmark est du **vrai texte** dans le DOM, pas une image :
il doit être sélectionnable et lisible par un moteur de recherche. La
réfraction est un canvas WebGL **derrière** le texte, en `mix-blend-mode`.

**Dégradé** : sans WebGL, le dégradé magenta→cyan se fait en
`background-clip: text`. Sans JS, le texte est là, à sa taille finale.

---

## 4. Le problème que la référence n'a pas résolu

Avant d'aller plus loin : le point dur.

La référence avance à vitesse **rigoureusement constante**. Je n'ai pas pu
déterminer si elle est pilotée par le scroll ou si elle se joue seule — mais
cette régularité n'est pas un comportement de scroll humain. Il est possible
que sa chorégraphie n'ait jamais eu à gérer un utilisateur.

Aura, elle, doit le gérer. Trois cas, trois réponses.

### 4.1 — L'utilisateur s'arrête au milieu d'une transition
**Réponse : les transitions ne sont pas scrubbables.** Une bascule de valeur
(0,38 s) est **déclenchée**, pas *scrubbée*. Elle se joue jusqu'au bout, sur sa
propre horloge, même si le scroll s'arrête. Un demi-blanc figé à l'écran n'est
pas un état, c'est un bug visible.

Les mouvements continus (défilements, parallaxe) sont scrubbés. Les bascules
sont jouées. **Deux mécaniques distinctes, jamais mélangées.**

### 4.2 — L'utilisateur remonte
**Réponse : toute bascule est réversible et idempotente.** Chaque scène a un
état d'entrée et un état de sortie, tous deux complets. Remonter rejoue la
bascule dans l'autre sens. Aucune animation ne laisse la page dans un état
intermédiaire.

### 4.3 — L'utilisateur va trois fois trop vite
**Réponse : la timeline ne rattrape jamais.** Si le scroll traverse deux
scènes en une frame, les transitions intermédiaires sont **sautées**, pas
mises en file. On arrive à l'état final de la scène atteinte. Une file
d'attente d'animations produit une page qui continue de bouger alors que
l'utilisateur est arrêté ailleurs — c'est le défaut classique des sites de ce
genre.

### 4.4 — Le scroll inertiel
Lenis (ou équivalent) lisse le scroll. **Il ne pilote pas la timeline** : il
pilote la position, et la position pilote la timeline. Si Lenis est absent ou
désactivé, la page fonctionne, moins souple.

---

## 5. Scène 03 — Aura OS · `t 0,150 → 0,310`

**Ce qu'on voit.** Traversée du monogramme — **la seule vraie caméra du site**.
On débouche dans un espace où flottent, à plusieurs profondeurs, les écrans
réels du produit : tableau de bord, page publique mobile, QR, demandes.
Derrière, en plan Fond, `LEADS` `BOOKINGS` `REVIEWS` défilent en typographie
monumentale.

| `t` local | Mouvement | Courbe |
|:--|:--|:--|
| 0,00 → 0,18 | `push-in` à travers le A — la seule du site | `power2.inOut` |
| 0,15 → 0,45 | Le tableau de bord arrive de Z −800 vers Z 0 | `power3.out` |
| 0,30 → 0,70 | Bandeau `LEADS / BOOKINGS / REVIEWS`, défilement continu | linéaire |
| 0,40 → 0,75 | Le mobile et le QR arrivent au plan Avant | `power3.out` |
| 0,70 → 1,00 | Les fenêtres s'écartent — parallaxe scrubbée | scrub |

**Les interfaces sont du vrai HTML**, posé sur des surfaces en CSS 3D. Pas des
captures d'écran. Deux raisons : elles restent nettes à toute échelle, et
elles resteront justes quand le produit changera.

---

## 6. Scène 04 — Univers métiers · `t 0,310 → 0,480`

La scène la plus longue, et **celle qui décide si le site tient**.

**Ce qu'on voit.** Six univers traversent le cadre de droite à gauche, en flux
continu, à plusieurs profondeurs. Caméra fixe. Un objet de verre au centre,
devant lequel les panneaux passent. La légende en bas à gauche change quand un
panneau atteint le centre.

| Panneau | Univers | Média |
|:--|:--|:--|
| 1 | FOOD | food truck, nuit, néon |
| 2 | BEAUTY | salon, lumière rasante |
| 3 | AUTOMOTIVE | atelier, carrosserie |
| 4 | PROPERTY | intérieur, baie vitrée |
| 5 | SERVICES | bureau, portrait |
| 6 | *(reprise FOOD)* | boucle |

**Mécanique.** Défilement **scrubbé** sur le scroll, linéaire, sans
accélération. Le panneau central est agrandi de 8 % et son média joue ; les
autres sont figés sur une image. **Deux vidéos décodées au maximum**, jamais
six.

> **Le blocage.** Ces six médias n'existent pas. Tant qu'ils n'existent pas,
> cette scène est un carrousel de rectangles vides, et la démonstration ne dit
> rien. **La production Higgsfield précède le code de cette scène** — c'est la
> dépendance critique du mandat, et elle n'est pas technique.

---

## 7. Scène 05 — Rupture éditoriale · `t 0,480 → 0,590`

Le pivot du site. Amplitude ~190, donc **0,38 s** (Motion Bible §2).

| `t` local | Mouvement | Durée | Courbe |
|:--|:--|:--|:--|
| 0,00 → 0,10 | L'objet de verre reste seul, les panneaux sortent | — | `power2.in` |
| 0,10 → 0,28 | **Balayage ivoire ascendant, bord bombé** | 0,38 s | `power2.out` |
| 0,22 → 0,50 | `ALREADY BUILT.` en frappe, 30 car/s | — | cadence |
| 0,28 → 0,55 | `FOR YOUR INDUSTRY.` en frappe, +120 ms | — | cadence |
| 0,30 → 0,32 | La navigation inverse ses couleurs | 0,06 s | `power1.out` |
| 0,55 → 0,80 | Ligne magenta fine, diagonale, qui se trace | — | `power2.out` |
| 0,80 → 1,00 | La ligne s'élargit en pan | — | `power2.in` |

**Le texte démarre avant la fin du balayage** — c'est mesuré sur la référence
(`f196` contre `f200`) et c'est ce qui empêche l'enchaînement de sembler
séquentiel.

**Le bord n'est pas droit.** Il est bombé vers le haut au centre :
`clip-path: ellipse(140% 100% at 50% 100%)` animée. Un `translateY` sur un
rectangle ne donnera pas la même sensation, et c'est un détail qui se voit.

---

## 8. Scène 06 — Aura Food · `t 0,590 → 0,740`

Retour au sombre par **masque typographique** : `AURA FOOD` en lettres géantes,
la valeur bascule à travers elles, avec éclatement RVB. Amplitude ~190 →
**0,38 s**, éclatement RVB sur les 0,12 s centrales.

Puis le seul vertical réel : le média Higgsfield premium en plan Scène, et
par-dessus, au plan Avant, les briques réelles du produit — `MENU`, `QR`,
`RÉSERVATION`, `WHATSAPP`, `AVIS`, `DEMANDES` — qui arrivent en cascade de
60 ms.

**L'image n'est pas un fond.** Un élément du décor passe **devant** elle, au
plan Avant, pour que la profondeur soit lue.

---

## 9. Scène 07 — Mur produit · `t 0,740 → 0,850`

Tout le produit en collage contrôlé : tableau de bord, mobile, QR, page
publique, analytique. Plusieurs éléments simultanés, échelle agressive,
typographie partiellement hors cadre.

**La contrainte** : à tout instant de cette scène, **une capture d'écran doit
rester lisible**. Si on fige et qu'on ne comprend pas ce qu'on regarde, la
composition est ratée. C'est un test, pas une intention — voir §12.

Convergence finale : tous les éléments reviennent vers le centre sur les 20
derniers pourcents, pour préparer le calme de la scène 08.

---

## 10. Scène 08 — Les plans · `t 0,850 → 0,940`

**Le mouvement s'arrête presque.** Après huit scènes de chorégraphie, c'est le
contraste qui donne du poids à l'offre.

`LAUNCH` · `PRO` · `GROWTH`, trois volumes sombres suspendus, arêtes chrome.
La seule animation est un déplacement latéral scrubbé qui les passe en revue.
Pas de tableau comparatif. Pas d'apparition en cascade.

Les prix affichés sont ceux de `COMPETITIVE-INTELLIGENCE.md` — 29 / 59 / 119 € —
et restent une **hypothèse**, non figée.

---

## 11. Scène 09 — Final · `t 0,940 → 1,000`

La composition monte et sort par le haut (mesuré sur la référence : 0,33 s).
Le noir se découvre par le bas. Le A chromé remonte du bas vers le centre en
grandissant.

`BUILD WHAT'S NEXT.` puis le CTA `START FREE →`.

Le A se referme comme à la scène 01 : **la boucle visuelle**, et la seule
citation structurelle que je reprends à la référence, parce qu'elle est dans
sa construction, pas dans sa forme.

---

## 12. Comment on vérifie que c'est juste

Un mandat sur le mouvement se vérifie autrement qu'un mandat sur des données.
Ce qui sera testé, automatiquement :

| Test | Méthode | Seuil |
|:--|:--|:--|
| **Lisibilité à l'arrêt** | Capture à 20 positions de scroll ; OCR ; le titre de la scène doit ressortir | 20/20 |
| **Aucun état intermédiaire** | Scroll brutal sur 2 scènes ; capture après 400 ms ; comparaison à l'état final attendu | diff < 2 % |
| **Plafond de vitesse** | Luminance moyenne image par image sur une traversée complète ; même mesure que la référence | ≤ 18 pts/frame |
| **Réversibilité** | Descendre, remonter, comparer à l'état initial | diff < 1 % |
| **Contraste** | Chaque texte sur son fond réel, aux deux extrémités de sa transition | ≥ 4,5:1 |
| **Sans JS** | Rendu `javaScriptEnabled: false` | tout le texte présent |
| **Sans WebGL** | Contexte refusé | aucune zone vide |
| **`reduced-motion`** | Émulation ; capture à 20 positions | aucune animation, tout lisible |
| **Budget** | Poids réseau au premier écran | ≤ 400 Ko |

Le test de lisibilité à l'arrêt est le plus important : c'est lui qui empêche
de livrer une démonstration spectaculaire qui ne vend rien.

---

## 13. Pile technique — ce que je recommande, et pourquoi

Vérifié sur le dépôt, pas supposé.

**L'état réel.** La vitrine est **un seul fichier HTML statique de 450 Ko**
(`src/vitrine.html`), sans React, sans build. Three.js `0.160.0` y est **déjà
embarqué** en local (`src/moteur/three.min.js`, vendorisé, aucun appel réseau).
Le dossier `aura-os/` est une application Next.js séparée — le produit, pas la
vitrine.

**Disponibilité des paquets** (relevée sur le registre) :

| Paquet | Version | Licence |
|:--|:--|:--|
| `gsap` | 3.15.0 | « Standard no-charge license » |
| `lenis` | 1.3.26 | MIT |
| `three` | 0.186.0 | MIT |
| `@react-three/fiber` | 9.7.0 | MIT |
| `postprocessing` | 6.39.5 | Zlib |

**Ce que je recommande : garder l'architecture statique, ne pas passer à React.**

| Dépendance | Verdict | Raison |
|:--|:--|:--|
| **three.js** | ✅ déjà là | Utilisé par la vitrine. Deux scènes en ont besoin. Rien à installer. |
| **lenis** | ✅ à ajouter | 3 Ko, MIT, fait une chose. |
| **gsap + ScrollTrigger** | ⚠️ **à trancher** | Voir ci-dessous. |
| **React / Next** | ❌ | Reconstruire la vitrine entière pour du confort de composant. Le coût est le projet, le gain est l'ergonomie. |
| **@react-three/fiber** | ❌ | C'est une surcouche React sur three.js. Sans React, sans objet. |
| **drei** | ❌ | Dépend de R3F. |
| **postprocessing** | ❌ pour l'instant | Deux effets seulement. Deux shaders écrits à la main coûtent moins que la bibliothèque. |

### Le point à trancher : GSAP

Le registre annonce une licence `Standard "no charge" license`. Aura est un
**produit commercial vendu par abonnement**. Je n'ai pas lu le texte de cette
licence — l'accès à `gsap.com` est bloqué par le proxy de cet environnement —
et **je ne vais pas affirmer de mémoire ce qu'elle autorise.**

Deux chemins :

1. **Tu lis la licence** sur `gsap.com/standard-license` et tu confirmes
   qu'elle couvre un SaaS payant. On prend GSAP : ScrollTrigger est le
   meilleur outil pour ça, de loin.
2. **On s'en passe.** Le besoin réel est mince : une timeline normalisée, des
   courbes, et un déclencheur au scroll. `IntersectionObserver` +
   `Web Animations API` + une fonction d'interpolation couvrent tout, en ~200
   lignes, sans dépendance ni question de licence. C'est ce que je ferai par
   défaut si tu ne tranches pas — et c'est ce que le prototype des scènes
   01–03 utilise, justement pour ne pas bloquer sur ce point.

**Total ajouté au chargement : 3 Ko** (Lenis) dans le chemin par défaut.
Three.js n'est chargé que lorsque la scène 02 approche.
