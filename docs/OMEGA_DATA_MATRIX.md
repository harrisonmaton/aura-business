# OMEGA — matrice des données

Générée par `node omega/data/matrice.js` le 2026-09-29 02:04 UTC. **Accès réel = mesuré à cet instant, depuis cette machine** : une autre machine (Mac, serveur) aura une autre colonne. Relancer après tout changement de réseau.

Ordre = ordre de repli : rang 1 interrogé d'abord, puis 2, 3…, puis le cache, puis UNKNOWN. Jamais une donnée inventée.

| Pays | Donnée | Rang | Source | Accès réel | Authentification | Coût | Limite | Licence | Implémentation |
|---|---|---:|---|---|---|---|---|---|---|
| BE | businessRegistry | 1 | `be-kbo-opendata` | BLOCKED | inscription gratuite au portail open data BCE (humain) | 0 € | extrait mensuel, lecture locale | licence open data BCE — conditions à relire à l'inscription | lecteur local implémenté, testé sur fixture ; extrait réel jamais lu |
| BE | businessRegistry | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| BE | businessRegistry | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| BE | maps | 1 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| BE | maps | 2 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| BE | maps | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| BE | leads | 1 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| BE | leads | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| BE | leads | 3 | `be-kbo-opendata` | BLOCKED | inscription gratuite au portail open data BCE (humain) | 0 € | extrait mensuel, lecture locale | licence open data BCE — conditions à relire à l'inscription | lecteur local implémenté, testé sur fixture ; extrait réel jamais lu |
| BE | statistics | 1 | `be-statbel` | NOT_CONFIGURED | adaptateur à écrire (jeux ouverts Statbel) | 0 € | — | à vérifier | interface seulement |
| BE | statistics | 2 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| BE | statistics | 3 | `worldbank` | BLOCKED | aucune | 0 € | non documentée | CC BY 4.0 | implémenté, testé sur fixture |
| BE | search | 1 | `search-api` | NOT_CONFIGURED | clé d'API de recherche (ex. Brave Search) — OMEGA_SEARCH_KEY | offre gratuite limitée puis payant | — | à vérifier | interface seulement |
| BE | reviews | 1 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| BE | tourism | 1 | `be-statbel` | NOT_CONFIGURED | adaptateur à écrire (jeux ouverts Statbel) | 0 € | — | à vérifier | interface seulement |
| BE | tourism | 2 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| FR | businessRegistry | 1 | `fr-recherche-entreprises` | BLOCKED | aucune | 0 € | 7 requêtes/s | Licence Ouverte 2.0 (Etalab) | implémenté, testé sur fixture |
| FR | businessRegistry | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| FR | businessRegistry | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| FR | maps | 1 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| FR | maps | 2 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| FR | maps | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| FR | leads | 1 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| FR | leads | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| FR | leads | 3 | `fr-recherche-entreprises` | BLOCKED | aucune | 0 € | 7 requêtes/s | Licence Ouverte 2.0 (Etalab) | implémenté, testé sur fixture |
| FR | statistics | 1 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| FR | statistics | 2 | `worldbank` | BLOCKED | aucune | 0 € | non documentée | CC BY 4.0 | implémenté, testé sur fixture |
| FR | search | 1 | `search-api` | NOT_CONFIGURED | clé d'API de recherche (ex. Brave Search) — OMEGA_SEARCH_KEY | offre gratuite limitée puis payant | — | à vérifier | interface seulement |
| FR | reviews | 1 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| FR | tourism | 1 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| ES | businessRegistry | 1 | `es-registro-mercantil` | NOT_CONFIGURED | pas d'API ouverte ; données payantes (Registradores) | payant | — | à vérifier | interface seulement |
| ES | businessRegistry | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| ES | businessRegistry | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| ES | maps | 1 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| ES | maps | 2 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| ES | maps | 3 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| ES | leads | 1 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| ES | leads | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| ES | statistics | 1 | `es-ine` | NOT_CONFIGURED | adaptateur à écrire (API INE ouverte, servicios.ine.es) | 0 € | — | réutilisation autorisée avec citation | interface seulement |
| ES | statistics | 2 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| ES | statistics | 3 | `worldbank` | BLOCKED | aucune | 0 € | non documentée | CC BY 4.0 | implémenté, testé sur fixture |
| ES | search | 1 | `search-api` | NOT_CONFIGURED | clé d'API de recherche (ex. Brave Search) — OMEGA_SEARCH_KEY | offre gratuite limitée puis payant | — | à vérifier | interface seulement |
| ES | reviews | 1 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| ES | tourism | 1 | `es-ine` | NOT_CONFIGURED | adaptateur à écrire (API INE ouverte, servicios.ine.es) | 0 € | — | réutilisation autorisée avec citation | interface seulement |
| ES | tourism | 2 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| EU | businessRegistry | 1 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| EU | businessRegistry | 2 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| EU | maps | 1 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| EU | maps | 2 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| EU | leads | 1 | `import-source` | LOCAL | aucune | 0 € | — | dépend de chaque source citée | implémenté, testé |
| EU | leads | 2 | `osm-overpass` | BLOCKED | aucune | 0 € | usage raisonnable (~10 000 requêtes/jour, pas de charge lourde) | ODbL — attribution « © OpenStreetMap contributors », base dérivée sous ODbL | implémenté, testé sur fixture |
| EU | statistics | 1 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |
| EU | statistics | 2 | `worldbank` | BLOCKED | aucune | 0 € | non documentée | CC BY 4.0 | implémenté, testé sur fixture |
| EU | search | 1 | `search-api` | NOT_CONFIGURED | clé d'API de recherche (ex. Brave Search) — OMEGA_SEARCH_KEY | offre gratuite limitée puis payant | — | à vérifier | interface seulement |
| EU | reviews | 1 | `google-places` | NOT_CONFIGURED | clé Google Maps Platform + compte de facturation (porte humaine) | payant au-delà du crédit gratuit | — | CGU Google Maps : stockage limité | interface seulement |
| EU | tourism | 1 | `eurostat` | BLOCKED | aucune | 0 € | non documentée, usage raisonnable | réutilisation autorisée avec mention de la source (politique Eurostat) | implémenté, testé sur fixture |

## Lecture

- **PASS** : l'hôte répond. **BLOCKED** : refusé par le réseau (proxy, pare-feu) ou injoignable. **LOCAL** : lecture de fichiers, pas de réseau. **NOT_CONFIGURED** : il manque une clé, un compte ou un adaptateur.
- `import-source` accepte des prospects collectés à la main ou par un agent de recherche, **à condition** que chaque fiche porte une URL source et une date de collecte.
- Aucune source ne fournit de personnes : les adaptateurs retirent nom de gérant, fonction, email ou téléphone personnels.
