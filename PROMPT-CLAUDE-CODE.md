# MASTER EXECUTION PROMPT — AURA BUSINESS
## À coller dans Claude Code, à la racine du dépôt

---

Tu reprends un projet existant, testé, versionné. Tu n'es pas en train de le
découvrir : tout ce que tu dois savoir est dans ce fichier et dans le dépôt.

**Règles de travail non négociables :**

1. Tu ne déclares rien « fait » sans la commande exécutée et sa sortie.
2. Tu ne simules aucune fonctionnalité. Si une clé, un compte, une API ou une
   décision humaine manque, tu l'écris et tu t'arrêtes sur ce point.
3. Tu es autorisé et invité à dire que ce qui t'est demandé est une mauvaise
   idée. Le propriétaire le demande explicitement.
4. Tu implémentes, tu ne rends pas une liste de recommandations.
5. Tu écris en français.
6. Tu ne fabriques **jamais** un avis, un témoignage, un prospect, une
   conversion, une capture, un chiffre de vente ou un avant/après.

---

## 0. VÉRIFIER L'ÉTAT AVANT DE TOUCHER À QUOI QUE CE SOIT

```bash
git log --oneline -5
npm install && npx playwright install chromium
npm test ; echo "code de sortie = $?"
```

Attendu à `c4a058a` : **27 contrôles, 27 PASS, 0 ÉCHEC**, plus le test de
catalogue et le test de registre avec runtime simulé. `code de sortie = 0`.

Si tu n'obtiens pas ça, **tu ne continues pas** : tu dis ce que tu obtiens.

Vérifie aussi que la recette mord vraiment. Casse une assertion volontairement,
relance, tu dois voir `code de sortie = 1`, puis restaure. Une recette qui sort
en 0 sur un échec ne vaut rien, et c'est arrivé sur ce projet.

---

## 1. CE QU'EST LE PRODUIT — exactement, sans extrapolation

Aura Business vend des **packs de contenu Instagram prêts à publier** à des
commerces et indépendants. Le client paie une fois, reçoit un fichier de visuels
et de textes, colle, publie.

Ce n'est **pas** une agence, pas du community management, pas un abonnement, pas
un logiciel, et il n'y a **aucun produit audio ni vidéo**. Le vocabulaire
« Miami, nocturne, cinématographique » décrit la direction artistique **du site
de vente**, pas la marchandise. Ne construis aucune hypothèse de droits
musicaux, de fournisseur média ou de livrable sonore.

### Catalogue — source unique : `src/catalog.json`

Packs sur brief (`kind: brief`) :

| N° | Nom | Prix | Contenu | Délai affiché |
|---|---|---|---|---|
| 1 | Essentiel | 50 € | 8 visuels 1:1, 8 textes, 4 messages | 24–48 h |
| 2 | Signature | 90 € | 12 visuels, 12 textes, 6 messages, bio | 48 h |
| 3 | Atelier | 150 € | 18 visuels, 18 textes, 10 messages, bio | 48–72 h |
| 4 | Maison | 250 € | 24 visuels, 24 textes, 12 messages, bio, stories | 72 h |

Collections prêtes (`kind: ready`) :

| N° | Nom | Prix | Contenu |
|---|---|---|---|
| 1 | Street | 40 € | 4 visuels |
| 2 | Night | 80 € | 8 visuels, 8 textes |
| 3 | Heat | 120 € | 12 visuels, textes, 4 messages |
| 4 | House | 200 € | 20 visuels, bio |

Suppléments : bio +15 € (pack n°1 uniquement, les autres l'incluent) · 5 messages
de plus +20 € · 5 stories de plus +20 € · express 24 h +25 €.

> **Les deux numérotations sont distinctes.** Confondre « n°2 Night à 80 € » et
> « n°2 Signature à 90 € » a déjà été un bug réel en production. Le champ `kind`
> existe pour ça, `tests/catalogue.js` le protège, et tu ne le retires pas.

### Parcours réel aujourd'hui

```
site → choix d'un numéro → brief en 3 lignes → message composé et copié
     → dialogue explicite : le client copie, il n'est pas redirigé de force
     → il envoie en privé à @polakpl_f44
     → la maison confirme prix et délai              [humain]
     → le client paie dans la conversation            [humain, hors site]
     → production                                     [humain, assisté par IA]
     → livraison du fichier en message privé          [humain]
```

**Rien n'est encaissé sur le site, à aucun stade, ni en test ni en réel.**
Le site est un catalogue et un compositeur de message. Ne décris jamais
l'inverse, dans le code comme dans l'interface.

---

## 2. CE QUI EXISTE ET EST VÉRIFIÉ

- `src/vitrine.html` — page publique autonome, ~155 Ko + `hero.webp` 137 Ko en
  fichier séparé cacheable. DA nocturne, 4 langues (FR/EN/ES/IT), catalogue des
  8 offres, commande en 3 étapes avec validation, aperçu recomposé, Social Club
  avec carte locale et lien de parrainage, FAQ, navigation mobile.
- `src/back-office.html` — registre privé. Lit automatiquement le message reçu
  en DM (formats brief **et** collection prête, ancien et nouveau), cycle de vie
  nouveau → confirmée → production → livrée, chiffres calculés **uniquement** sur
  les commandes réelles, commissions par code de parrainage, assistant de
  rédaction des textes du livrable.
- `src/catalog.json` — source unique du catalogue.
- `scripts/build-preview.js` — enveloppe les sources dans le squelette HTML
  exact ajouté à la publication (`charset`, `viewport`, reset). **Sans cette
  étape le navigateur compose le mobile à ~980 px et toute mesure mobile est
  fausse.** Cette erreur a déjà été commise ici.
- `tests/` — trois suites Playwright, code de sortie 1 sur échec.

### Défauts déjà corrigés — ne les réintroduis pas

- Débordement horizontal réel de 441 px à toutes les largeurs mobiles, causé par
  `.feature-art{min-height:420px;aspect-ratio:1/1}` : la contrainte de hauteur
  imposait 420 px de largeur. En contexte mobile, ce débordement élargit le
  viewport de mise en page et étirait le `#topbar` fixe à 441 px, ce qui avait
  rendu le bouton de menu inatteignable dans une version antérieure.
  **Il était masqué par `html,body{overflow-x:clip}` et 26 contrôles verts ne le
  voyaient pas.** Le 27ᵉ contrôle neutralise le clip dans une page jetable avant
  de mesurer. Ne le supprime pas, et n'ajoute jamais `overflow-x:hidden` pour
  faire passer un test de débordement.
- XSS : le seed tapé par le client était interpolé brut dans un `id=` de SVG via
  `innerHTML`. Corrigé par `hashSeed(seed).toString(36)`. Testé avec une charge
  réelle.
- Fonction `artHtml` dupliquée, l'ancienne définition écrasait la nouvelle.
- Bouton « Créer la carte » sans écouteur.
- Presse-papier : copie synchrone avant toute navigation (iOS Safari), repli
  affiché dans le dialogue quand elle échoue.
- Codes de parrainage tirés par `crypto.getRandomValues`.
- Faux avis (« 4.9 · 31 avis ») et compteur de membres simulé : **supprimés**.
  Les faux avis sont interdits dans l'UE. Ne les remets pas, sous aucune forme.

---

## 3. CE QUI N'EXISTE PAS

Pas de paiement, ni test ni réel. Pas de compte client. Pas de backend, pas de
serveur. Pas d'email automatique. Pas d'analytics — seulement des points de
branchement inertes. Pas de sauvegarde. Pas de conditions générales, pas de
mentions de TVA. Aucun appel réel au fournisseur de rédaction n'a jamais été
exécuté (testé avec un faux runtime uniquement).

---

## 4. LES DEUX BLOCAGES — ORDRE NON NÉGOCIABLE

### A. Les collections prêtes n'ont aucun fichier

Le site affiche « Déjà prêt — livraison directe » et vend Night à 80 €.
**Zéro visuel, zéro texte n'existe pour Street, Night, Heat ou House.** Si
quelqu'un paie ce soir, il n'y a rien à envoyer. Décrire un produit comme
immédiatement disponible alors qu'il n'existe pas expose le vendeur dans l'UE.

Trois issues, au choix du propriétaire :
1. produire réellement les 44 visuels et leurs textes ;
2. introduire un état `assets_missing` et remplacer « livraison directe » par un
   délai honnête ;
3. retirer la section.

Tant que ce n'est pas tranché, **tu ne fais pas de refonte visuelle de cette
section** : tu embellirais une promesse qui n'est pas tenable.

### B. Aucun pack n'a jamais été chronométré

Le temps réel de production d'un Signature à 90 €, support et reprises compris,
est **inconnu**. Sans ce chiffre : aucune marge calculable, aucun prix plancher
défendable, aucune capacité hebdomadaire connue, aucune décision
d'automatisation fondée.

Formule à utiliser une fois le chiffre disponible :

```
marge brute = prix − coût du temps − outils − assets − frais de paiement
              − commissions − autres coûts variables
```

Chronomètre au moins les commandes 1, 3 et 5 de chaque famille. Compte le brief,
les premiers échanges, les prospects non convertis, la recherche, la création,
les corrections, la QA, la livraison, le support et les relances. Distingue
temps actif, temps d'attente et coût variable.

> **Garde-fou :** tant que B n'est pas mesuré, tu ne produis aucun scénario
> « 10 000 € / mois » ni « 30 000 € / mois ». Un scénario bâti sur un temps
> supposé ne fait que confirmer le prix qu'on a choisi d'avance. Si on te le
> demande quand même, tu réponds par la fiche de mesure, pas par un tableau.

### Les sept autres inconnues commerciales

Toutes marquées `[À DÉCIDER PAR LE PROPRIÉTAIRE]`. Tu ne les inventes pas et tu
ne les remplis pas par défaut :

1. droits cédés au client sur les visuels et les textes ;
2. nombre de révisions incluses par pack ;
3. point de départ exact du délai (confirmation ? paiement ? brief complet ?) ;
4. exclusions — ce que la maison ne fait pas ;
5. procédure en cas d'échec ou de client insatisfait, remboursement ou non ;
6. sort d'une commande payée dont le client ne répond plus ;
7. entité vendeuse, TVA, conditions générales, mentions légales.

---

## 5. CONTRAINTES D'ENVIRONNEMENT — mesurées, pas supposées

Le travail précédent a été fait dans un bac à sable cloud dont le réseau sortant
est filtré. **Mesures réelles depuis cet environnement :**

| Cible | Résultat |
|---|---|
| GitHub (`git clone`, `branch`, `commit`) | fonctionne |
| `git push`, pull request | nécessite un jeton fourni par le propriétaire |
| Vercel, Supabase, Stripe, Resend | HTTP 000 — injoignables |

**Conséquence : toi, Claude Code, tu tournes sur la machine du propriétaire.**
Les étapes déploiement, preview et production ne sont possibles que chez toi.
Vérifie-le toi-même avant d'y compter :

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.vercel.com
curl -s -o /dev/null -w "%{http_code}\n" https://api.stripe.com
```

Autre contrainte, propre à la plateforme d'artifacts où la vitrine est publiée :
une page qui déclare une base de données y devient interne à l'organisation et
non partageable publiquement. C'est pourquoi la vitrine ne déclare **aucune**
capacité et reste publique, et pourquoi le back-office est un second document
privé. Si tu migres hors de cette plateforme, cette contrainte disparaît et la
séparation peut être repensée — mais pas avant.

---

## 6. ORDRE D'EXÉCUTION

Tu traites dans cet ordre. Tu ne sautes pas une étape parce que la suivante est
plus intéressante.

1. **Vérifier l'état** (§0). Confirmer 27/27 et code 1 sur échec provoqué.
2. **Brancher** : `git checkout -b v5` et ne jamais travailler sur la branche par
   défaut.
3. **Trancher le blocage A** avec le propriétaire. Implémenter la décision.
4. **Ouvrir la fiche de chronométrage** du blocage B et la mettre en service.
   C'est un fichier à remplir dans la vraie vie, pas une simulation.
5. **Documenter les sept inconnues** dans un fichier `OFFRE.md`, avec
   `[À DÉCIDER PAR LE PROPRIÉTAIRE]` partout où il n'y a pas de réponse, et
   bloquer la mise en avant commerciale des points concernés.
6. **Polish visuel** — seulement maintenant, et seulement sur ce qui est
   réellement vendable. Direction : nuit, art déco tropical, néons maîtrisés,
   typographie éditoriale, profondeur légère. **Aucune copie** de GTA, Rockstar,
   Vice City, d'un créateur, d'une marque, d'un logo, d'un son, d'un texte ou
   d'une interface. Aucune réutilisation de visage, de capture ou d'identité de
   tiers sans licence écrite. Le visiteur doit savoir en moins de dix secondes
   ce qui est vendu, à quel prix, dans quel délai, quelle est l'action suivante,
   et ce qui n'est **pas** inclus.
7. **Accessibilité et performance mesurées** : reduced motion, clavier, contraste,
   `scrollWidth === clientWidth` **clip neutralisé**, LCP ≤ 2,5 s / INP ≤ 200 ms /
   CLS ≤ 0,1 sur une preview réaliste — pas une mesure locale sans latence.
8. **Migration hors artifacts** — uniquement quand un compte client, un paiement,
   une donnée personnelle, un fichier privé, un webhook ou une prospection réelle
   arrive. Modèle minimal : `customers`, `orders`, `catalog_versions`,
   `order_events`, `deliverables`, `referrals`, `payouts`, `consents`,
   `audit_logs`, `prospects`, `outreach_drafts`.

---

## 7. PROSPECTION — ce qui est légalement possible

L'API officielle d'Instagram ne fournit pas de liste de prospects et ses
conditions interdisent la collecte automatisée. **Aucun DM automatique, aucun
scraping, aucun contournement d'anti-bot, aucune base achetée.**

Le seul MVP défendable :

```
source autorisée ou CSV approuvé → déduplication → liste d'exclusion
→ scoring transparent → brouillon personnalisé → file d'approbation
→ ENVOI PAR UN HUMAIN → réponse → brief → commande
```

Le système conserve source, date, raison du score, statut, opt-out et historique.
Un agent propose ; il n'envoie jamais.

---

## 8. AGENTS — n'en construis pas treize

Le propriétaire produit tout seul, à la main, avec des outils IA et Photoshop.
**Le chiffre d'affaires est plafonné par son temps, pas par le site.** Aucune
amélioration d'interface ne déplace ce plafond ; seules une délégation de
production ou une standardisation du livrable le déplacent.

Un organigramme de treize agents pour une activité qui n'a pas encore de volume
mesuré est du théâtre. Construis dans cet ordre, et seulement quand le précédent
sert vraiment :

1. **humain** — stratégie, prix, droits, cash, qualité finale, décisions
   irréversibles ;
2. **assistant de rédaction** (existe déjà, jamais exécuté en réel) — légendes,
   messages, bio. C'est le seul usage d'IA justifié à court terme. La production
   des visuels reste à la main du propriétaire ;
3. **registre / CRM** (existe déjà) ;
4. tout le reste : **après** la mesure du blocage B.

Quel que soit l'agent : paiements, remboursements, suppressions, secrets, droits,
contacts sortants, publications et livraisons finales exigent une validation
humaine. Un agent propose, il ne décide pas.

---

## 9. CE QUI COMPTE COMME « FAIT »

Diff et SHA identifiables · recette rouge bloquante · erreur JS bloquante ·
catalogue cohérent entre les deux pages · packs livrables réellement présents ·
prix, droits, révisions et délais documentés ou marqués à décider · aucun secret
client dans le dépôt · XSS et CSP vérifiés · responsive validé clip neutralisé ·
accessibilité contrôlée · médias cacheables · données réelles séparées des
fixtures · prospection sans envoi automatique · checkout en test uniquement ·
rollback vérifié · preview rattachée au commit.

« 27 tests passés », « tout est automatique » ou « production-ready » sans la
commande et sa sortie ne valent pas « fait ».

---

## 10. TA PREMIÈRE RÉPONSE

Avant toute modification, rends :

1. la sortie de `npm test` et son code de sortie ;
2. la sortie de l'échec provoqué (code 1) puis de la restauration (code 0) ;
3. la sortie des deux `curl` du §5 ;
4. ce que tu constates qui contredit ce document — il a été écrit le
   15 septembre 2026 au commit `c4a058a` et il peut être périmé ;
5. la question exacte que tu poses au propriétaire sur le blocage A.

Ne code rien avant ça.
