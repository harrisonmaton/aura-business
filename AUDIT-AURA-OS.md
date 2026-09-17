# Aura OS — Audit et plan d'exécution

Rapport de phase 0. Aucune transformation n'a été engagée : ce document existe
pour être contredit avant qu'une ligne d'architecture ne soit écrite.

Établi le 17 septembre 2026 sur `claude/aura-business-v5-setup-kg93dg`, HEAD
`1c7120f`, arbre de travail propre. Tout ce qui suit a été ouvert et mesuré,
pas supposé.

---

## A. Audit du dépôt

### Ce qui existe vraiment

| Élément | Mesure | Remarque |
|---|---|---|
| `src/vitrine.html` | **450 Ko** — 310 Ko de JS, 93 Ko de CSS, 91 fonctions, 3 blocs `<script>` | Fichier unique. C'est la dette principale. |
| `src/back-office.html` | 52 Ko | `localStorage` uniquement, 4 usages. Aucun serveur. |
| `server/boutique.js` | 352 lignes, **zéro dépendance** | Voir ci-dessous — la meilleure surprise du dépôt. |
| `src/catalog.json` | 2 Ko | Source unique des prix. Divergence = recette rouge. |
| `tests/` | 6 fichiers, 1 569 lignes, **136 contrôles** | Vrais contrôles, pas des assertions décoratives. |
| `scripts/` | 5 générateurs | Créations, scènes, preview, collection, audit visuel. |
| `outils/` | Moteur Impeccable + référence visuelle | 167 défauts figés, régressions bloquantes. |
| `.github/workflows/ci.yml` | Actions, Node 22 | Lance `npm test`, code 1 si un contrôle tombe. |
| Dépendances | `playwright` (dev), `three` | 3 paquets dans `node_modules`. C'est tout. |

### `server/boutique.js` — l'actif le plus réutilisable

Il est déjà écrit comme un **module de domaine pur** : pas de serveur HTTP, pas
de framework, pas de dépendance. En-tête du fichier, textuellement :

> *« Ce module est délibérément sans serveur HTTP et sans dépendance : il
> contient les décisions qu'aucun navigateur ne doit pouvoir prendre. Il tourne
> et se teste en local aujourd'hui, et se branche derrière n'importe quelle
> route serveur le jour où il y en a une. »*

Il contient déjà : catalogue comme autorité de prix, versionnage de produit par
empreinte, création de commande, machine à états (`creee` → `payee` → `livree`
→ `remboursee` / `echouee`), **vérification de signature HMAC Stripe en temps
constant**, octroi d'accès, liens signés à durée limitée, journal d'événements.

C'est exactement la couche qu'un SaaS met des semaines à écrire correctement.
**Elle est conservée telle quelle** et devient le noyau commercial d'Aura OS.

### Ce qui fonctionne

- La chaîne commande → paiement signé → livraison → accès, **en simulation
  locale**, prouvée par 12 contrôles de bout en bout.
- Le catalogue comme source unique : un prix recopié ailleurs fait tomber la
  recette.
- La recette visuelle : 167 défauts figés, reproductible (3 exécutions
  identiques), régressions bloquantes, justifications écrites à la main
  conservées au gel.
- L'inventaire réel : une collection sans fichier sur disque ne peut pas être
  annoncée livrable.

### Ce qui est simulé, et doit être appelé simulé

- **Le paiement.** Les tests construisent et signent l'événement localement.
  Aucune connexion à Stripe n'est établie. Les suites le répètent à chaque
  exécution.
- **Le registre du back-office.** `localStorage` : une donnée par navigateur,
  perdue au nettoyage, invisible d'un autre appareil.
- **La livraison.** Des fichiers du dépôt, pas un stockage objet.

### Dette technique réelle

1. **`vitrine.html` à 450 Ko en un fichier.** 310 Ko de JS inline, 91 fonctions
   dans une portée globale, aucun module, aucun bundler. Faire pousser un
   tableau de bord là-dedans est exclu.
2. **Sept blocs de copie i18n empilés** — `REVISED_COPY`, `ASSETS_COPY`,
   `SECTEUR_COPY`, `VINF_COPY`, `BANDES_COPY`, `PIED_COPY`, `FIN_COPY`,
   chacun écrasant le précédent par `Object.assign`. J'en suis l'auteur. Ça
   fonctionne et c'est intenable : pour 106 clés, personne ne sait plus quelle
   couche gagne. À refondre en un catalogue unique par langue.
3. **18 Mo de `livrables/` et 648 Ko d'`archive/` versionnés.** Des captures et
   des livrables passés dans l'historique Git. Sans effet fonctionnel, mais
   chaque clone les traîne.
4. Aucun routage : une page, des ancres.

---

## B. Capacités réelles de l'environnement

Vérifié, pas supposé.

| Capacité | État | Détail |
|---|---|---|
| Node 22 + Playwright + Chromium | ✅ | Tests et captures réels. |
| CI GitHub Actions | ✅ | Déjà branchée sur `npm test`. |
| **Stripe** | ⚠️ **compte réel connecté** | `acct_1UFbll2WjjEdXjp5`, nom « Aura Business », **`livemode: true`**. **Aucun compte sandbox exposé dans cette session.** |
| Variables d'environnement | ❌ | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL` : toutes absentes. |
| Base de données | ❌ | Aucune. |
| Authentification | ❌ | Aucune. |
| Envoi d'e-mails | ❌ | Aucun. |
| Hébergement | ❌ | Aucun. Donc **aucun webhook possible** : Stripe ne peut pas appeler une machine sans adresse publique. |
| Connecteurs | ✅ | Canva, Figma, Notion, ElevenLabs, HeyGen, vidIQ, B12, GitHub. |

### Le point Stripe, sans détour

Un compte Stripe **en mode réel** est connecté à cette session. Ta consigne
permanente est : *« Considère Stripe comme BLOQUÉ tant que le sandbox n'est pas
authentifié… Ne touche pas au mode réel. »*

Je me suis donc arrêté au listage des comptes — la vérification que tu demandes
avant de déclarer quoi que ce soit impossible. **Aucune lecture, aucune
écriture sur ce compte.** Je n'y toucherai pas sans que tu ouvres un sandbox et
que tu me le dises explicitement.

C'est plus favorable qu'on le croyait : la marche à franchir n'est pas
« créer un compte Stripe », c'est « exposer un sandbox et un serveur joignable ».

---

## C. Écart avec Aura OS

Ce qui manque n'est pas une liste de fonctionnalités. C'est **une couche
d'exécution**.

| Brique Aura OS | Aujourd'hui |
|---|---|
| Comptes, sessions, mots de passe | Néant |
| Multi-tenant (`User` → `Business`) | Néant. Le dépôt ne connaît qu'un commerce : Aura. |
| Persistance partagée | Un fichier JSON + `localStorage` |
| Serveur HTTP | **Néant** — aucun `createServer`, aucun `listen` |
| Routage / pages dynamiques | Néant |
| Abonnement récurrent | Néant (le noyau connaît l'achat unique) |
| Page publique par commerce | Néant |
| Onboarding | Néant |
| Tableau de bord | Néant (le back-office est un registre local) |
| QR, leads, bookings, analytics | Néant |

**Le noyau commercial existe. L'application autour n'existe pas.**

Dit autrement : Aura sait aujourd'hui vendre *ses propres* packs. Aura OS doit
permettre à *un autre commerce* d'avoir son propre système. C'est un saut de
nature, pas de taille.

---

## D. Architecture cible

### Trois applications, un noyau

```
aura/
├── noyau/                     ← server/boutique.js, étendu
│   ├── catalogue, commandes, états, accès      (existe)
│   ├── abonnements                              (à écrire)
│   └── événements de domaine                    (à écrire)
│
├── vitrine/                   ← src/vitrine.html, CONSERVÉE
│   └── site commercial d'Aura OS
│
└── app/                       ← NOUVELLE application
    ├── /inscription, /connexion
    ├── /onboarding            → Generate my business
    ├── /tableau-de-bord/*
    └── /[commerce]            → page publique du client
```

### Stack recommandée : Next.js (App Router) + Postgres + Stripe

Je tranche, comme le mandat le demande, et j'explique.

**Pourquoi Next.js :**
- Les pages publiques des commerces doivent être **rendues côté serveur** :
  c'est le SEO par vertical du §47 et le temps de premier affichage sur un
  téléphone au bord d'une route.
- Les **routes API** donnent le webhook Stripe sans serveur séparé — c'est le
  blocage n°1 aujourd'hui.
- Le routage par fichier donne `/[commerce]` sans écrire de routeur.
- C'est le choix le moins exotique pour un fondateur seul : la documentation,
  les exemples et les réponses existent déjà.

**Pourquoi pas de framework du tout** (rester en Node nu) : il faudrait
réécrire routage, rendu serveur, sessions et bundling. Je reconstruirais un
framework moins bon en y passant des semaines.

**Pourquoi pas un générateur type B12/Webflow** : Aura *vend* le système. Si le
système est celui d'un tiers, il n'y a pas de produit, il y a une revente.

**Base de données** : Postgres géré (Neon ou Supabase, offre gratuite
suffisante pour le pilote). Relationnel parce que le modèle l'est : un commerce
a des leads, des bookings, des QR, et on interrogera par commerce en
permanence.

**Ce que ce choix coûte, et que tu dois valider :** un hébergement (Vercel
gratuit suffit au pilote), une base (gratuit jusqu'au pilote), un nom de
domaine. Zéro euro pour démarrer, quelques dizaines d'euros par mois à
l'échelle. C'est la seule décision de ce rapport qui t'engage financièrement.

### La vitrine actuelle est conservée

Tu l'as dit et je suis d'accord : elle devient le site commercial d'Aura OS.
Elle n'est pas jetée, elle n'est pas migrée en priorité. Elle est déjà testée
et figée visuellement. Sa refonte technique viendra *après* la validation
commerciale, pas avant.

---

## E. Modèle de données

Volontairement plus petit que la liste du mandat. On n'ouvre que ce qui sert la V1.

```
User            id, email, mot_de_passe_hash, créé_le
Business        id, user_id, nom, slug, vertical, statut, créé_le
BusinessProfile business_id, logo, couleurs, ton, téléphone, whatsapp,
                instagram, adresse, horaires, zone, description
Subscription    id, business_id, plan, statut, stripe_customer_id,
                stripe_subscription_id, période_fin
MenuItem        id, business_id, catégorie, nom, description, prix, photo, ordre
Lead            id, business_id, nom, téléphone, email, source, type_demande,
                date_evt, personnes, lieu, message, statut, créé_le
QRCode          id, business_id, type, destination, libellé, créé_le
QRScan          id, qrcode_id, horodatage, référent
AnalyticsEvent  id, business_id, type, horodatage, métadonnées
```

Décisions prises, et pourquoi :

- **`Booking` n'est pas une table.** Une demande d'événement est un `Lead` avec
  `type_demande = 'event'`. Deux tables pour un même formulaire, c'est deux
  endroits à tenir à jour et une jointure pour afficher une liste unique.
  On séparera quand un booking aura un cycle de vie propre (acompte, contrat).
- **`Vertical` n'est pas une table** : c'est un fichier de configuration
  versionné avec le code. Un vertical est du code et du wording, pas de la
  donnée client.
- **`Agency` / `AgencyClient` ne sont pas créées**, mais `Business.user_id`
  rend le passage trivial : une agence sera un `User` avec plusieurs
  `Business`. Le schéma le permet déjà, sans le construire.
- **Pas de table `Page`** : la page publique est une *vue* de `Business` +
  `BusinessProfile` + `MenuItem`. Stocker un rendu, c'est stocker une copie qui
  se périme.

---

## F. La V1 exacte

Un commerce de food doit pouvoir, seul, du début à la fin :

1. créer un compte ;
2. décrire son activité (onboarding en 5 écrans, pas 7 — voir plus bas) ;
3. obtenir sa page publique en ligne ;
4. saisir son menu ;
5. générer ses QR (page, menu, avis, réservation, WhatsApp) ;
6. recevoir des demandes dans un tableau de bord ;
7. changer le statut d'une demande en un geste ;
8. voir cinq chiffres utiles.

Écrans : `inscription`, `connexion`, `onboarding`, `tableau-de-bord`,
`ma-page`, `menu`, `qr`, `demandes`, `réglages`, plus la page publique
`/[commerce]`.

**Onboarding ramené de 7 à 5 écrans.** Le mandat en propose 7 ; les écrans
« réseaux » et « identité visuelle » sont fusionnés dans « identité », et les
photos deviennent facultatives. Chaque écran supplémentaire perd des gens, et
la cible est quelqu'un qui n'utilise presque jamais de logiciel. Ce qui manque
se complète ensuite depuis les réglages.

---

## G. Ce que nous ne construisons pas

Explicitement hors V1, et je m'y tiendrai :

Barber, automobile, immobilier, beauté, restaurant, Airbnb · agency mode ·
white-label · affiliation · domaines personnalisés · marketplace · réseau
social · application native · ERP · comptabilité · POS · emailing de masse ·
génération vidéo · chatbot · CRM · campagnes préconfigurées · bibliothèque
d'assets · content engine · gamification.

Deux précisions qui comptent :

- **Le content engine est repoussé.** C'est la fonctionnalité la plus
  séduisante et la moins prouvée. `PROMPTS/` la couvre déjà à la main, sans
  coût d'IA ni quota. On l'industrialise quand un client payant la réclame.
- **Les campagnes saisonnières sont repoussées.** Une campagne Halloween
  n'aide pas à obtenir le premier client payant.

---

## H. Plan d'exécution

| Lot | Contenu | Fin quand |
|---|---|---|
| 0 | **Ce rapport** | Tu l'as validé ou corrigé |
| 1 | Squelette Next.js + Postgres, schéma, `noyau/` importé et ses 136 contrôles toujours verts | `npm test` vert dans la nouvelle structure |
| 2 | Design system (tokens, boutons, champs, cartes, états vides, squelettes) | Documenté et utilisé |
| 3 | Comptes : inscription, connexion, session, réinitialisation | Un compte survit à un redémarrage |
| 4 | Onboarding 5 écrans + `GENERATE MY BUSINESS` | Un commerce créé de bout en bout |
| 5 | Page publique `/[commerce]` | Ouverte depuis un téléphone extérieur |
| 6 | Menu | 0, 1 et 50 produits rendent correctement |
| 7 | Leads + demandes d'événement + statuts | Une demande arrive et change d'état |
| 8 | QR + comptage des scans | Un QR imprimé, scanné, compté |
| 9 | Tableau de bord + 5 métriques | Chiffres réels, pas de démonstration |
| 10 | Architecture de facturation, **sandbox uniquement** | Abonnement simulé de bout en bout en test |
| 11 | Recette complète (§53, §54) | Vert sur mobile, tablette, bureau |
| 12 | **Pilote réel : la camionnette** | Une vraie demande reçue par QR |

Les lots 1 à 9 ne dépendent d'aucune décision de ta part. Le lot 10 attend le
sandbox Stripe.

---

## I. Risques

**Le risque n°1 est le périmètre, pas la technique.** Ce mandat décrit un
produit de plusieurs années. Le piège est de construire le tableau de bord
complet avant qu'un seul commerce ait reçu une demande. Contre-mesure : le
lot 12 est un pilote terrain, pas une démonstration.

**Stripe en mode réel connecté sans sandbox.** Une erreur de manipulation
toucherait de vrais paiements. Contre-mesure : je n'écris rien sur ce compte,
et l'architecture de facturation passe par une couche d'abstraction testée
contre un faux fournisseur avant toute clé.

**Coût de l'IA par utilisateur (§63).** Non résolu, et volontairement : en
repoussant le content engine, la V1 ne déclenche aucune génération. Le jour où
elle en déclenchera, il faudra des quotas *avant* la mise en vente, pas après.

**RGPD.** Dès qu'un lead est stocké, on traite des données de tiers — les
clients de nos clients. Il faut une politique de confidentialité et un contrat
de sous-traitance. **Cela demande une validation juridique humaine**, je ne la
fournirai pas.

**La vitrine à 450 Ko.** Elle n'est pas migrée en V1. Si elle et l'application
divergent visuellement, la marque se fissure. Contre-mesure : le design system
du lot 2 est extrait de la vitrine existante, pas inventé à côté.

**Un seul commerce pilote.** Ta camionnette validera l'ergonomie, pas le
marché. Un client satisfait qui est aussi le fondateur ne prouve rien
commercialement.

---

## J. Critères de succès — Aura Food V1

Aura Food V1 est terminée quand **les huit** sont vrais, vérifiés, pas
supposés :

1. Un commerce extérieur crée son compte **sans mon intervention ni la tienne**.
2. Il termine l'onboarding en **moins de 10 minutes**, chronométré.
3. Sa page publique s'ouvre sur un téléphone extérieur au réseau local, en
   **moins de 2,5 s** en 4G simulée.
4. Un QR imprimé, scanné par un téléphone tiers, arrive sur la bonne
   destination et **incrémente un compteur**.
5. Une demande envoyée depuis ce téléphone **apparaît dans le tableau de bord**
   et déclenche une notification.
6. Le commerçant change le statut en un geste, et le changement **survit à un
   rechargement**.
7. La recette automatisée couvre les six points ci-dessus et **échoue** quand on
   casse l'un d'eux — vérifié dans les deux sens, comme le reste du dépôt.
8. **Une vraie demande client est arrivée par la camionnette.**

Le point 8 est le seul qui compte vraiment. Les sept autres sont les conditions
pour qu'il puisse arriver.

---

## Ce que j'attends de toi avant le lot 1

Trois réponses, rien de plus :

1. **Next.js + Postgres géré + Vercel** : d'accord, ou tu préfères autre chose ?
2. **Un sandbox Stripe** : tu l'ouvres, ou je construis la couche d'abstraction
   et on branche plus tard ?
3. **L'onboarding à 5 écrans** au lieu de 7 : d'accord ?

Tout le reste, je le décide et je le documente.
