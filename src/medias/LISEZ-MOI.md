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

L'outil est un **instrument de diagnostic**, pas un directeur artistique. Il
sépare deux choses :

**STRUCTUREL — bloquant.** Des faits : le fichier se décode, définition,
ratio, le recadrage mobile n'ampute pas le sujet, la zone de texte reste
exploitable, le poids tient sous la limite critique. Un plan qui échoue ici
n'entre pas, quelle que soit sa beauté.

**APPRÉCIATION — indicatif.** Luminance, uniformité, détachement du sujet,
niveau des noirs, température, écart au master. Ce sont des signaux portés à
l'œil. **Ils ne condamnent jamais rien** : une photographie exceptionnelle peut
rater un seuil et rester meilleure que la conforme.

Verdicts automatiques : `REJECT`, `REVISE`, `QA PASSED`.

**`MASTER APPROVED` n'est jamais prononcé par la machine.** Il exige une
`VISUAL REVIEW` et une `MOTION FITNESS REVIEW` faites par un humain — l'outil
en imprime les deux listes à cocher. La détection de texte ou de logo généré
est bloquante mais figure dans la revue humaine : un OCR qui se trompe est
pire qu'une case à cocher.

Le second appel produit les deux dérivés WebP, desktop et mobile, aux noms
attendus par le manifeste. Il **refuse de s'exécuter sur un plan rejeté**, et
rappelle qu'un fichier en place n'est pas un plan approuvé.

Un asset validé n'entre **pas** automatiquement dans la scène 04.

## Ce qui ne doit jamais entrer ici

Aucun fichier d'essai, aucun placeholder, aucune image de remplacement.
`tests/recette-media.js` refuse tout fichier que le manifeste ne déclare pas,
et `tests/medias.js` refuse tout fichier présent dont l'état n'est pas passé
à `produit`.
