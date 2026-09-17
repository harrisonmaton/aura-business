# Aura OS — lot 1

Couche applicative indépendante. **La vitrine à la racine n'a pas été touchée**
et ses 136 contrôles passent toujours.

## Démarrer

```bash
cd aura-os
npm install
npm test          # 45 contrôles, dont 19 contre un vrai PostgreSQL
npx next build    # vérifie que l'application se construit
npm run dev       # http://localhost:3000
```

L'application **se construit et se teste sans Supabase**. C'est délibéré : un
projet qui ne compile qu'une fois relié à un tiers ne se reprend pas six mois
plus tard.

## Structure

```
aura-os/
├── src/
│   ├── app/            pages Next.js (App Router)
│   ├── core/           domaine pur — ni base, ni framework, ni réseau
│   ├── verticals/      configuration métier (food uniquement)
│   ├── data/           accès Supabase
│   ├── billing/        contrat de facturation + implémentation factice
│   └── ui/             (lot 2)
├── supabase/migrations/  SQL appliqué tel quel chez Supabase ET en test
└── tests/
```

La règle qui tient l'ensemble : **`core/` ne connaît pas le métier, et
`verticals/food` ne contient pas de logique.** Le cœur sait lire une
configuration ; il ne sait pas ce qu'est un camion de glace. C'est la condition
pour qu'ajouter « beauté » plus tard soit une extension et non un second
produit.

## Ce qui fonctionne réellement, et comment c'est prouvé

| Élément | Preuve |
|---|---|
| Schéma et politiques RLS | **19 contrôles contre un vrai PostgreSQL 16** |
| Isolation entre commerces | 8 contrôles qui tentent explicitement les accès interdits |
| Formulaire public | dépôt autorisé, lecture refusée — les deux vérifiés |
| Validation des demandes | 9 contrôles sur le module pur |
| QR, WhatsApp, messages | 7 contrôles |
| Vertical food | 6 contrôles de cohérence |
| Contrat de facturation | 4 contrôles sur l'implémentation factice |
| Construction Next.js | `next build` passe, 6 routes |

Les contrôles d'isolation ont été **vérifiés dans les deux sens** : en
remplaçant la politique de lecture des demandes par `using (true)`, exactement
deux contrôles tombent. Un test qu'on n'a pas vu échouer ne prouve rien.

## Ce qui ne fonctionne pas encore — et n'est pas déguisé

- **Aucune donnée réelle.** Le tableau de bord affiche `—`, pas `0` : tant que
  la base n'est pas reliée, un zéro serait une mesure inventée.
- **Auth écrite, non éprouvée.** Le code d'inscription et de connexion appelle
  Supabase ; sans instance, il n'a jamais tourné pour de vrai.
- **Onboarding non construit.** Le vertical décrit les 5 écrans ; les écrans
  eux-mêmes sont au lot 2.
- **Facturation : contrat seulement.** Aucun appel à Stripe. Voir plus bas.

## Ce qu'il reste à brancher

### Supabase

1. Créer un projet (offre gratuite suffisante pour le pilote).
2. Appliquer `supabase/migrations/*.sql` **dans l'ordre**.
3. Renseigner dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # serveur uniquement, jamais exposée
```

`SUPABASE_SERVICE_ROLE_KEY` **contourne RLS**. Elle ne doit jamais atteindre le
navigateur ; `clientService()` lève une erreur si on l'appelle côté client.

### Stripe

**Rien n'est branché, et c'est volontaire.** Le compte connecté à la session de
développement est en **mode réel** : il est hors limites tant que le pilote
n'est pas validé.

Quand un sandbox existera :
1. créer les produits et prix en test ;
2. écrire `STRIPE_SECRET_KEY` (test) et `STRIPE_WEBHOOK_SECRET` ;
3. implémenter `FournisseurFacturation` avec le **SDK officiel** — signature,
   idempotence et relances restent à sa charge, pas à la nôtre.

`server/boutique.js`, à la racine, vérifie les signatures Stripe à la main. Il
reste en service pour la vente de packs de la vitrine, mais **Aura OS ne le
réutilise pas pour les abonnements** : dupliquer une vérification de signature
faite maison, c'est un endroit de plus où se tromper sur de l'argent.

## Base locale de test

`npm test` monte un vrai PostgreSQL, applique le shim `auth` puis les
migrations **sans modification**. Si les politiques testées différaient de
celles déployées, le test ne prouverait qu'une copie.

Le shim (`tests/auth-shim.sql`) recrée ce que Supabase fournit nativement :
`auth.users`, `auth.uid()`, les rôles `anon` / `authenticated` /
`service_role`. Il n'est jamais appliqué chez Supabase.

## Coûts

| Service | Aujourd'hui | Au pilote | À ~1 000 commerces |
|---|---|---|---|
| Vercel | 0 € | 0 € | ~20 €/mois |
| Supabase | 0 € | 0 € | ~25 €/mois |
| Stripe | 0 € | 0 € | commission sur transactions |
| **Total fixe** | **0 €** | **0 €** | **~45 €/mois** |

Aucun service payant n'a été ajouté. Aucune génération d'IA n'est déclenchée
par l'application : le content engine est repoussé, donc le coût variable par
utilisateur est nul à ce stade.

## Une leçon du lot 1, gardée par écrit

Le premier banc d'essai RLS a fait passer un **visiteur anonyme pour un
utilisateur connecté**. La revendication d'identité était posée en
`set_config(..., false)` — donc pour toute la session — et le pool de
connexions recyclait la connexion : l'anonyme héritait de l'identité du
dernier utilisateur, et lisait un commerce en brouillon.

Le schéma était bon ; c'est le test qui mentait. C'est aussi exactement la
classe de faille qui rend RLS dangereux derrière un pool de connexions : chez
Supabase chaque requête porte son propre jeton, mais partout où l'on ouvre soi-
même une connexion, c'est à nous de le garantir.
