# AURA — Motion Bible

Les règles de mouvement d'Aura. Un seul motion designer, une seule main.

Ce document ne décrit pas la référence : ça, c'est `REFERENCE-SHOTLIST.md`.
Celui-ci décide ce qu'Aura fait, et ce qu'Aura ne fait pas.

---

## 1. Le principe qui tient tout

> **Rien n'apparaît. Quelque chose entre, ou quelque chose découvre.**

La leçon centrale du dépouillement : dans 12,3 secondes de référence, il n'y a
**pas une seule coupe franche et pas un seul fondu**. Chaque passage d'un état
à l'autre est porté par un objet physique — une surface qui monte, une lettre
qui grandit, un panneau qui glisse, un portail qui s'ouvre.

Un `opacity: 0 → 1` est donc interdit comme transition principale. Il reste
admis pour un détail secondaire (une légende, une puce), jamais pour un
changement de scène.

## 2. Le plafond de vitesse

La constante mesurée sur la référence n'est pas une durée, c'est une vitesse :
**≈ 16 points de luminance par frame à 30 fps**, soit **≈ 480 points/seconde**
sur une échelle de 255.

Aura s'y tient. Conséquence pratique — la durée d'une bascule se **calcule**,
elle ne se choisit pas :

```
duree_secondes  =  amplitude_de_luminance  /  480   ×  1,6
                                                     └─ facteur de forme :
                                                        la courbe power2.out
                                                        passe ~60 % du temps
                                                        sous la vitesse de pointe
```

| Bascule | Amplitude | Durée |
|:--|:--|:--|
| Obsidienne → ivoire | ~190 | **0,38 s** |
| Ivoire → obsidienne | ~190 | **0,38 s** |
| Demi-valeur (scène → scène sombre) | ~90 | **0,19 s** |
| Ouverture de portail (noir → surexposé) | ~80 | **0,20 s** |

**Aucune transition de valeur ne dépasse 0,45 s.** Au-delà, ça n'est plus une
bascule, c'est un fondu — et un fondu n'a pas sa place ici.

## 3. Courbes

Une seule famille, déduite de la rampe mesurée (démarrage rapide, plateau à
vitesse maximale, atterrissage doux) :

| Usage | Courbe | Note |
|:--|:--|:--|
| Bascule de valeur | `power2.out` | La référence, mesurée |
| Entrée d'objet en Z | `power3.out` | Arrive vite, se pose |
| Sortie d'objet | `power2.in` | Part doucement, accélère |
| Défilement continu | `none` (linéaire) | Un carrousel constant ne doit pas respirer |
| Frappe de texte | `none`, pas par caractère | Cadence, pas courbe |

**Interdits** : `elastic`, `bounce`, `back`. Ils racontent le jouet. Aura vend
un outil professionnel à des commerçants.

## 4. Caméra

> **La caméra ne bouge pas. Ce sont les objets qui bougent.**

C'est le constat le plus contre-intuitif du dépouillement, et le plus utile :
sur les 3,6 s de « mur de médias » de la référence, le décor est strictement
fixe. L'impression de traversée vient du défilement des panneaux.

Règle Aura :

- **Une seule caméra, fixe**, pour toute la page. Position, cible, champ : des
  constantes.
- La profondeur se joue en déplaçant les objets sur Z, pas en avançant.
- **Une exception, une seule** : la traversée du monogramme entre la scène 02
  et la scène 03. Là, un vrai `push-in` est justifié parce qu'il raconte
  quelque chose — on entre dans le produit.

Ce que ça évite : la synchronisation caméra/scroll, le recalcul de frustum,
les objets qui sortent du champ quand on redimensionne, et la nausée.

## 5. Profondeur

Cinq plans, et pas un de plus. Toute nouvelle pièce se range dans l'un d'eux.

| Plan | Z | Contenu | Parallaxe |
|:--|:--|:--|:--|
| **Décor** | −1200 | Grille, sol, murs | 0,15 |
| **Fond** | −600 | Typographie monumentale, bandeaux | 0,35 |
| **Scène** | 0 | Panneaux médias, objets de verre | 1,00 |
| **Avant** | +300 | Interfaces produit réelles, captures | 1,35 |
| **Interface** | +∞ (hors 3D) | Navigation, CTA, mentions | fixe |

**Le plan Interface n'est jamais animé par la timeline.** La navigation et le
bouton *Start free* restent atteignables à tout instant. C'est ce qui sépare
une page qui vend d'une démo de studio.

## 6. Typographie en mouvement

Trois comportements, tirés de la référence, et un interdit.

### 6.1 — La typo comme décor
Un titre monumental reste **au plan Fond** et les médias passent **devant**.
Il n'est pas une couche d'habillage posée au-dessus : il fait partie de la
scène. C'est ce qui donne la profondeur.

### 6.2 — La typo comme masque
Le mot géant découpe le fond : la valeur bascule **à travers les lettres**.
C'est le moment le plus fort du film de référence. Aura s'en sert **une seule
fois**, sur `AURA OS`. Deux fois, c'est un tic.

### 6.3 — La frappe
Mesurée sur la référence : **≈ 1 caractère par frame à 30 fps, soit ~30 car/s**,
la ligne suivante démarrant avant la fin de la précédente.

Aura reprend la cadence mais **pas** le surlignage sombre : sur fond ivoire,
un texte qui vend doit être lisible d'emblée, pas révélé. La frappe s'applique
au titre, jamais au texte courant.

### 6.4 — L'interdit
**Aucun texte porteur d'information n'est illisible à l'arrêt.** Si on fige la
page à n'importe quel instant, le message de la scène doit se lire. Un titre
qui n'existe qu'en mouvement n'existe pas.

## 7. Palette

Les hex de la référence ne valent rien (écran filmé, cf. dépouillement §0.1).
Aura garde donc **sa** palette, et n'emprunte que la **structure de valeur** :
un registre sombre long, une rupture claire courte, un retour au sombre.

| Rôle | Valeur | Usage |
|:--|:--|:--|
| Obsidienne | `#07060A` | Fond par défaut, scènes 01–04 et 07–09 |
| Ivoire | `#F2EFE9` | Rupture éditoriale, scène 05 |
| Magenta | `#E01B6A` | Accent principal, réfraction, ligne diagonale |
| Violet | `#8E37D6` | Second point du dégradé d'accent |
| Cyan | `#3BE8E0` | Réfraction froide du monogramme, jamais en aplat |
| Chrome | `#D8D4CC` | Filets, wireframe, arêtes |

**Contraste** : le couple magenta → violet est déjà celui de la vitrine, retenu
parce qu'il passe le contraste sur texte blanc (4,63:1 et 5,75:1). Aucune
nouvelle couleur ne rentre sans être mesurée.

Le blanc de la rupture n'est **pas** un blanc pur : `#F2EFE9`, avec un
vignettage. La référence mesure `#c7c6c8` en moyenne — un blanc éclairé, pas
un aplat d'écran.

## 8. Le décompte WebGL

Résultat du dépouillement : sur 14 plans de la référence, **deux seulement**
exigent vraiment WebGL. Aura s'aligne.

| Besoin | Technique | Justification |
|:--|:--|:--|
| Monogramme de verre, réfraction | **WebGL** | Aucune approximation CSS ne tient |
| Éclatement RVB de l'inversion | **WebGL** | Le décalage par canal n'existe pas en CSS |
| Panneaux médias en profondeur | **CSS 3D** | `perspective` + `translate3d`, caméra fixe |
| Treillis d'ouverture | **SVG** | Des lignes, avec une dérive lente |
| Balayage à bord bombé | **CSS** | `clip-path` animé sur une ellipse |
| Frappe, bandeaux, défilements | **DOM + timeline** | Rien d'autre |

> **WebGL est allumé pour deux scènes sur neuf, et éteint le reste du temps.**
> Pas un canvas plein écran qui tourne en permanence : un canvas monté à
> l'entrée de la scène 02, démonté à la sortie de la scène 05, remonté pour la
> scène 07. Le reste de la page est du DOM, inspectable, sélectionnable,
> indexable.

## 9. Ce qui reste utilisable quand tout est coupé

Trois dégradations, dans cet ordre.

**`prefers-reduced-motion: reduce`** — la timeline ne joue pas. Chaque scène
s'affiche à son état final. Aucune transition de valeur, aucun défilement
automatique. Le contenu est intégralement présent et lu dans l'ordre.

**Pas de WebGL** (contexte refusé, GPU bloqué, `--disable-gpu`) — le
monogramme de verre devient un SVG statique avec un dégradé. L'éclatement RVB
devient une bascule de valeur simple. Le reste est inchangé.

**Pas de JavaScript** — la page reste un document : titres, textes, images,
liens, et le bouton *Start free*. C'est la condition non négociable, parce que
c'est aussi ce que voit un moteur de recherche.

## 10. Budget

Chiffres à tenir, vérifiés par un test, pas par une intention.

| Mesure | Plafond |
|:--|:--|
| JS exécuté avant le premier rendu | 120 Ko compressé |
| Poids total au premier écran | 400 Ko |
| Frames sous 50 fps pendant une transition | 0 |
| Temps de montage d'une scène WebGL | 200 ms |
| Contextes WebGL simultanés | 1 |
| Vidéos décodées simultanément | 2 |
| `will-change` posés en permanence | 0 |

**Mobile** : la 3D passe en SVG et la chorégraphie reste. Un téléphone doit
voir le même film, pas un film appauvri — seulement rendu autrement. C'est le
sens de la règle : *la chorégraphie est le produit, la 3D est une matière*.

## 11. Ce que la référence ne peut pas nous apprendre

Trois trous, nommés pour qu'on ne les comble pas par de l'invention.

1. **On ne sait pas si la référence est pilotée par le scroll.** L'intro se
   joue seule ; la suite avance à vitesse rigoureusement constante, ce qui
   n'est pas un comportement de scroll humain. Toute la difficulté d'Aura est
   là et la référence ne la traite peut-être jamais : un visiteur s'arrête au
   milieu d'une transition, remonte, va trois fois trop vite. Voir
   `AURA-MOTION-TIMELINE.md` §4 — c'est traité comme un problème à part
   entière.

2. **On ne sait pas comment son ouverture se construit.** Le treillis est
   déjà tracé à la première frame. L'idée que des lignes dessinent le A
   progressivement est une reconstruction, pas une observation.

3. **La référence a six réalisations clients spectaculaires. Aura n'en a
   aucune.** C'est le vrai écart, et il n'est pas technique. La moitié du film
   de référence est un portefeuille. Reproduire la chorégraphie sans le
   contenu donne un carrousel vide. Les six univers métier produits avec
   Higgsfield ne sont pas de la décoration : **ils sont la moitié du travail**,
   et ils doivent exister avant que la scène 04 soit codée.
