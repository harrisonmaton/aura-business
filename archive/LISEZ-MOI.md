# archive/ — états antérieurs et fichier réellement publié

## `v4-commit-f29794f/`
Les quatre sources telles qu'elles étaient au commit `f29794f` (« V4 »).
Extraites avec `git show f29794f:src/<fichier>`, donc reproductibles :

    git show f29794f:src/vitrine.html > vitrine.html

**Cet état contient le défaut de débordement mobile de 441 px.** Il est conservé
pour que le diff du correctif soit lisible, pas pour être redéployé :

    git diff f29794f HEAD -- src/vitrine.html

La seule différence sur la vitrine est une règle CSS :

    - .feature-art{min-height:420px;aspect-ratio:1/1}
    + .feature-art{width:100%;min-width:0;min-height:0;aspect-ratio:1/1}

## `v8-publie/`
Le fichier **réellement servi** par la page publiée, version 8, récupéré depuis
la plateforme et non reconstruit.

- `index.html` — 155 199 octets, SHA-256
  `196ef90198302cdcfe9739a65b80884d7acbd8147782319ec3957cd8f1ea63eb`
- `hero.webp` — 140 248 octets, **identique octet pour octet** à `src/hero.webp`

`index.html` = `src/vitrine.html` + 552 octets de squelette ajoutés par la
plateforme à la publication (doctype, `charset`, `viewport`, reset). Vérifié par
diff : les 14 lignes de différence sont exclusivement ce squelette, en tête et
en pied. Aucune divergence dans le corps de la page.

C'est ce que `scripts/build-preview.js` reproduit localement — sans cette
enveloppe, le navigateur compose le mobile à ~980 px et toute mesure est fausse.
