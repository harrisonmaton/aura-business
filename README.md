# Aura Business — sources et recette

**Ce dépôt a été initialisé le 15 septembre 2026 à partir des fichiers de travail.**
Il n'existait pas auparavant : le travail n'était pas sous git. Il n'y a donc
aucun historique antérieur, et aucun n'a été fabriqué.

Le premier commit reproduit volontairement l'état **avant** le correctif des
codes de sortie de tests, uniquement pour que le diff du correctif soit lisible.
C'est une reconstitution assumée, pas une histoire réelle.

- `src/` — les deux pages publiées
- `preview/` — généré par `npm run build:preview` (squelette identique à la publication)
- `tests/` — recette Playwright ; **sortie en code 1 si une assertion échoue**
- `.github/workflows/ci.yml` — exécute `npm test` à chaque push

## Lancer la recette

    npm install && npx playwright install chromium && npm test
    echo $?     # 0 = tout vert, 1 = au moins un échec
