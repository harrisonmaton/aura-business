# Noyau commercial — état réel

`server/boutique.js` contient les décisions qu'aucun navigateur ne doit pouvoir
prendre : le prix, l'état d'une commande, l'octroi d'un droit d'accès. Il n'a
aucune dépendance et ne démarre aucun serveur HTTP. Il tourne et se teste en
local aujourd'hui, et se branche derrière des routes serveur le jour où il y en a.

## Ce qui est prouvé, et à quel niveau

| Niveau | Signification | État |
|---|---|---|
| **Simulation locale** | événements construits et signés avec un secret de test | **23 contrôles, 23 PASS** |
| **Local + Stripe sandbox** | `stripe listen` relaie de vrais événements de test | **bloqué** — aucun contexte sandbox dans la session |
| **Bout en bout hébergé** | Stripe appelle une URL publique | **bloqué** — aucun hébergement |

Les 23 contrôles sont des simulations. Ils prouvent la logique, **pas** la
connexion à Stripe. Ne pas les présenter comme un paiement test réussi.

## Ce que les contrôles couvrent

Prix imposé par le serveur · collection sans fichier non commandable · inventaire
partiel bloquant · prestation sur mesure jamais en livraison immédiate ·
signature valide acceptée · signature invalide refusée · corps modifié refusé ·
horodatage périmé refusé · schéma `v0` seul refusé (rétrogradation) · corps déjà
parsé refusé · paiement confirmé livrant le bon produit · événement dupliqué sans
seconde livraison · montant divergent refusé · paiement non confirmé sans accès ·
mauvais environnement refusé · lien expirant · **accès refusé à un autre client** ·
jeton falsifié refusé · version achetée conservée · email en panne avec achat
récupérable · reprise sans doublon · journal complet.

Vérifiés rouges : en neutralisant l'isolation client puis le contrôle du montant,
la recette passe à 2 échecs et sort en code 1.

## Décisions de conception

**Le montant n'est pas un paramètre.** `creerCommande` calcule le prix depuis
`src/catalog.json`. Un client qui poste `montantCentimes: 1` obtient le prix réel —
le paramètre est simplement ignoré.

**L'idempotence est un verrou, pas une vérification.** `marquerEvenement` pose le
verrou sur l'identifiant de l'événement **avant** tout effet. Un doublon n'atteint
jamais la livraison.

**La version achetée est figée.** Chaque produit porte une empreinte de ce qu'il
promet. Une commande garde la version achetée : modifier le catalogue ensuite ne
change pas ce qu'un client a déjà payé.

**L'email est un effet, jamais une condition.** Son échec est journalisé et
réessayable ; il ne retire pas l'accès. Une panne de messagerie n'efface pas un
achat payé.

**Le stockage navigateur n'entre pas ici.** `creerMagasin` écrit dans un fichier
JSON, remplaçable par Postgres ou Supabase sans toucher au reste. Le
`localStorage` du back-office reste un mode local d'affichage, pas le registre.

## Pour connecter Stripe sandbox

1. Ouvrir un sandbox dans le tableau de bord Stripe et l'autoriser pour cette
   session — **aucune clé ne transite par la conversation**.
2. Définir côté serveur, jamais dans le code :
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AURA_LIEN_SECRET`.
3. `stripe listen --forward-to localhost:PORT/webhook` fournit un
   `whsec_…` distinct de celui du tableau de bord : ne pas les confondre.
4. La route du webhook doit recevoir le **corps brut**. Tout parseur JSON placé
   avant elle casse la vérification — c'est la cause d'échec la plus fréquente.
5. Appeler `traiterEvenement(magasin, corpsBrut, entete, secret, {livemodeAttendu:false})`.

## Retour arrière

Ce module n'est branché à aucune page : le retirer n'a aucun effet sur la
vitrine. `git revert` du commit suffit, et `tests/serveur.js` disparaît du
`npm test` avec lui.
