# Inventaire des assets — ce qui existe réellement

## Présents dans cet export

| Fichier | Taille | Nature |
|---|---|---|
| `src/hero.webp` | 140 248 o | Image d'ambiance de la page d'accueil, recompressée, servie en fichier séparé cacheable |
| `v3_office.png`, `v3_office_rempli.png` | 89 / 91 Ko | Captures du back-office, vide et rempli. Pièces de recette, pas des livrables |

**C'est tout.** Il n'y a aucun autre fichier binaire dans le dépôt.

Tous les visuels visibles sur la vitrine en dehors de `hero.webp` sont des
compositions SVG **générées par le code au chargement**, à partir d'un générateur
déterministe (PRNG `mulberry32`, graine par hachage FNV-1a). Il n'existe donc
aucun fichier image à exporter pour eux : ils n'existent pas sur disque.

## Réserve sur `hero.webp`

**La provenance et la licence de cette image ne sont pas documentées.**
Je ne sais pas d'où elle vient. Tant que ce n'est pas tranché, deux
conséquences :

1. elle ne doit pas être considérée comme libre d'usage commercial ;
2. la mention en pied de page — « Les visuels présentés sur ce site sont des
   compositions générées, pas des photographies » — est **potentiellement fausse
   depuis l'ajout de cette image**. À corriger ou à justifier.

## Absents — et c'est le blocage commercial principal

| Collection | Prix affiché | Fichiers livrables |
|---|---|---|
| Street | 40 € | **aucun** |
| Night | 80 € | **aucun** |
| Heat | 120 € | **aucun** |
| House | 200 € | **aucun** |

Vérifié par recherche sur l'ensemble du répertoire de travail : zéro fichier
correspondant. Le site affiche pourtant « Déjà prêt — livraison directe ».
Si quelqu'un paie ce soir, il n'y a rien à envoyer.
