# État réel du projet

Mis à jour le 17 septembre 2026, à la main, à partir de mesures — pas
d'impressions.

Quatre colonnes, parce que les confondre est la façon la plus simple de se
mentir :

| | Ce que ça veut dire |
|---|---|
| **Conçu** | Décidé et écrit quelque part. Ne prouve rien. |
| **Implémenté** | Le code existe et s'exécute. |
| **Testé** | Un contrôle échoue si on casse la chose. Vérifié dans les deux sens. |
| **Publié** | Accessible à un visiteur, hors de cette machine. |

---

## 1. Tableau d'état

| Élément | Conçu | Implémenté | Testé | Publié |
|---|:--:|:--:|:--:|:--:|
| Vitrine (bandes, carte, secteurs, club, questions) | ✅ | ✅ | ✅ | ⚠️ preview seulement |
| Onze scènes Miami (SVG déterministes) | ✅ | ✅ | ✅ | ⚠️ preview seulement |
| Showroom 3D (Three.js r160) + repli à plat | ✅ | ✅ | ✅ | ⚠️ preview seulement |
| Créations de démonstration (séries + collection Street) | ✅ | ✅ | ✅ | ⚠️ preview seulement |
| Back-office (registre, stock, alertes) | ✅ | ✅ | ✅ | ❌ |
| Chaîne commande → paiement → livraison | ✅ | ✅ | ⚠️ **simulée** | ❌ |
| Paiement Stripe réel | ✅ | ❌ | ❌ | ❌ |
| Webhook de confirmation | ✅ | ❌ | ❌ | ❌ |
| Hébergement | ❌ | ❌ | ❌ | ❌ |
| Bibliothèque de prompts (`PROMPTS/`) | ✅ | ✅ | ❌ | ❌ |

**Rien n'est publié.** Ce qui existe est une *preview* construite dans le
dépôt et consultable en local. Aucun visiteur extérieur ne peut atteindre ce
site aujourd'hui.

---

## 2. Ce qui est bloqué, et par quoi

### Stripe — bloqué, et ça ne dépend pas du code

Vérifié : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` et
`STRIPE_WEBHOOK_SECRET` sont **absentes** de l'environnement (présence
vérifiée, valeurs jamais affichées ni écrites).

Trois choses manquent, dans cet ordre :

1. un compte sandbox authentifié depuis l'interface officielle Stripe ;
2. un serveur de test **joignable depuis l'extérieur** — un webhook ne peut
   pas appeler une machine qui n'a pas d'adresse publique ;
3. les clés de test posées en variables d'environnement, jamais dans le
   dépôt.

Tant que ces trois points ne sont pas réunis, le paiement reste bloqué. Le
mode réel n'est pas touché, aucun paiement n'est lancé, aucun compte bancaire
n'est créé.

**Ce que « testé : simulée » veut dire exactement.** Les 12 contrôles de
parcours construisent et signent un paiement *localement*, puis vérifient que
la commande passe à livrée, qu'un accès est accordé, que le client qui a payé
reçoit exactement les fichiers de sa collection et qu'un autre client ne peut
pas ouvrir le lien. C'est une vraie preuve de la **logique**. Ce n'est
**aucune** preuve que Stripe accepte ce flux : aucune connexion à Stripe
n'est établie, et les tests le disent eux-mêmes en le répétant à chaque
exécution.

### Une seule photographie

Le dépôt contient **une** photographie utilisable (un plat de pâtes). Les
quatre pièces de la série restaurant la réutilisent toutes les quatre.

Conséquence directe : la série de démonstration montre la **mise en page**,
pas la variété d'un vrai pack. Un client qui recevrait ça se plaindrait, à
raison. Ce n'est pas réparable par du code — il faut des images.

### Prix : le mandat et le catalogue ne disent pas la même chose

| | Mandat V∞ | `src/catalog.json` (ce que le site affiche) |
|---|---|---|
| Packs sur brief | 149 € / 399 € / 2 490 € | 50 € / 90 € / 150 € / 250 € |
| Collections | — | 40 € / 80 € / 120 € / 200 € |

**Je n'ai pas substitué les prix du mandat.** Changer un prix public est une
décision commerciale, pas un détail réversible d'implémentation : elle engage
ce qui sera facturé. Le site affiche donc le catalogue actuel. Si les prix du
mandat sont les bons, il faut le dire explicitement et `src/catalog.json`
sera la seule chose à modifier.

### Collections annoncées sans fichiers

Une seule collection sur quatre a des fichiers (Street, 4 visuels + 4 textes
+ mode d'emploi, 9 fichiers). Les trois autres sont annoncées et **non
commandables** : ni bouton, ni vignette, ni promesse de livraison. C'est
volontaire — une belle couverture au-dessus d'un dossier vide fait la vitrine
d'un produit qui n'existe pas.

---

## 3. Les 92 défauts visuels, par gravité

Le mandat demandait : *quels défauts, quelle gravité, lesquels restent
visibles ?* Voici la réponse, mesurée par `npm run audit` (61 règles
déterministes, aucun LLM, aucun appel réseau) sur **8 vues** : deux pages ×
quatre largeurs (320, 390, 768, 1440).

92 défauts au total. Le même défaut compté sur quatre largeurs compte quatre
fois — c'est pour ça que le chiffre paraît gros. Il y a en réalité **une
dizaine de motifs distincts**.

| Nb | Motif | Gravité | Visible par un visiteur ? |
|---:|---|---|---|
| 20 | `kicker-above-heading` | cosmétique | Non. Une sur-ligne au-dessus d'un titre : convention critiquée, pas un défaut d'usage. |
| 16 | `undersized-ui-text` | **réelle** | Oui — **back-office uniquement**. Texte fonctionnel à 10,6 px. |
| 12 | `layout-transition` | cosmétique | Non. Transitions sur des propriétés de mise en page. |
| 12 | `wide-tracking` | faible | Marginalement. Interlettrage large sur du texte courant. |
| 12 | `tiny-text` | **réelle** | Oui — **back-office uniquement**. Corps à 11,8 px. |
| 6 | `repeated-container-text` | **aucune** | Oui, et c'est voulu : les quatre créations d'une série portent l'enseigne du même commerce. Justifié dans `outils/reference-visuelle.json`. |
| 4 | `ai-color-palette` | faible | Non. Palette jugée typique du générique. |
| 4 | `dark-glow` | cosmétique | Non. Ombre sans décalage. |
| 4 | `all-caps-body` | faible | Marginalement. Capitales sur du texte long. |
| 2 | `line-length` | faible | Oui, au back-office : ~145 caractères par ligne. |

**Ce qu'il faut retenir :** les seuls défauts qui gênent réellement quelqu'un
sont les **30 du back-office** (texte trop petit, lignes trop longues) — une
page que seul l'exploitant voit. Côté vitrine, il ne reste aucun défaut de
lisibilité mesuré ; ce qui subsiste relève de conventions de style
discutables, pas d'un obstacle à l'usage.

Le compte est figé dans `outils/reference-visuelle.json` : tout défaut qui
revient fait sortir la commande en code 1. Depuis cette version, geler la
référence **conserve les justifications écrites à la main** — sinon, figer
revient à faire disparaître un défaut sans jamais l'avoir jugé.

---

## 4. Ce que couvrent les 136 contrôles

| Suite | Nb | Ce qu'elle prouve |
|---|---:|---|
| `tests/serveur.js` | 26 | Prix pris au catalogue et non au message, signature, états de commande, accès. |
| `tests/recette.js` | 83 | Rendu, prix affichés, clavier, mobile, aucun appel tiers, honnêteté des promesses. |
| `tests/parcours-complet.js` | 12 | Chaîne complète — **en simulation locale**, la suite le rappelle elle-même. |
| `tests/showroom.js` | 15 | Scène WebGL réelle, repli sans WebGL, mouvement réduit, **téléphone**. |

### Ce que ces contrôles ne prouvent pas

- Que Stripe accepte le flux de paiement.
- Qu'un visiteur extérieur peut atteindre le site.
- Que le produit vaut son prix. **Aucun client n'a acheté, ni même vu ce
  site.** « Ça vaut 40 € » reste une appréciation interne tant que personne
  n'a payé.
- Que le contenu d'un pack tient face à un vrai commerce : la série de
  démonstration tourne autour d'une seule photographie.

---

## 5. Deux leçons de méthode payées cette semaine

**Compter dans le DOM n'est pas mesurer ce qui s'affiche.** Sur téléphone, le
panneau « ce que vous recevez » était **entièrement vide** — 130 contrôles au
vert, aucune erreur JS. Ils comptaient les pièces présentes dans le document
au lieu de vérifier qu'on les voyait.

**Un contrôle d'affichage doit être vérifié dans les deux sens.** Le contrôle
écrit pour rattraper ce défaut a échoué deux fois avant de tenir :

1. un quadrillage de `elementFromPoint` passait **avec** le défaut — le
   survol traverse les éléments à `opacity:0`, cliquables mais invisibles ;
2. comparer deux captures après avoir **retiré** le panneau passait aussi :
   la hauteur s'effondrait, et les 47 % d'écart mesuraient le réagencement,
   pas la peinture.

La version retenue masque en `visibility:hidden`, qui conserve la mise en
page, et compare les pixels décodés : **80 % d'écart avec le correctif, 0 %
sans**. Un contrôle qu'on n'a pas vu échouer ne prouve rien.

---

## 6. La suite, par ordre d'utilité

1. **Des images.** C'est le seul point qui bloque la qualité du produit
   lui-même, et aucune ligne de code ne le résout.
2. **Un hébergement.** Sans adresse publique : pas de webhook, pas de Stripe,
   pas de visiteur, pas de vente.
3. **Trancher les prix.** Mandat ou catalogue — il faut un seul chiffre.
4. **Composer les trois collections manquantes**, ou les retirer de
   l'affichage.
5. **Corriger les 30 défauts du back-office** (texte à 10–12 px, lignes à
   145 caractères).

---

*Aucune dépense n'a été engagée : pas de rendu payant, pas d'abonnement, pas
de crédit consommé, pas de publication en production.*
