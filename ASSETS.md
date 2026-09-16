# Inventaire des assets — ce qui existe réellement

## Présents dans le dépôt

| Fichier | Taille | Nature | Droits |
|---|---|---|---|
| `src/fonts/*.woff2` | 220 768 o (6 fichiers) | Archivo et Bodoni Moda, sous-ensembles latin et latin-ext | SIL OFL 1.1, redistribution autorisée, `src/fonts/OFL.txt` |
| `src/creations/*.svg` | ~102 Ko (21 fichiers) | 12 pièces de démonstration + 8 couvertures + l'image d'accueil | **produites par `scripts/build-creations.js`** |
| `src/creations/photos/trattoria-pates.webp` | 59 960 o | Photographie de cacio e pepe, 1080×1080 | **générée pour ce projet** — voir ci-dessous |
| `v3_office.png`, `v3_office_rempli.png` | 89 / 91 Ko | Captures du back-office, vide et rempli. Pièces de recette, pas des livrables | production interne |

**C'est tout.** Il n'y a aucun autre fichier binaire dans le dépôt.

À une exception près — la photographie ci-dessous — tous les visuels de la
vitrine sont des compositions SVG écrites dans `scripts/build-creations.js`,
déterministes : relancer le script reproduit les mêmes fichiers à l'octet près.

### Créations de démonstration et couvertures

**Aucune image tierce n'a été importée.** Ces vingt compositions sont écrites en
SVG dans `scripts/build-creations.js` et rendues déterministes : relancer le
script reproduit exactement les mêmes fichiers. Leur provenance est donc ce
script, ce qui règle la question des droits par construction.

Historique, pour que ce document reste exact : elles ont d'abord été produites
dans une session qui n'avait aucun outil de génération d'images — la limite avait
été annoncée plutôt que contournée. Depuis, ElevenLabs a été connecté et une
première photographie a été générée puis intégrée (section suivante). Les deux
approches coexistent : la photo est le sujet, le SVG porte le texte.

Douze pièces réparties en trois séries — restaurant italien, salon de coiffure,
boutique indépendante — chacune avec trois publications 1:1, une story 9:16 et
les textes correspondants. **Les trois enseignes sont fictives** (Trattoria
Mezzanotte, Salon Néon, Atelier Corail) et le site les présente explicitement
comme « concept de démonstration ». Aucun client réel, aucun témoignage, aucun
résultat commercial n'est affiché ni sous-entendu ; un contrôle de recette
échoue si un mot comme « témoignage » ou « ils nous font confiance » apparaît
dans la section.

Les huit couvertures montrent le contenu du pack — nombre de visuels, de textes,
de messages — au lieu d'un nom posé sur une image d'ambiance.

Les SVG sont injectés **en ligne** dans la vitrine plutôt que chargés en `<img>` :
un SVG chargé en `<img>` est un document isolé qui n'hérite pas des polices de la
page, et les compositions seraient rendues avec une fonte générique.

### Photographies générées

| | |
|---|---|
| Fichier | `src/creations/photos/trattoria-pates.webp` |
| Sujet | Bol de cacio e pepe, lumière de fenêtre, ardoise sombre |
| Dimensions | 1080×1080, recadré depuis un original 2048×1152 |
| Poids | 59 960 o · SHA-256 `872e7071…21c5e` |
| Source | ElevenLabs, modèle `bytedance-seedream-5-pro` |
| Coût réel | 818,1 crédits — 8,18 cents |
| Licence | Générée pour ce projet à partir d'une description écrite ici. Aucun élément tiers, aucune photographie importée, aucune marque. |

**Aucun texte n'est généré dans l'image.** Les titres, le prix et le badge restent
en SVG posés par-dessus : ils restent lisibles, traduisibles dans les quatre
langues, et modifiables sans regénérer la photo.

Ce fichier n'est **ni écrit ni supprimé** par `build-creations.js` : le script se
contente de le recenser et d'enregistrer son empreinte. Deux contrôles de recette
vérifient qu'une photo déclarée existe réellement sur disque et qu'elle est peinte
dans la page — une balise `<image>` pointant vers un fichier absent donnerait un
cadre vide qu'on pourrait prendre pour une création.

Si la photo est absente, la composition SVG d'origine reste affichée à sa place.
Aucun emplacement vide n'est jamais présenté comme une création finie.

### Polices

Récupérées depuis `fonts.gstatic.com` (Archivo v25, Bodoni Moda v28) puis
servies depuis le dépôt. La page n'émet plus **aucune** requête vers un tiers :
vérifié par le contrôle « aucune requête vers un tiers » de la recette. Les deux
familles sont sous SIL Open Font License 1.1, qui autorise explicitement la
redistribution, y compris embarquée.

## `hero.webp` — retiré du dépôt

**Le fichier n'existe plus.** Sa provenance n'a jamais pu être établie : ni le
fichier ni sa version d'origine avant recompression (251 202 o, extraite du
base64 du commit `8c7b766`) ne portaient la moindre métadonnée — pas d'`EXIF`,
pas de `XMP`, pas d'`ICCP`, pas de manifeste C2PA — et aucun document du dépôt
n'indiquait son origine. Photographie ou image générée : indéterminable.

Plutôt que de laisser cette incertitude bloquer indéfiniment toute publication
commerciale, l'image est **remplacée par `src/creations/accueil.svg`**, une
composition Ocean Drive après minuit écrite dans `scripts/build-creations.js` :
façade streamline moderne, marquise néon, palmiers, chaussée mouillée, horizon
de ville. Sa provenance est ce script. Deux contrôles de recette vérifient que
l'image d'accueil est bien une composition du dépôt et qu'aucun élément ni
aucune règle CSS ne charge encore `hero.webp`.

Les miniatures des collections, qui recadraient cette image, affichent
désormais la couverture du pack correspondant.

## Collections « Déjà prêt » — aucune n'est livrable

| Collection | Prix | Fichiers livrables | État |
|---|---|---|---|
| Street | 40 € | **aucun** | `assets_missing` |
| Night | 80 € | **aucun** | `assets_missing` |
| Heat | 120 € | **aucun** | `assets_missing` |
| House | 200 € | **aucun** | `assets_missing` |

Vérifié par recherche sur l'ensemble du dépôt : zéro fichier correspondant.

Le site **n'encaisse plus** pour ces collections. Depuis la correction :

- `src/catalog.json` porte un champ `assets` par collection — c'est la source unique ;
- la vitrine affiche les quatre en « en préparation », sans bouton, sans chemin de
  commande, et le texte de section ne promet plus de livraison immédiate ;
- un garde-fou dans le gestionnaire de clic refuse d'émettre une demande
  « livraison directe » pour une collection à `assets: 0`, même si une carte
  commandable réapparaissait par erreur ;
- le back-office affiche l'état `assets_missing` sur le tableau, en alerte, en
  nommant les collections concernées ;
- `tests/catalogue.js` fait échouer la recette si le champ `assets` diverge entre
  `catalog.json`, la vitrine et le back-office.

**Remettre une collection en vente** suppose, dans cet ordre : produire les fichiers,
les déposer, porter le compte réel dans `src/catalog.json` **et** dans les deux pages,
puis relancer `npm test`. Tant que le compte est à 0, la vente reste fermée.
