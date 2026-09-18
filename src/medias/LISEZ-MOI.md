# Médias maîtres d'Aura

Ce dossier reçoit les six plans décrits par `AURA-MEDIA-MANIFEST.json`.

**Il est vide, et ce n'est pas un oubli.** Aucun plan n'est produit à ce jour :
le compte Higgsfield est sur un plan qui verrouille les modèles capables
d'atteindre le niveau visé. Le manifeste explique le blocage en détail.

## Ordre imposé

`aura-food` est le **master**. Il fixe la lumière, le contraste, les noirs, le
grain, la profondeur, la matière et l'intensité des accents. Les quatre plans
métier suivants doivent le passer en image de référence — sans lui, quatre
prompts indépendants donnent quatre films différents, et le défaut ne se voit
qu'une fois les quatre payés.

`aura-os` fait exception : son sujet est fabriqué, pas un lieu. Ses écrans
doivent être **éteints** dans l'image générée ; l'interface est posée ensuite
en vrai HTML. Une interface générée est une promesse de fonctionnalité, et le
mandat achat-livraison l'interdit.

## À l'arrivée d'un plan

```bash
node scripts/controler-media.js <fichier> --id aura-food
node scripts/controler-media.js <fichier> --id aura-food --optimiser
```

Le premier appel mesure : définition, recadrage mobile, vide de la zone de
texte, détachement du sujet, écrasement des noirs, dominante ambre, poids, et
— dès que le master existe — l'écart de teinte et de luminance avec lui.

Le second produit les deux dérivés WebP, desktop et mobile, aux noms attendus
par le manifeste.

## Ce qui ne doit jamais entrer ici

Aucun fichier d'essai, aucun placeholder, aucune image de remplacement.
`tests/recette-media.js` refuse tout fichier que le manifeste ne déclare pas,
et `tests/medias.js` refuse tout fichier présent dont l'état n'est pas passé
à `produit`.
