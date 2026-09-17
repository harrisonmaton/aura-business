# 3 — Visuels et direction artistique

Deux usages distincts, à ne pas confondre :

1. **Briefer une prise de vue** que le client fait lui-même avec son
   téléphone — c'est le cas le plus fréquent et le plus utile.
2. **Composer un visuel** à partir de ce qu'on a (photo, texte, couleurs).

Ce qui n'est pas ici : fabriquer une photo d'un plat que le restaurant n'a
jamais servi, ou d'une salle qui n'existe pas. Une image qui présente comme
réel ce qui ne l'est pas engage le commerce, pas nous.

---

## 3.1 — La charte, une fois par client

> À partir de cette fiche :
>
> ```
> [COLLER ICI LA FICHE CLIENT REMPLIE]
> ```
>
> Propose une direction visuelle tenant en une page :
> - **3 couleurs** en hexadécimal : une dominante, une de fond, une d'accent.
>   Vérifie que le texte de la couleur d'accent sur la couleur de fond
>   atteint un contraste d'au moins 4,5:1, et donne-moi le rapport calculé.
> - **2 polices** au maximum, disponibles gratuitement, une pour les titres
>   et une pour le texte courant. Donne la licence de chacune.
> - **Une règle de cadrage** (serré / aéré / centré) et **une règle de
>   lumière** (chaude / froide / naturelle), en une phrase chacune.
> - **Ce qu'on ne fera jamais** : 3 interdits visuels déduits de
>   `{INTERDITS}` et de `{TON}`.
>
> Justifie chaque choix par un élément de la fiche. Un choix que tu ne peux
> pas rattacher à la fiche, retire-le.

Le contraste n'est pas un détail esthétique : un texte clair sur fond clair
est illisible sur un téléphone en plein soleil, c'est-à-dire dans la
situation où le contenu d'un commerce local est réellement consulté.

---

## 3.2 — Brief de prise de vue (le client photographie)

> Pour `{ENSEIGNE}`, écris **{N}** briefs photo réalisables **avec un
> téléphone, sans matériel et sans retouche**. Un par publication.
>
> Pour chacun :
> - `SUJET` — ce qu'on voit, en une phrase.
> - `MOMENT` — l'heure précise, en fonction de la lumière et de
>   `{HORAIRES}`.
> - `CADRAGE` — position, hauteur, distance, format (carré ou 4:5).
> - `À ÉVITER` — l'erreur la plus probable sur cette photo-là.
> - `PLAN B` — la version dégradée si le moment est manqué.
>
> Contraintes : rien qui demande de fermer le commerce, rien qui demande
> plus de 10 minutes, rien qui nécessite un figurant non prévenu. Respecte
> `{INTERDITS}`.

Le `PLAN B` évite le scénario le plus courant : un brief parfait, une
journée chargée, et aucune photo.

---

## 3.3 — Composer un visuel à partir d'un existant

> J'ai : `{DESCRIPTION_DE_LA_PHOTO}`.
> Format : `{FORMAT}` (1080×1080 ou 1080×1350).
> Charte : `{COULEURS}` / `{POLICES}`.
>
> Décris la composition en placements précis, pas en intentions :
> - la zone occupée par la photo (en % du cadre) ;
> - le texte, son contenu exact, sa taille relative, sa position ;
> - la marge minimale de sécurité sur les quatre bords ;
> - ce qui reste lisible à 150 px de large, taille réelle dans un fil.
>
> Le test des 150 px est éliminatoire : si l'accroche n'y est plus lisible,
> propose-moi directement la version corrigée.

---

## Sur les visuels du site Aura

Les scènes du site (`src/scenes/`) sont construites par
`scripts/build-scenes.js`, en SVG, sans photographie ni élément sous licence
tierce. Ce sont des **décors** : elles posent une ambiance et n'illustrent
aucun commerce existant. Elles ne sont pas un modèle de livrable client — un
client reçoit des visuels bâtis sur **ses** images et **sa** charte.

---

## Liste de contrôle avant livraison

- [ ] Le rapport de contraste est calculé et écrit, pas supposé.
- [ ] Les polices ont une licence permettant l'usage commercial, et elle est
      citée.
- [ ] Chaque visuel est lisible à 150 px de large. Vérifié en réduisant.
- [ ] Aucun texte à moins de 4 % du bord.
- [ ] Aucune image ne présente comme réel ce qui n'existe pas.
- [ ] Les briefs photo sont réalisables sans fermer le commerce.
