# JARVIS Ω∞ — ce qui existe, ce qui est prouvé, ce qui vient ensuite

Établi le 29 septembre 2026 sur `claude/jarvis-omega-infinity-7v917c`, à partir
de `70b1c4d`. Même règle que `ÉTAT.md` : conçu ≠ implémenté ≠ testé ≠ publié.

Le mandat Ω∞ décrit une civilisation économique : holding, marché interne du
capital, Money Earth 3D, agents en compétition, serveur 24/7. **Presque rien de
cela n'existe, et ce document ne prétend pas le contraire.** Ce qui existe est
la première tranche verticale, construite de bout en bout, et le cadre qui
empêche les suivantes de devenir du faux.

---

## 1. Ce qui a été construit

**Tranche 1 — « Où est mon meilleur prochain euro ? »**

```
npm run omega                        la réponse : trois actions au plus
npm run omega -- --war-room <id>     Réalité · Preuves · Économie · Risques · Stratégie · Exécution
npm run omega -- --consigner         garde la décision et une copie de ce qu'on savait
npm run omega -- --rejouer           recalcule une décision passée, détecte toute retouche
npm run omega -- --signal restauration-rapide 75011   signal public (SIRENE)
npm run test:omega                   31 contrôles
```

| Fichier | Rôle |
|---|---|
| `omega/moteur.js` | Décision pure : validation, portes, plafonds, seuil horaire, journal, rejeu. Sans dépendance, sans réseau, sans horloge implicite. |
| `omega/registre.json` | Le registre **réel** : 6 opportunités, 6 portes humaines, 0 résultat. Chaque preuve cite un fichier du dépôt. Aucun prix recopié — lus dans `src/catalog.json`. |
| `omega/signaux.js` | Collecteur de signaux publics. Un signal non lu rend `bloque`, jamais un chiffre de repli. |
| `omega/jarvis.js` | Interface en ligne de commande. |
| `tests/omega.js` | Recette. Ajoutée à `npm test`. |

### Ce que la réponse dit aujourd'hui

1. **Vendre Signature (90 €) en direct**, sans attendre le site : 20
   conversations, paiement avant production, chronométrer le premier pack.
   *Rentable tant que ton heure vaut moins de ~18 €.*
2. **Proposer Street (40 €)**, déjà livrable, dans les mêmes conversations.
   *Seuil ~16 €/h.*
3. **Aura Food : obtenir un acompte avant d'écrire l'application.**
   *Seuil ~10 €/h.*

Écartés, avec le motif : construire Aura Food (porte « construire » — aucun
acompte), encaisser en ligne (hébergement et sandbox Stripe à ouvrir), activer
le Crew (contrat et avis juridique manquants).

**Le résultat le plus utile n'est pas le classement, c'est les seuils.** Sous
les hypothèses actuelles, aucune action ne reste rentable au-delà de ~18 € de
l'heure. C'est la conséquence directe de deux trous : le temps de production
d'un pack n'a jamais été mesuré (`FICHE-CHRONOMETRAGE.md` est vide), et aucun
prix n'a jamais été demandé à un client. Le moteur ne les comble pas : il les
affiche comme hypothèses qui peuvent renverser le classement.

### Règles que le moteur applique, et que la recette vérifie

| Règle du mandat | Implémentation |
|---|---|
| NO MOCK ECONOMY | Donnée `demo` refusée dans un registre réel ; en mode DEMO, la sortie l'affiche. |
| EXPLAINABLE MONEY | Chaque action porte : pourquoi, preuves sourcées, contre-argument, inconnues, test, critère de succès, **critère d'arrêt**. Sans eux, le registre est invalide et rien n'est recommandé. |
| REVENUE VALIDATION LADDER | Échelle 0–6 (intérêt → recommandation). Un signal de marché n'y figure pas. |
| FIRST MONEY PROTOCOL / SCALE GATES | `construire` exige un acompte (niveau 3), `scaler` un rachat (niveau 5). |
| TRUTH OVER EGO | Probabilité plafonnée par la preuve : 25 % sans preuve client, quoi qu'on déclare. |
| RISK OF RUIN | Un test n'engage pas plus de 5 % de la trésorerie. Trésorerie inconnue → 0 €. |
| CASH EMERGENCY MODE | Runway < 2 mois → seuls les tests gratuits qui rapportent sous 30 jours. |
| HUMAN IDENTITY GATE | Une porte `a_franchir` (compte, KYC, contrat, avis juridique) bloque. JARVIS la liste, ne la franchit pas. |
| CAUSAL ATTRIBUTION | Un résultat sans `DIRECT` / `ASSISTE` / `INCONNU` invalide le registre. |
| OPPORTUNITY REPLAY | Décision consignée avec copie du registre et empreinte ; le rejeu détecte une preuve ajoutée après coup. |
| NO TECHNOLOGY RELIGION | Aucun fournisseur dans le moteur. Le seul appel réseau est isolé et remplaçable. |

---

## 2. Vérifié, et comment

- `node tests/omega.js` : **31 PASS, 0 ÉCHEC**.
- **Vérifié dans les deux sens.** Sept règles neutralisées une à une dans le
  moteur ; chaque fois la recette tombe : porte construire (3 échecs),
  plafond de probabilité (2), contrôle DEMO (2), plafond de risque (2),
  trésorerie inconnue traitée comme illimitée (2), portes humaines ignorées (2),
  empreinte du rejeu ignorée (1).
- La formule du seuil horaire est vérifiée contre un calcul fait à la main.
  Première version du contrôle fausse — c'était ma constante, pas le moteur.
- Suites existantes relancées : serveur 26/26, recette 83/83, parcours 12/12
  (après `npm run build:collection`), showroom 15/15, médias 10/10, motion 17/17.

---

## 3. Ce qui a échoué ou reste bloqué

- **Recherche en direct : bloquée par le réseau de cette session.** Le proxy
  refuse `recherche-entreprises.api.gouv.fr`, `api.worldbank.org` et
  `ec.europa.eu` (403 au CONNECT). Le collecteur est écrit et testé contre un
  faux `fetch` ; `npm run omega -- --signal …` affiche honnêtement
  `BLOQUE — HTTP 403`. Il faut ajouter ces domaines à l'accès réseau de
  l'environnement pour qu'il lise un vrai chiffre.
- **La source branchée couvre la France, l'exploitation est belge.** La BCE/KBO
  n'a pas d'API ouverte équivalente sans compte. Limite déclarée.
- **`npm test` s'arrête dans ce conteneur avant `tests/omega.js`** :
  `tests/recette-media.js` appelle `ffmpeg`, absent ici. Antérieur à ce travail,
  sans rapport avec lui. Le zip de Street, non versionné, doit aussi être
  reconstruit (`npm run build:collection`) avant `parcours-complet.js`.
- **Aucune probabilité n'est calibrée.** Zéro résultat enregistré. Les plafonds
  sont des garde-fous, pas des mesures.

---

## 4. Audits de la phase Ω0

### Licences

| Composant | Licence | Verdict |
|---|---|---|
| `playwright` 1.63 (dev) | Apache-2.0 | OK |
| `three` 0.160 | MIT | OK |
| `gsap` 3.15 | licence standard « no charge » (gsap.com/standard-license) | Gratuite y compris en usage commercial (README du paquet), **mais pas open source**. Le texte de la licence n'est pas dans le dépôt et n'a pas pu être lu ici (réseau) : à relire avant qu'Aura OS devienne un outil de création de sites, cas où des restrictions sont les plus probables. |
| Polices Archivo, Bodoni Moda | SIL OFL 1.1 | OK |
| `omega/` | aucune dépendance | — |

### Sécurité

- `npm audit --omit=dev` : 0 vulnérabilité.
- Aucune clé en clair (`sk_live`, `sk_test`, `whsec_…`, `api_key=`) dans le
  dépôt ; `.mcp.json` est ignoré depuis `70b1c4d`.
- `omega/` : aucun `eval`, aucune écriture hors `omega/decisions.jsonl` (et
  seulement sur `--consigner`), un seul appel réseau, en lecture, sans
  identifiant.
- Pare-feu sur les mouvements d'argent : **le moteur ne peut en déclencher
  aucun.** Il recommande ; il n'a ni clé, ni compte, ni client HTTP d'écriture.
  C'est volontaire à ce stade.
- Stripe : même position que `AUDIT-AURA-OS.md` — compte réel connecté, rien
  n'y est lu ni écrit.

### Performance

`recommander` sur le registre réel : ~0,17 ms par appel (1 000 appels en
170 ms). Sans objet à cette échelle ; on le mesurera à nouveau à 1 000
opportunités.

### Frontier

**Non mesuré.** Aucun benchmark n'a été exécuté dans cette session, et je ne
recopie pas de classements de mémoire : un classement daté et non vérifié est
exactement le genre de donnée que ce système doit refuser. Le FRONTIER SCORE
(capacité, exactitude, fiabilité, latence, coût, confidentialité, sécurité,
maintenance, licence, intégration) n'a de sens que mesuré sur **nos** tâches.
Il entre au plan quand une tâche du moteur appelle un modèle — aujourd'hui,
aucune ne le fait, et la tranche 1 n'en a pas eu besoin.

---

## 5. À garder, à remplacer

| Garder | Pourquoi |
|---|---|
| `server/boutique.js` | Noyau commercial déjà correct : prix, états, signature, accès. Le futur `GENESIS` s'appuiera dessus. |
| `src/catalog.json` | Source unique des prix. Le moteur la lit, ne la copie pas. |
| La culture de recette | Contrôles vérifiés dans les deux sens. `omega/` suit la même règle. |
| `ÉTAT.md` | La colonne « publié » est la plus honnête du dépôt. |

| Remplacer ou refondre | Quand |
|---|---|
| `src/vitrine.html` (450 Ko, un fichier) | Après validation commerciale — voir `AUDIT-AURA-OS.md` §A. |
| Le back-office en `localStorage` | Quand un résultat réel doit être partagé entre appareils. |
| `omega/registre.json` (fichier) | Par une base le jour où plus d'une personne ou d'un agent y écrit. Pas avant. |

---

## 6. Architecture Ω∞ réaliste

Chaque couche n'existe que si la précédente a produit une preuve.

```
Ω0  audit                                 ← ce document
Ω1  moteur de décision + registre         ← FAIT (tranche 1, hors ligne)
Ω2  signaux publics lus en direct         ← écrit, bloqué par le réseau
Ω3  TEST OPPORTUNITY → offre, page, suivi ← tranche 2, après un premier résultat
Ω4  résultats réels → SCALE / ITERATE / KILL
Ω5  opérations automatisées d'une activité validée
Ω6  allocation du profit entre activités
Ω7+ serveur permanent, agents, rapport de l'aube
```

Ce qui **n'est pas** construit, délibérément : Money Earth 3D, marché interne
du capital, agents en compétition, voix, mode nuit. Tant qu'il y a zéro euro
de revenu et une seule activité, un marché interne du capital alloue zéro entre
une activité, et une carte 3D affiche un seul point. Ce seraient les « fake UI »
que le mandat interdit lui-même.

---

## 7. Ce qui changerait la réponse — à toi de le déclarer

Dans `omega/registre.json` → `ressources`. Tant qu'ils sont `null`, le moteur
le dit et reste prudent :

| Champ | Effet |
|---|---|
| `tresorerie` | Lève le plafond à 0 € : des tests payants deviennent possibles. |
| `depensesMensuelles` | Active la détection du mode urgence. |
| `heuresParSemaine` | Écarte les tests qui ne tiennent pas dans ta semaine. |
| `tauxHoraire` | Remplace le classement par seuil par une valeur attendue en euros. |

Et après chaque test, un `resultats[]` sourcé : c'est ce qui fait monter une
opportunité sur l'échelle, franchir les portes, et — un jour — calibrer les
probabilités.

---

# V2 — FIRST REAL REVENUE PIPELINE

Ajouté le 29 septembre 2026. La question n'est plus « que devrais-tu faire ? »
mais « qu'est-ce que JARVIS a déjà fait, et où a-t-il besoin de toi ? ».

## Le pipeline

```
ICP (experiments/…/experience.json)
  → HUNTER : sources par pays, avec repli → fiches entreprises → LeadScore /100
  → COPY : observation vérifiée → douleur en question → valeur du catalogue → CTA + retrait
  → FILE D'APPROBATION : SEND / EDIT / SKIP  (garde-fous : ne-pas-contacter, doublons,
                          plafond quotidien, règles par juridiction)
  → ENVOI : message direct = lien + texte prêts, l'humain envoie et confirme
  → CONVERSATION : réponse collée → intention + objection classées → étape suivante
  → PAIEMENT : enregistré avec preuve, seul chemin vers WON
  → PRODUCTION : chronomètre start / pause / stop, coûts IA / API
  → MOTEUR : résultats réinjectés → probabilité recalculée, test réussi → suite, 20 contacts sans vente → KILL
```

| Module | Rôle |
|---|---|
| `omega/core/` | état en fichiers atomiques sous verrou ; bus d'événements (`LEAD_FOUND` … `REFUND`) |
| `omega/data/` | contrat `{status, source, timestamp, jurisdiction, data, confidence, error}`, registre par pays (BE, FR, ES, reste de l'UE), repli primaire → secondaire → autre → cache → UNKNOWN, santé source par source |
| `omega/hunter/` | ICP, fiches prospect (entreprises seulement, UNKNOWN sinon), LeadScore sur 8 composantes |
| `omega/outreach/` | messages, file d'approbation, fournisseurs d'envoi (DM manuel, email via connecteur) |
| `omega/crm/` | étapes NEW → WON/LOST, classification des réponses, revenus avec preuve, apprentissage par variante/segment |
| `omega/fulfillment/chrono.js` | chronomètre intégré ; coût réel ; seuil horaire mesuré |
| `omega/genesis/` | Genesis-Lite : offre, landing, plan de mesure, pipeline, critères, messages |
| `omega/commerce/` | `CommerceProvider` : paiement manuel (réel), Stripe (non configuré) |
| `omega/connecteurs/` | interfaces email, agenda, GitHub, stockage, CRM, e-commerce, paiements, analytique |
| `omega/comptes/` | orchestrateur d'ouverture de comptes ; KYC, CAPTCHA, conditions, identité, paiement = humain |
| `omega/worker/` | file durable, pare-feu de coût, règles de nuit, planificateur HOURLY/NIGHTLY/WEEKLY, worker auto-réparant |
| `omega/premier-client.js` | mode FIRST CUSTOMER : entonnoir, distance, P(premier client), arbre d'actions, exécution |
| `omega/commandes.js` | le cœur en commandes nommées : terminal, console et (plus tard) voix appellent les mêmes |
| `omega/console/serveur.js` | Control Plane local (127.0.0.1, actions protégées par jeton) |
| `omega/brief.js` · `omega/agents.js` · `omega/doctor.js` | WHILE YOU SLEPT · évaluation / retrait des agents · santé de l'environnement |

## Commandes

```
npm run omega:go            JARVIS exécute ce qui est AUTO (chasse, préparation), puis affiche l'état
npm run omega:cli -- file   messages à approuver (SEND / EDIT / SKIP)
npm run omega:console       même chose dans un navigateur : http://127.0.0.1:4747
npm run omega:worker        un cycle du worker de nuit
npm run omega:brief         WHILE YOU SLEPT
npm run omega:doctor        PASS / WARN / FAIL par composant et par source
npm run omega:cli -- aide   toutes les commandes, avec leur mode AUTO / REVIEW / HUMAN
```

## Tourner sans le Mac ouvert

L'état est un dossier (`OMEGA_ETAT`, par défaut `omega/etat/`) ; le worker est un
processus Node sans dépendance. Sur un serveur :

```
# /etc/systemd/system/omega-worker.service
[Service]
WorkingDirectory=/srv/aura-business
Environment=OMEGA_ETAT=/var/lib/omega
ExecStart=/usr/bin/node omega/worker/worker.js --boucle
Restart=always
```

Sur un Mac : un `LaunchAgent` avec `ProgramArguments = node omega/worker/worker.js --boucle`
et `KeepAlive = true`. Un worker tué laisse ses tâches en `RUNNING` ; le bail
expire après 10 minutes et le suivant les reprend.

## Ce que la recette V2 prouve (35 contrôles, `tests/omega-v2.js`)

Données jamais inventées quand tout est bloqué · repli et cache datés · BCE lue
depuis un extrait au format open data · import refusé sans source · champs
personnels retirés · chaîne exclue · dédoublonnage · message refusé sans
observation · jamais envoyé sans approbation · ne-pas-contacter définitif ·
plafond quotidien · email interdit hors juridiction connue · « STOP » → LOST +
liste d'exclusion · WON impossible sans paiement prouvé · **une vente fait passer
le test à sa suite ; 20 contacts sans vente le tuent ; la probabilité baisse
dès 10 contacts sans vente** · minutes mesurées remplacent l'estimation · pare-feu
de coût · reprise après crash · envoi, publication, dépense jamais la nuit ·
agent coûteux sans contribution → DISABLE · brief · console protégée par jeton.

Dix règles neutralisées une à une font chacune tomber la recette (envoi sans
approbation, ne-pas-contacter, preuve de paiement, champs personnels, message
générique, critère d'arrêt, réinjection des résultats, reprise de bail, cache,
envoi de nuit).

Trois défauts réels trouvés par cette recette pendant l'écriture : le worker
mélangeait horloge simulée et horloge réelle (un nouvel essai partait aussitôt) ;
un `maxCost` « obligatoire » avait une valeur par défaut ; un prospect joignable
seulement par téléphone était « qualifié » et bloquait l'entonnoir pour toujours.

## Suite globale

`npm test` passe désormais de bout en bout dans ce conteneur : `recette-media`
rend `SKIPPED — FFMPEG_MISSING` (et `FAIL` si `CI` est défini). La CI était rouge
avant ce travail, pour une raison sans rapport avec Ω : le chemin Chromium
`/opt/pw-browsers/chromium` codé en dur dans les recettes n'existe pas sur les
machines GitHub. Il est maintenant utilisé seulement s'il existe ; la CI
installe ffmpeg et reconstruit l'archive Street, non versionnée.
