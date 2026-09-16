# Outils de design installés

Cinq dépôts demandés. Inspectés avant toute exécution : licences, scripts,
dépendances réseau et clés d'API. Versions figées dans `outils/VERSIONS.txt`.

| Dépôt | Licence | Commit | État réel dans ce projet |
|---|---|---|---|
| pbakaus/impeccable | Apache 2.0 | `0a4e72a` | **Utilisé à chaque `npm run audit`** |
| nextlevelbuilder/ui-ux-pro-max-skill | MIT | `15de38f` | Données lues, appliquées dans le code |
| Leonxlnx/taste-skill | MIT | `ccbc156` | Doctrine lue, appliquée dans le code |
| alchaincyf/huashu-design | MIT | `c4b8367` | Doctrine lue ; **outils vidéo inutilisables ici** |
| microsoft/playwright-mcp | — | — | **Non installé — Playwright était déjà là** |

## Ce qui tourne réellement

Seul Impeccable produit un verdict vérifiable sans LLM : **61 règles
déterministes**, exécutées dans le navigateur, sans clé d'API et sans appel
réseau. Son bundle pré-construit est versionné dans `outils/impeccable/`
(Apache 2.0, `LICENSE` et `NOTICE.md` conservés).

```
npm run audit         # 2 pages × 4 largeurs (320, 390, 768, 1440)
npm run audit:figer   # fige l'état courant comme référence
```

`scripts/audit-visuel.js` compare chaque type de défaut à
`outils/reference-visuelle.json`. Un défaut qui revient **fait sortir en
code 1**, comme un test. Ce n'est pas un rapport ponctuel, c'est un garde-fou.

**Piège mesuré :** le calque de visualisation d'Impeccable déborde lui-même
(468 px sur un écran de 390). La mesure de débordement passe donc *avant* son
injection — sinon la page se voit reprocher un défaut qui n'est pas le sien.

## Ce qui n'a pas été installé, et pourquoi

**playwright-mcp** : Playwright pilote déjà `tests/recette.js` et l'audit.
Ajouter un second pilote aurait créé deux configurations concurrentes pour le
même navigateur. La consigne était de réutiliser l'existant.

**Les CLI des trois autres dépôts** (`npx impeccable install`,
`npx ui-ux-pro-max-cli`, `skill.sh`) écrivent des fichiers de configuration
d'agent et téléchargent des paquets. Leurs apports utiles ici sont de la
doctrine de design : elle est appliquée dans le code et justifiée en commentaire
à l'endroit concerné, pas empilée comme cinq directions d'art concurrentes.

**huashu-design** : ses scripts de rendu (`render-narration.sh`,
`mix-voiceover.sh`, `add-music.sh`, `verify-video.sh`) dépendent tous de
`ffmpeg`, absent de cette session. Sa partie prototypage reste de la doctrine.

## Coût

Aucun. Aucune clé d'API dans les manifestes inspectés, aucun appel réseau à
l'exécution, aucun quota consommé, aucun abonnement.

## Retour arrière

```
git rm -r outils scripts/audit-visuel.js OUTILS.md
```
puis retirer `audit` et `audit:figer` de `package.json`. Le site, la recette et
le noyau serveur ne dépendent d'aucun de ces fichiers. Les corrections déjà
appliquées au code restent valables par elles-mêmes : elles sont justifiées par
une mesure, pas par la présence de l'outil.
