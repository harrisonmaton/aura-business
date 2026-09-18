# Référence vidéo — dépouillement image par image

**Fichier analysé** : `4cfb6ecf-e5a19e64699544128830e5a15df8b945.mp4`
**Relevé le 18 septembre 2026.** Toutes les valeurs de ce document ont été
mesurées sur le fichier, pas estimées à l'œil.

---

## 0. Ce qu'est réellement cette vidéo — à lire avant le reste

Quatre constats qui changent la façon de s'en servir.

### 0.1 — C'est un téléphone qui filme un MacBook

```
Container : mov/mp4      Codec : HEVC Main, yuv420p, bt709
Définition: 720 × 1280   (VERTICAL 9:16)     Débit : 12 494 kb/s
Durée     : 16,470 s     Frames : 494 (comptées)    30 fps exactement
Audio     : AAC 44,1 kHz stéréo
```

Ce n'est **pas** une capture d'écran. C'est une prise de vue à main levée,
par-dessus l'épaule : on voit le plan de travail en marbre, le châssis du
portable, le clavier, et les mains de la personne. Le site occupe environ
**600 × 385 px** d'une image de 720 × 1280, soit **14 % de la surface**, vu
de biais et avec les reflets de la pièce.

Conséquences concrètes, à ne pas contourner :

- **Aucune valeur colorimétrique de cette vidéo n'est fiable.** Elle a
  traversé un écran LCD, l'éclairage d'une pièce, un capteur de téléphone et
  un encodage HEVC. Les hex que je relève plus bas décrivent une ambiance,
  jamais une charte.
- La géométrie est déformée par la perspective. Aucune mesure de mise en page
  n'est exploitable.
- Les micro-timings sous ~2 frames sont noyés dans le flou de bougé.
- En revanche : **le rythme, la durée des transitions et l'ordre des
  événements sont parfaitement lisibles.** C'est précisément ce qu'on veut.

### 0.2 — Le site montré est ALCHE, un studio japonais identifiable

Le wordmark « ΔLCHE » est lisible, la barre de navigation aussi
(News / Works / About / stellla), et toute l'interface de service est en
japonais (« このサイトには音があります », « サウンドをオンにする »).
Les travaux présentés sont des études de cas clients réelles : Kizuna AI
« Hello, Fortnite », WEAR GO LAND, DISCOAT 2025SS, Matsuken Samba II,
RADWIMPS, stellla.

Ce n'est donc pas une référence abstraite : c'est le site d'un concurrent
crédible, avec sa propre identité déposée. Ta consigne « ne copie aucun asset,
logo, texte ou contenu protégé » est la bonne, et je m'y tiens : ce document ne
retient que des **principes de mouvement**, jamais une forme.

### 0.3 — La vidéo est une story Instagram d'un tiers

Incrustations présentes dans l'image : le bandeau « POV: GPT-6 Astra just
COOKED 😳 », le logo Instagram, et la signature **@JERRYTHEWEBDEV**. La
légende sous-entend que le site aurait été produit par une IA — je n'ai aucun
moyen de le vérifier et je ne m'appuie pas dessus.

### 0.4 — Le film utile dure 12,3 s, pas 16,47 s

Mesuré sur la luminance moyenne de la zone écran :

```
t = 12,300 s  (f369)   → chute à une luminance de 15, puis 8–12 jusqu'à la fin
```

Les **4,17 dernières secondes** sont la carte de sortie du créateur : logo
Instagram + pseudo sur fond noir. Elles n'appartiennent pas au site.

> **Le matériau réel est donc : 0,000 s → 12,400 s, soit 372 frames.**

---

## 1. SHOT LIST

Timecodes en secondes depuis le début du fichier. `f` = numéro de frame.
Les bornes sont posées sur la frame où le changement devient mesurable.

| # | Entrée | Sortie | Durée | Plan |
|:--|:--|:--|:--|:--|
| **S00** | 0,000 `f0` | 0,500 `f15` | 0,50 s | Treillis de lignes fines sur noir |
| **S01** | 0,533 `f16` | 0,767 `f23` | 0,23 s | Ouverture du portail — explosion lumineuse |
| **S02** | 0,800 `f24` | 1,533 `f46` | 0,73 s | Wordmark monumental, arrivée et stabilisation |
| **S03** | 1,567 `f47` | 1,900 `f57` | 0,33 s | Désintégration du wordmark → titre WORKS |
| **S04** | 1,933 `f58` | 2,567 `f77` | 0,63 s | Titre WORKS + entrée du premier panneau |
| **S05** | 2,600 `f78` | 6,200 `f186` | 3,60 s | **Carrousel de médias** — 6 études de cas |
| **S06** | 6,200 `f186` | 6,300 `f189` | 0,10 s | Monogramme de verre seul en scène |
| **S07** | 6,300 `f189` | 6,667 `f200` | **0,367 s** | **Balayage blanc ascendant** |
| **S08** | 6,533 `f196` | 7,300 `f219` | 0,77 s | Typographie éditoriale, frappe caractère par caractère |
| **S09** | 7,300 `f219` | 8,067 `f242` | 0,77 s | Croissance de la barre diagonale |
| **S10** | 8,100 `f243` | 8,533 `f256` | **0,433 s** | **Inversion par masque typographique + éclatement RVB** |
| **S11** | 8,533 `f256` | 11,200 `f336` | 2,73 s | Services — bandeau typo + panneau + texte |
| **S12** | 11,200 `f336` | 12,067 `f362` | 0,87 s | Dernière étude de cas, plein cadre |
| **S13** | 12,067 `f362` | 12,400 `f372` | 0,33 s | Sortie par le haut + résolution du monogramme |
| — | 12,400 | 16,470 | 4,07 s | *Carte Instagram du créateur — hors sujet* |

### La constante qu'il faut retenir — et celle que j'ai cru voir à tort

**Première mesure, fausse.** En posant à la main un seuil de luminance, j'avais
trouvé 12 frames pour chacune des deux bascules et j'en ai conclu à une
symétrie exacte à 0,400 s. C'était un artefact : la durée obtenue dépend
entièrement de l'endroit où on place le seuil. Le script de reproductibilité,
qui mesure la **vitesse** de variation et non un franchissement, donne :

```
S07  balayage vers le blanc   f189 → f200   11 frames   0,367 s   pointe 15,8 / frame
S10  retour vers le sombre    f243 → f256   13 frames   0,433 s   pointe 16,4 / frame
S01  ouverture du portail     f16  → f22     6 frames   0,200 s   pointe 17,0 / frame
```

Les durées ne sont **pas** égales. Ce qui l'est, c'est la **vitesse de pointe** :
15,8 — 16,4 — 17,0 points de luminance par frame. Trois transitions de longueurs
différentes, une même vitesse maximale.

> **La constante de conception n'est pas une durée, c'est un plafond de vitesse.**
> Environ **16 points de luminance par frame, soit ~480 points par seconde** —
> près de deux fois l'amplitude totale de l'échelle. C'est ce qui donne au film
> son impression de violence maîtrisée : chaque bascule frappe à la même
> intensité, et seule sa longueur change selon ce qu'elle a à traverser.

C'est plus exploitable qu'une durée : pour une transition Aura, on choisit
l'amplitude de valeur, et la durée en découle. Une bascule noir → blanc
(amplitude ~190) dure ~0,40 s ; une demi-bascule en dure ~0,20.

Rampe de luminance mesurée sur S07 (moyenne de la zone écran, 0–255) :

```
f189  66     f193 121     f197 179     f201 201
f190  73     f194 138     f198 186     f202 201
f191  91     f195 154     f199 195     f203 200
f192 108     f196 167     f200 199     f204 200
```

Vitesse lissée correspondante : `+3,7 +5,3 +10,9 +14,2 +15,9 +15,5 +15,0 +15,4
+13,6 +10,7 +9,3 +6,8 +4,9 +1,8`. Démarrage rapide, long plateau à vitesse
maximale, atterrissage doux. En courbe : proche d'un `power2.out`, jamais un
`expo`, et surtout pas un `linear`.

---

## 2. Type de transition, plan par plan

| # | Transition entrante | Mécanique observée |
|:--|:--|:--|
| S00 | *(déjà en cours à f0)* | — voir §8 |
| S01 | Croissance depuis le centre | Un objet passe de ~2 % à >100 % du cadre en 7 frames |
| S02 | Traversée / surexposition | Le blanc du portail devient le fond, le wordmark est déjà à ~250 % |
| S03 | Désintégration + balayage diagonal | Les lettres se fracturent, des bandes obliques essuient l'image |
| S04 | Entrée en Z | Un panneau arrive de l'arrière-plan vers l'avant |
| S05 | Défilement latéral continu | Aucune coupe — flux ininterrompu de 3,6 s |
| S06 | Vidage | Les panneaux sortent, l'objet central reste |
| S07 | **Balayage ascendant à bord convexe** | Une surface blanche monte du bas ; son bord supérieur est **bombé**, pas droit |
| S08 | *(recouvre S07)* | Le texte commence à s'écrire **avant** que le blanc soit posé |
| S09 | Croissance d'un objet | Une fine barre devient un pan large |
| S10 | **Masque typographique** | Les lettres géantes servent de masque ; le fond bascule blanc → noir à travers elles |
| S11 | *(continuité de S10)* | Le bandeau typo issu de S10 devient le fond de section |
| S12 | Substitution de panneau | Le panneau central change de contenu et prend tout le cadre |
| S13 | Défilement vertical sortant | Toute la composition monte, le noir se découvre par le bas |

**Aucune coupe franche dans tout le film.** Pas un seul `cut`. Chaque passage
d'une scène à l'autre est porté par un objet qui bouge : un portail, une
surface, une lettre, un panneau. C'est la leçon centrale de la référence.

---

## 3. Mouvement de caméra

Point important, et contre-intuitif :

> **Il n'y a presque aucun mouvement de caméra dans cette vidéo.**

Ce que j'ai vérifié sur S05 (3,6 s de « mur de médias ») : la grille du décor,
les montants verticaux et le sol restent **fixes** d'un bout à l'autre. Seuls
les panneaux se déplacent, de la droite vers la gauche, à vitesse constante.
La sensation de « caméra qui traverse un mur d'images » est produite par le
**défilement des objets devant une caméra immobile**, pas par un déplacement
de caméra.

| # | Caméra | Ce qui bouge réellement |
|:--|:--|:--|
| S00 | Dérive très lente, quasi imperceptible | Le treillis lui-même, en rotation lente |
| S01 | Aucune — ou indiscernable de la mise à l'échelle | L'objet grossit |
| S02 | Aucune | Le wordmark se met à l'échelle |
| S05 | **Fixe** | Les panneaux glissent en X |
| S07–S09 | Fixe | Les surfaces montent et grossissent |
| S10–S11 | Fixe | Deux lignes de typo défilent en sens inverses |
| S12–S13 | Fixe | La composition monte en Y |

**Ce que ça économise** : pas de rig de caméra, pas de synchronisation
caméra/scroll, pas de recalcul de frustum. Une caméra fixe et des objets
animés donnent le même résultat perçu pour une fraction du coût et des bugs.

La seule exception plausible est S00→S01, où la mise à l'échelle du portail
*peut* être un vrai `dolly`. Impossible de trancher : à cette échelle et avec
ce flou, un `scale` et un `push-in` sont indiscernables.

---

## 4. Éléments 2D

- Barre de navigation fixe en haut, toujours présente, qui **inverse ses
  couleurs** au passage du blanc (S07) et revient au passage du noir (S10).
- Deux pastilles d'interface en bas à droite, permanentes (contrôles de son).
- Bandeau de texte japonais en bas, permanent.
- Légendes d'étude de cas en bas à gauche : date, titre, sous-titre, et une
  rangée de **puces de catégorie** (`#battle`, `#unreal_engine`, `#anime`,
  `#mobile`). Elles se remplacent à chaque panneau, sans animation notable.
- Lien « More Works ↗ » en bas à droite pendant S04–S05.
- Bandeau typographique géant de S10–S11 : **deux lignes qui défilent en sens
  opposés** (la haute vers la gauche, la basse vers la droite).

## 5. Éléments 3D

- **Le décor de S02–S06** : une pièce faite de panneaux rectangulaires
  inclinés, formant une grille sur les murs et le sol. Éclairage bleu.
- **Les panneaux de médias** : des plans rectangulaires portant une vidéo,
  disposés à plusieurs profondeurs. Au moins 3 plans de profondeur simultanés
  observés à t = 4,00 s (un panneau partiel à gauche, le panneau central, un
  panneau étroit à droite).
- **Le prisme translucide** : un objet de verre triangulaire, posé au centre,
  devant lequel les panneaux passent. Visible à 3,00 s et 5,17 s.
- **Le monogramme de verre** (S06) : le symbole de la marque en volume,
  dégradé cyan → vert, matière translucide avec réfraction. Point de mesure à
  t = 6,20 s : teinte la plus claire relevée `#44e6e8`.

Rien ici n'exige un modèle importé. Un plan, une boîte, un prisme extrudé :
tout est primitif. Le coût est dans la **matière** (verre, réfraction), pas
dans la géométrie.

## 6. Masques

Trois usages de masque, par ordre d'importance :

1. **S10 — le masque typographique.** Les lettres géantes sont le masque : le
   fond passe de blanc à noir *à travers* elles. C'est le moment le plus
   coûteux du film et le plus spectaculaire.
2. **S07 — le masque à bord courbe.** La surface blanche qui monte n'a pas un
   bord droit : il est **bombé vers le haut** au centre. C'est soit un plan 3D
   incliné vu en perspective, soit un masque dont le bord est un arc. Un
   simple `translateY` sur un rectangle ne reproduira pas cette sensation.
3. **S08 — le surlignage de frappe.** Chaque ligne de texte s'écrit derrière
   une **barre sombre** qui progresse avec elle, comme un marqueur.

## 7. Mouvement typographique

| Moment | Comportement mesuré |
|:--|:--|
| S02 | Arrivée à ~250 % de la largeur du cadre, avec **flou directionnel** marqué sur les 2 premières frames, puis mise à l'échelle vers ~100 % |
| S03 | Fracture des lettres + texture de bruit, sur 0,33 s |
| S04 | Le titre reste **en fond** ; les médias passent devant lui. La typo n'est pas une couche d'interface, c'est un décor. |
| S08 | **Frappe caractère par caractère.** Mesuré : `これまで` (f196) → `これまでに` (f197) → `これまでにな` (f198) → `これまでにない` (f199). Soit **≈ 1 caractère par frame, ≈ 30 car/s**, avec la ligne suivante qui démarre avant la fin de la précédente. |
| S10–S11 | Deux bandeaux en défilement inverse, vitesse constante, sur toute la section |
| S12 | Lettres à lignes de base et tailles irrégulières, rotation individuelle |

## 8. Transitions de couleur

Luminance moyenne de la zone écran, mesurée frame par frame :

```
0,0 – 0,6 s   lum 8–14     noir profond
0,6 – 0,8 s   lum 14 → 94  explosion du portail          (7 frames)
0,8 – 6,2 s   lum 49–100   registre sombre, dominante bleue
6,3 – 6,7 s   lum 66 → 201 BASCULE BLANCHE                (12 frames)
6,7 – 8,0 s   lum ~200     blanc éditorial tenu 1,37 s
8,1 – 8,5 s   lum 182 → 61 RETOUR AU SOMBRE                (12 frames)
8,5 – 10,5 s  lum 46–80    registre sombre
10,6 – 12,1 s lum 90 → 166 montée vers la dernière étude de cas
12,3 s        lum → 15     noir
```

Échantillons de teinte (**indicatifs seulement**, cf. §0.1) :

| Moment | Moyenne | Plus clair |
|:--|:--|:--|
| 0,33 s intro | `#0a080b` | `#373336` |
| 1,50 s marque | `#39387e` | `#f5f2eb` |
| 3,33 s mur de médias | `#655864` | `#fbf9fa` |
| 6,20 s monogramme de verre | `#183e3b` | `#44e6e8` |
| 6,83 s éditorial blanc | `#c7c6c8` | `#f7f5fa` |
| 8,60 s typo sombre | `#333239` | `#999096` |
| 12,00 s dernière étude | `#906066` | `#d9c3c1` |

Le blanc éditorial n'est **pas** un blanc pur : moyenne à `#c7c6c8`, avec un
vignettage net sur les bords. C'est un blanc éclairé, pas un aplat.

---

## 9. Technique d'implémentation estimée

Par plan, avec ce que ça exige réellement :

| # | Besoin technique | WebGL nécessaire ? |
|:--|:--|:--|
| S00 | Lignes en perspective, dérive lente | Non — SVG ou canvas 2D suffit |
| S01 | Mise à l'échelle extrême + bloom | Non pour l'échelle. Le halo se fait en CSS. |
| S02 | Grande typo + flou directionnel | Le flou directionnel propre demande un shader ; une approximation CSS est possible |
| S03 | Fracture de lettres | Shader, ou séquence pré-calculée |
| S05 | Panneaux vidéo en profondeur, caméra fixe | **Faisable en CSS 3D pur** (`perspective` + `translate3d`) |
| S06 | Verre avec réfraction | **WebGL obligatoire** — c'est le seul vrai besoin 3D du film |
| S07 | Surface montante à bord courbe | `clip-path` animé, ou un plan 3D |
| S08 | Frappe + surlignage | DOM + CSS, rien d'autre |
| S10 | Masque typo + éclatement RVB | **WebGL ou canvas** — le décalage RVB n'existe pas en CSS |
| S11 | Deux bandeaux en défilement inverse | CSS/GSAP |
| S12–S13 | Défilement vertical | CSS/GSAP |

**Verdict** : sur 14 plans, **deux** exigent vraiment du WebGL (S06 le verre,
S10 l'éclatement RVB). Tout le reste tient en CSS 3D et en timeline. C'est une
information utile : la référence paraît beaucoup plus « 3D » qu'elle ne l'est.

### Ce que je n'ai pas pu déterminer

- **Si le site est piloté par le scroll ou s'il se joue tout seul.** L'intro
  (S00–S02) est manifestement automatique. La suite avance à vitesse
  parfaitement constante, ce qui est inhabituel pour du scroll humain. Les
  mains sont sur le clavier mais je ne vois pas ce qu'elles font. **Ce point
  est décisif** pour ton mandat « le scroll devient une timeline » : si la
  référence est en lecture automatique, sa chorégraphie n'a jamais eu à gérer
  un utilisateur qui remonte, s'arrête au milieu d'une transition, ou scrolle
  trois fois plus vite que prévu. Je ne peux pas le trancher avec ce fichier.
- **Comment le treillis d'ouverture se construit.** À `f0`, il est **déjà
  entièrement tracé**. L'enregistrement commence après le début de
  l'animation. L'idée « des lignes construisent progressivement le A » est une
  reconstruction plausible, pas une observation. Je la note comme telle.

---

## 10. Adaptation Aura, plan par plan

Une remarque structurelle d'abord, parce qu'elle conditionne tout le reste.

> **Le cœur de la référence — 6,3 s sur 12,3, soit la moitié du film — est un
> portefeuille de réalisations clients.** Kizuna AI, Fortnite, RADWIMPS,
> DISCOAT. Son rythme ne tient pas à sa technique : il tient au fait qu'elle a
> six pièces de contenu spectaculaires à faire défiler.
>
> **Aura n'a aucune réalisation client.** Reproduire la chorégraphie sans le
> contenu donnera un carrousel qui tourne à vide. C'est le risque principal de
> ce mandat, et il est de production, pas de développement.

D'où l'adaptation retenue : ce que la référence remplit avec des **clients**,
Aura le remplit avec des **métiers** — et c'est Higgsfield qui doit produire
ces six univers, en amont du code.

| # | Réf. | Adaptation Aura | Contenu à produire |
|:--|:--|:--|:--|
| S00 | Treillis de lignes | Construction du A d'Aura en lignes chrome | Aucun — procédural |
| S01 | Portail | Le contre-poinçon du A s'ouvre et avale la caméra | Aucun |
| S02 | Wordmark | **AURA** monumental, chrome, réfraction magenta | Aucun — typo + shader |
| S03 | → WORKS | → **YOUR BUSINESS. ALREADY BUILT.** | Aucun |
| S04 | Titre + panneau | Titre en décor, premier écran d'Aura OS en avant-plan | Captures réelles du produit |
| S05 | 6 études clients | **6 univers métier** : Food, Beauty, Automotive, Property, Services, + Food truck | **6 vidéos Higgsfield** ⬅ le vrai travail |
| S06 | Monogramme de verre | Le A d'Aura en verre, magenta → cyan | Aucun — shader |
| S07 | Balayage blanc | Identique — 0,37 s, bord bombé | Aucun |
| S08 | Texte japonais | **ALREADY BUILT. / FOR YOUR INDUSTRY.** en frappe | Aucun |
| S09 | Barre diagonale | Ligne magenta qui devient un pan | Aucun |
| S10 | Masque typo + RVB | **AURA OS** en masque géant, 0,43 s | Aucun |
| S11 | Services | Les 7 briques du produit : page, menu, QR, demandes, WhatsApp, avis, analytics | Captures réelles du produit |
| S12 | stellla | **Aura Food**, le seul vertical réel aujourd'hui | 1 vidéo Higgsfield premium |
| S13 | Sortie + monogramme | Sortie + **BUILD WHAT'S NEXT.** + *Start free* | Aucun |

### Trois écarts assumés par rapport à la référence

1. **Pas de barre de son ni de texte de service permanent.** Ils appartiennent
   à un site de studio, pas à un produit qu'on vend.
2. **Le plan S08 doit rester lisible sans mouvement.** La référence peut se
   permettre du texte décoratif ; une page qui vend un abonnement, non.
3. **La durée totale ne se transpose pas.** 12,3 s est la durée d'une
   *démonstration filmée*. Un visiteur qui scrolle décide lui-même de son
   tempo. Les ~0,4 s d’une transition se transposent ; les 3,6 s du carrousel
   ne se transposent pas — elles deviennent une distance de scroll.

---

## Reproductibilité

Toutes les mesures de ce document se rejouent avec :

```bash
node scripts/depouiller-reference.js <chemin-video>
```

Le script réextrait les frames, recalcule la luminance et les ruptures, et
régénère les planches-contact. Si un chiffre de ce document change, c'est que
le fichier a changé.
