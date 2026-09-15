# Inventaire des assets — ce qui existe réellement

## Présents dans le dépôt

| Fichier | Taille | Nature | Droits |
|---|---|---|---|
| `src/hero.webp` | 140 248 o | Image d'ambiance de la page d'accueil, recompressée, servie en fichier séparé cacheable | **non établis — voir ci-dessous** |
| `src/fonts/*.woff2` | 220 768 o (6 fichiers) | Archivo et Bodoni Moda, sous-ensembles latin et latin-ext | SIL OFL 1.1, redistribution autorisée, `src/fonts/OFL.txt` |
| `v3_office.png`, `v3_office_rempli.png` | 89 / 91 Ko | Captures du back-office, vide et rempli. Pièces de recette, pas des livrables | production interne |

**C'est tout.** Il n'y a aucun autre fichier binaire dans le dépôt.

Tous les visuels visibles sur la vitrine en dehors de `hero.webp` sont des
compositions SVG **générées par le code au chargement**, à partir d'un générateur
déterministe (PRNG `mulberry32`, graine par hachage FNV-1a). Il n'existe donc
aucun fichier image à exporter pour eux : ils n'existent pas sur disque.

### Polices

Récupérées depuis `fonts.gstatic.com` (Archivo v25, Bodoni Moda v28) puis
servies depuis le dépôt. La page n'émet plus **aucune** requête vers un tiers :
vérifié par le contrôle « aucune requête vers un tiers » de la recette. Les deux
familles sont sous SIL Open Font License 1.1, qui autorise explicitement la
redistribution, y compris embarquée.

## Réserve sur `hero.webp` — toujours ouverte

**La provenance et la licence de cette image ne sont pas documentées.**
Recherche menée sans résultat :

- le fichier ne contient **aucune métadonnée** : un seul chunk `VP8`, pas d'`EXIF`,
  pas de `XMP`, pas d'`ICCP`, pas de manifeste C2PA ;
- la version d'origine, avant externalisation et recompression (251 202 o, extraite
  du base64 inline du commit `8c7b766`), n'en contient **pas davantage** : l'image
  est donc arrivée dans le projet déjà dépourvue de toute trace d'origine ;
- aucun document du dépôt n'indique d'où elle vient.

Elle représente une façade d'hôtel art déco en bord de mer, de nuit. Qu'elle soit
une photographie ou une image générée **n'est pas déterminable** à partir des
éléments disponibles, et rien ne permet d'affirmer l'un ou l'autre.

Conséquences, tant que ce n'est pas tranché :

1. elle **ne doit pas** être considérée comme libre d'usage commercial ;
2. si elle représentait un bâtiment réel identifiable, un droit à l'image des biens
   pourrait s'ajouter à la question de la licence ;
3. la mention en pied de page a été **corrigée** : elle affirmait que les visuels du
   site étaient des compositions générées et non des photographies, ce qui n'était
   pas vérifiable pour cette image. Elle attribue désormais la génération aux seules
   vignettes et compositions décoratives — ce qui est vrai et vérifiable — et ne dit
   plus rien de l'origine de l'image d'accueil. Contrôle de non-régression dans la
   recette : « mention légale : aucune affirmation sur l'origine de l'image d'accueil ».

**Avant toute publication commerciale**, il faut soit retrouver la source et la
licence de ce fichier, soit le remplacer par une image dont la provenance est écrite.

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
