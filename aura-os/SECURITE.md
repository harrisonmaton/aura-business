# Aura OS — accès aux données et secrets

Document exigé avant toute création de projet Supabase. Il corrige une
décision d'architecture prise au lot 2.

---

## 1. La faille de mon design précédent

Au lot 2, j'avais choisi de faire passer **tout** l'accès aux données par SQL
sur une connexion PostgreSQL directe, avec cette mécanique :

```js
await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
await c.query('set local role authenticated');
```

Les politiques RLS **sont** bien évaluées — mes 19 contrôles le prouvent. Mais
ce n'est pas le bon débat, et la faille est ailleurs.

### Faille A — l'application AFFIRME l'identité

Dans ce schéma, c'est le code applicatif qui déclare « voici qui est
l'utilisateur ». RLS fait ensuite confiance à cette déclaration.

Conséquence : **RLS ne vaut que ce que vaut le `userId` qu'on lui passe.** Il
suffit qu'un seul chemin — un paramètre d'URL, un champ de formulaire, un
cookie mal validé — fournisse un identifiant non vérifié, et l'usurpation est
totale. On ne contourne pas la politique : on lui ment.

Avec `@supabase/ssr`, l'application ne peut pas affirmer une identité. Elle
**porte un jeton**, que Supabase vérifie cryptographiquement avant d'exécuter
quoi que ce soit. C'est une différence de nature, pas de degré.

### Faille B — une ligne oubliée suffit

La connexion s'ouvre avec un rôle privilégié, puis se rabaisse à chaque
transaction. Si `set local role authenticated` manque — oubli, retour anticipé,
exception mal rattrapée, requête ajoutée hors de `dans()` — la requête
s'exécute avec le rôle privilégié et **RLS est intégralement contourné**.

Une ligne manquante entre le fonctionnement normal et la fuite de toutes les
données de tous les commerces. Ce n'est pas un risque acceptable pour le chemin
normal d'un produit.

**La correction est donc acceptée, et pour ces deux raisons.**

---

## 2. Architecture retenue

| Chemin | Usage | Identité | RLS |
|---|---|---|---|
| **`@supabase/ssr` + clé publiable** | **Toutes** les requêtes utilisateur et publiques | Jeton vérifié par Supabase | Évaluée par Supabase |
| SQL direct (`pg`) | **Tests locaux et migrations uniquement** | Rôle posé par le banc d'essai | Évaluée, mais sur une identité affirmée |

Le chemin SQL **ne sert plus au produit**. Il reste pour deux choses
légitimes :

- **prouver les politiques** contre un vrai PostgreSQL, sans dépendre du
  réseau ni d'un tiers ;
- **appliquer les migrations**.

### Ce que mes 19 contrôles prouvent — et ne prouvent pas

- ✅ Ils prouvent les **POLITIQUES** : qui peut lire quoi, qui est refusé.
  Les politiques sont identiques des deux côtés, donc cette preuve tient.
- ❌ Ils ne prouvent **PAS le TRANSPORT** : ni la vérification du jeton, ni
  les cookies de session, ni le rafraîchissement. Seul un vrai Supabase le
  peut.

Je le note ici pour ne pas leur faire dire plus qu'ils ne disent.

---

## 3. Variables d'environnement — la liste exacte

### Nécessaires au lot 2

| Variable | Public ? | Où | Pourquoi |
|---|:--:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 🌐 publique | navigateur + serveur | Adresse du projet. Visible par conception. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 🌐 publique | navigateur + serveur | Clé `sb_publishable_…`. Conçue pour être exposée : **elle n'ouvre rien par elle-même**, RLS décide de tout. |

**C'est tout.** Deux variables, aucune secrète.

### NON nécessaire au lot 2

| Variable | Pourquoi pas |
|---|---|
| `SUPABASE_SECRET_KEY` | **Aucune opération du lot 2 n'en a besoin.** Inscription, connexion, onboarding, page publique, dépôt de demande, QR, tableau de bord : tout passe par une identité vérifiée ou par le rôle anonyme. |
| `DATABASE_URL` | Uniquement pour les tests locaux et les migrations. Pointe vers le PostgreSQL **local**, jamais vers Supabase depuis l'application. |

### Ce qui exigera une clé secrète, plus tard

Au lot 3, et uniquement là :

- le **webhook Stripe** : il arrive sans utilisateur, et doit écrire dans
  `subscription`, table sur laquelle aucun utilisateur n'a le droit d'écrire —
  c'est précisément ce qui empêche un client de s'offrir le plan Business ;
- les **tâches de récupération** (relancer une livraison échouée).

Je la demanderai à ce moment-là, en disant pour quelle opération précise.

### Règles sur la clé secrète, quand elle existera

- Jamais dans une variable `NEXT_PUBLIC_*` — ce préfixe est ce qui met une
  valeur dans le paquet envoyé au navigateur.
- Jamais dans Git : `.env.local` est déjà ignoré.
- Jamais dans un journal, un message d'erreur, une page.
- `clientService()` lève déjà une erreur si on l'appelle côté navigateur.
- Supabase ajoute son propre garde-fou : une clé `sb_secret_…` utilisée depuis
  un navigateur reçoit un **401**.

---

## 4. Mise en cache des réponses authentifiées

Point réel et facile à rater. Une réponse rendue côté serveur pour un
utilisateur connecté **ne doit jamais être mise en cache partagée** : le cache
servirait la session d'une personne à une autre.

Règle appliquée : toute route qui lit une session porte
`export const dynamic = 'force-dynamic'` et n'est jamais pré-rendue. Les routes
réellement publiques — la page d'un commerce — peuvent être mises en cache,
mais **sans** jamais lire de session.

Un contrôle vérifiera qu'aucune route authentifiée n'est marquée statique.

---

## 5. Ce que je te demande, et rien de plus

Crée le projet Supabase **Free, région Europe**. Puis mets **deux lignes** dans
`aura-os/.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

Ne colle aucune clé secrète dans une conversation. Aucune n'est nécessaire au
lot 2 — et si j'en demande une un jour, je devrai dire pour quelle opération.

Les migrations s'appliquent depuis l'éditeur SQL du tableau de bord Supabase,
dans l'ordre : `0001_init.sql`, `0002_creer_commerce.sql`, `0003_grants.sql`.
Le shim `tests/auth-shim.sql` ne s'applique **jamais** chez Supabase : il
recrée ce que Supabase fournit déjà.

---

## 6. Ce qui sera prouvé contre le vrai Supabase

Les 19 contrôles seront rejoués, mais à travers le transport réel :

1. l'utilisateur A ne voit que le commerce A ;
2. l'utilisateur B ne voit que le commerce B ;
3. un anonyme ne fait que les actions publiques explicitement autorisées ;
4. un anonyme ne lit **aucune** demande ;
5. **aucune clé secrète n'est nécessaire dans le navigateur** ;
6. inscription, connexion, déconnexion, mot de passe oublié, rafraîchissement
   de session, routes protégées ;
7. l'autorisation ne s'appuie jamais sur un objet de session côté client.

Le point 7 mérite d'être explicite : une session lue dans le navigateur dit qui
l'utilisateur **prétend** être. Seul le serveur, en revalidant le jeton, sait
qui il **est**.
