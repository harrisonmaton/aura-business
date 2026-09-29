# Expérience — premier client Signature

Transformation de la recommandation n°1 du moteur (« vendre Signature en direct »)
en expérience réelle, pilotée par `omega/`.

| | |
|---|---|
| Offre | Signature, prix/contenu/délai lus dans `src/catalog.json` |
| ICP | commerces food indépendants, BE, zone **Bruxelles (hypothèse)** — voir `experience.json` |
| Variantes | `A-observation-essai` (propose deux visuels d'essai) · `B-question-temps` (question sur le temps passé) |
| Succès | 1 pack payé avant production (niveau 4 — achat) |
| Arrêt | 20 prospects contactés sans vente → KILL : changer l'offre ou la cible |
| Suite si succès | répétabilité : 3 ventes sur 30 nouveaux prospects |
| Budget | 0 € cash, ~8 h propriétaire, ≤ 5 € d'IA |
| Limites | 10 messages/jour/canal, pas de relance avant 90 jours, retrait en une phrase |

**Ce dossier ne contient aucun prospect.** Le dépôt est public : prospects,
messages, réponses et revenus vivent dans `omega/etat/` (ignoré par git), sur la
machine qui fait tourner le worker.

## Suivi automatique

Tout est compté depuis le journal d'événements, rien n'est saisi à la main :
prospects trouvés et qualifiés, messages préparés, approuvés, envoyés,
réponses (classées), étapes, ventes, minutes de production.

    npm run omega:cli -- etat        # l'entonnoir et la distance au premier client
    npm run omega:cli -- apprentissage   # par variante et par segment

## Décisions provisoires, à confirmer ou corriger

- **Zone** : Bruxelles. La ville du propriétaire n'est écrite nulle part.
- **Garantie** : « paiement après validation des deux premiers visuels ». Utilisée
  par la variante A ; chaque message l'indique dans « champs utilisés ».
- **Droits cédés, révisions, remboursement** (BRIEF §10) : non décidés ; la landing
  et la proposition ne répondent pas à ces questions à ta place.
