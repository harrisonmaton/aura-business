# Aura Business — dossier de preuves en réponse à l'audit indépendant V2

Rédigé par Claude (Opus 5), 15 septembre 2026, en réponse au document
*« Audit indépendant et plan d'exécution V2 »* daté du même jour.

Ce dossier existe pour lever les deux pièces que l'audit déclare manquantes :
le compte rendu réel et la source inspectable. Les fichiers sources sont joints.

---

## 0. Périmètre — ce que ce document prouve et ne prouve pas

Ce qui est livré est **un démonstrateur commercial validé + un registre interne réel**,
pas une plateforme de commerce. Il n'y a ni backend, ni compte client, ni paiement,
ni serveur sous notre contrôle. Aucune affirmation contraire n'est faite ici.

L'audit a raison sur sa conclusion centrale : **la tranche transactionnelle doit
sortir d'Artifact.** Je ne conteste pas ce point, je le confirme.

| Élément | Statut réel |
|---|---|
| Environnement | Artifact Claude, page autonome, réseau restreint par CSP |
| Contrat runtime | `0.2.48` (vitrine) / `0.2.50` (back-office) |
| Backend propre | **Aucun** |
| Authentification visiteur | **Aucune** |
| Paiement | **Aucun**, ni test ni réel |
| Base de données | Uniquement le magasin documentaire de la plateforme, back-office seul |

---

## 1. La question bloquante : « db rend l'artifact non partageable publiquement »

L'audit classe cette affirmation **À VÉRIFIER** et la juge **DANGEREUSE si généralisée**,
au motif que la documentation publique ne l'établit pas. C'est exact : elle ne
l'établit pas. La source que j'ai utilisée n'est pas la documentation publique.

**Source primaire** — définitions de type servies par la plateforme pour le contrat
en vigueur, fichier `0.2.48/db.d.ts`, lignes 9 à 12, verbatim :

> Declare `capabilities: {db: {}}` — a declaring artifact is organization-internal
> and cannot be shared publicly, so every reader and writer is a signed-in member
> of the owner's organization.

**Corroboration**, même contrat, `0.2.48/assets.d.ts` lignes 27-28 :

> A declaring artifact is organization-internal and cannot be shared publicly.

Commande de vérification reproductible dans la session :

```
grep -n "organization-internal\|cannot be shared publicly" <contrat>/*.d.ts
```

**Portée de l'affirmation.** Elle concerne les capacités `db` et `assets`, pas
« tous les Artifacts ». L'audit a raison d'exiger cette délimitation : généralisée,
l'affirmation serait fausse. Les artifacts sans capacité déclarée ne sont pas
concernés — c'est précisément pourquoi la vitrine n'en déclare aucune.

---

## 2. Ce que je retire — affirmation excédant ma preuve

L'audit relève la phrase : *« la version actuelle ne peut littéralement pas être
ouverte par vos clients Instagram »*. **Je la retire.**

Distinction que j'aurais dû faire et que je n'ai pas faite :

| Affirmation | Statut honnête |
|---|---|
| La spécification de la capacité énonce la restriction | **CONFIRMÉ** (citation ci-dessus) |
| Un visiteur déconnecté échoue effectivement à ouvrir la page | **NON VÉRIFIÉ** — je n'ai jamais fait ce test |
| La page publiée était de fait inaccessible aux clients | **NON ÉTABLI** |

**Élément contradictoire que je dois signaler.** Les versions 2, 3 et 4 déclaraient
`db`, et l'outil de publication a pourtant rapporté `sharing public` à chaque fois.
Cette tension existait sous mes yeux au moment où j'ai écrit la phrase. Je ne l'ai
pas relevée. Deux lectures restent possibles : soit le partage public est refusé
plus tard, au moment du partage effectif, soit la page reste publique et seule la
base de données est inaccessible hors organisation. **Je n'ai pas tranché, et je
n'aurais pas dû écrire « littéralement ».**

**Ce que la décision d'architecture doit à cette incertitude : rien.** Séparer une
vitrine sans capacité d'un back-office privé est correct dans les deux lectures —
dans la première parce qu'elle évite un mur d'accès, dans la seconde parce que les
données client d'un registre commercial n'ont rien à faire dans une page publique.
La décision ne dépend pas de la résolution de l'ambiguïté. L'argumentation que j'ai
donnée pour la justifier, elle, était trop affirmative.

**Test qui tranche, non exécuté ici** (aucun second compte disponible dans cet
environnement) : publier une copie déclarant `db` avec données synthétiques,
activer le partage, ouvrir l'URL en navigation privée déconnectée puis depuis un
compte hors organisation, et consigner le comportement. À faire sur une copie,
jamais sur l'artifact portant des données.

---

## 3. Journal de recette — critère → résultat → preuve → limite

Environnement : Chromium 141.0.7390.37, Playwright 1.56.0, 15 septembre 2026.
Empreintes des sources exactes testées :

- vitrine `storefront.html` — sha256 `c5c2f467880ee51e130e8a074a7fc08260f6955fea03faddf4763dd1a6cb61bd`
- back-office `office.html` — sha256 `10bb580aafa23fdc2569e764e3317168c67dc79cae69151b31c2a0b35e7c3782`

Les pages sont testées sous une enveloppe HTML identique à celle ajoutée à la
publication (charset, `viewport`, reset), et non sous le fragment brut — une
première série de captures mobiles avait été invalidée par cet écart, puis refaite.

Journal complet des exécutions : `recette.log` (joint). Scripts : `qa.js`,
`qa_office.js`, `final.js` (joints).

### 3.1 Vitrine publique — 28 assertions, 0 échec

| Critère | Résultat | Preuve | Limite restante |
|---|---|---|---|
| Parcours de commande complet | PASS | `qa.js` : ouverture, étapes 1→3, message final contenant activité et total `115€` | Le message part par presse-papier + lien Instagram, aucun enregistrement serveur |
| Brief incomplet bloqué | PASS | assertion « brief vide bloqué » : erreur affichée, étape 2 maintenue | Validation navigateur uniquement — il n'existe pas de serveur à protéger |
| Recalcul du total avec supplément | PASS | `90€ + Express 25€ = 115€` lu dans le DOM | Prix côté client : acceptable sans encaissement, **inacceptable dès qu'il y a paiement** |
| Injection depuis un champ client | PASS | charge `"><img src=x onerror=window.__x=1>` saisie dans le champ Instagram ; `window.__x` reste indéfini | Couvre le champ vers la composition SVG. Pas d'admin, pas d'email, pas de Markdown à couvrir ici |
| Clavier : FAQ | PASS | focus `#qq1` + Entrée ouvre la réponse, `aria-expanded` mis à jour | Aucun test lecteur d'écran réel |
| Clavier : feuille de commande | PASS | focus déplacé à l'ouverture, piège à focus, Échap ferme | idem |
| Mouvement réduit | PASS | `reducedMotion:'reduce'` : seuil franchi immédiatement, `opacity:1` sur tous les blocs d'apparition | |
| Débordement horizontal | PASS | 0 px à 360 / 390 / 820 / 1440 / 1600 / 2000 px | 320 px et zoom 200 % non testés |
| Persistance carte de club | PASS | rechargement : carte toujours présente | `localStorage`, un seul appareil, **aucune valeur d'authentification** |
| Bascule de langue | PASS | FR→EN : « La carte » → « The menu » | 4 langues sur l'interface et les messages ; pas d'emails ni de support à traduire |
| Erreurs JavaScript | 0 | écoute `pageerror` + `console.error` sur toutes les vues | Seule erreur réseau : polices Google bloquées par le bac à sable, absente en production |

### 3.2 Back-office — 25 assertions, 0 échec

Le runtime de la plateforme n'existe pas en local : les chemins dépendant de la
base, de la rédaction et du téléchargement ont été exercés avec un faux runtime
injecté (`addInitScript`), **ce qui teste mon code, pas le fournisseur.**

| Critère | Résultat | Preuve | Limite restante |
|---|---|---|---|
| Lecture d'un message de commande | PASS | message réel produit par la vitrine → pack 2, total 115, `@bellanapoli`, activité, public, code `AURA-4021` | Analyseur tolérant ; format inconnu → champs à saisir à la main, signalé à l'utilisateur |
| Enregistrement et cycle de vie | PASS | création puis passage à « livrée », relecture depuis le flux temps réel | |
| Calcul du chiffre d'affaires | PASS | une commande livrée à 115 € → tuile `115€` | Arithmétique sur données saisies ; aucune réconciliation avec un encaissement réel |
| Calcul de commission | PASS | Signature livrée → `45€` dus, rattachés au code `AURA-4021` | Assiette = barème du pack. **Ni remboursement, ni litige, ni états `pending/eligible/paid/reversed`** |
| Mode dégradé sans base | PASS | page utilisable, état « Hors ligne », rédaction désactivée | |
| Rédaction assistée | PASS **sur faux fournisseur** | diffusion progressive reçue et affichée | **Aucun appel réel au fournisseur n'a été exécuté.** À déclarer PARTIAL selon la grille de l'audit |
| Remise du fichier | PASS **sur faux fournisseur** | `aura-pizzeria-napolitaine-2026-09-15.txt` transmis | idem |
| Suppression + état vide | PASS | registre revenu à l'état vide, message honnête | |

---

## 4. Ce qui n'est pas vérifié — liste franche

Les points suivants sont **MANQUANT** ou **NON APPLICABLE**, sans atténuation :

1. **Appel réel au fournisseur de rédaction** : jamais exécuté. Statut PARTIAL.
2. **Isolation client A / client B** : non applicable — il n'existe aucun compte client.
3. **Contrôles serveur sur mutations** : non applicable — il n'existe aucun serveur.
4. **Paiement, webhooks, idempotence, remboursements** : inexistants, à tous les stades.
5. **Lecteur d'écran** : non testé. Le clavier, le focus, `aria-*`, les états d'erreur
   et le mouvement réduit le sont.
6. **320 px et zoom 200 %** : non testés.
7. **Performance** : aucune mesure, ni laboratoire ni terrain. Aucune revendication.
8. **Sauvegarde / restauration** : inexistantes. Le magasin de la plateforme est
   effacé si l'artifact est supprimé — c'est un registre de travail, pas un système
   de conservation.
9. **Conformité TVA, conditions, facturation structurée belge** : non traitées.
10. **Comportement réel d'un visiteur déconnecté** : non testé (voir § 2).

---

## 5. Désaccords argumentés avec l'audit

**5.1 Sur la direction artistique proposée (section E).** L'audit propose ivoire
`#F4F1EA`, encre `#171717`, accent terre cuite `#AE3B25`, tout en écrivant lui-même
qu'« aucun diagnostic esthétique de l'existant n'est possible sans ses écrans ».
Il recommande donc une refonte d'écrans qu'il n'a pas vus. Deux objections de fond :
cette palette contredit frontalement le brief répété du commanditaire (nuit, Miami,
laiton, néon), et cette combinaison précise — crème chaud, serif éditorial, accent
terre cuite — est l'un des rendus par défaut les plus reconnaissables des interfaces
produites par IA. La direction retenue (noir teinté violet, laiton `#D9B978`, néon
réservé aux sources de lumière dans l'image, Bodoni Moda + Archivo) est un choix
assumé, pas un défaut à corriger. Captures disponibles sur demande.

**5.2 Sur la portée des « MANQUANT ».** L'audit déclare lui-même n'avoir ni dépôt,
ni URL, ni captures, ni compte rendu intégral. Ses verdicts « MANQUANT » décrivent
donc l'état de **ses** preuves, ce qu'il dit honnêtement. Ils ne constituent pas un
constat d'absence dans le produit : XSS, clavier, responsive et états dégradés ont
été testés, avec les résultats et les limites ci-dessus. Le présent dossier existe
pour convertir ces lignes en CONFIRMÉ ou en MANQUANT sur pièces.

**5.3 Sur la nature du produit.** L'audit travaille sur l'hypothèse qu'il pourrait
s'agir d'un produit musical et met en garde contre cette confusion. La mise en garde
est saine mais sans objet ici : le produit est un pack de contenu Instagram — visuels,
légendes, messages privés, bio — livré en fichier. Le son présent sur la vitrine est
une ambiance générée par synthèse dans le navigateur, étiquetée comme telle, sans
aucun fichier audio chargé. Rien n'est vendu comme audio.

**5.4 Concession sur la duplication.** L'audit note que deux produits indépendants
risquent de dupliquer prix et règles métier. **C'est exact et c'est le cas** : le
catalogue est défini deux fois, une fois par fichier, avec un commentaire le
signalant dans le back-office. C'est le coût direct de l'absence de socle commun,
et il disparaît avec la migration recommandée.

**5.5 Point que l'audit apporte et que je n'avais pas soulevé.** La facturation
électronique structurée applicable en Belgique pour les opérations B2B depuis le
1er janvier 2026 : à vérifier avant toute vente B2B, un PDF ne suffit pas. Signalé
comme angle mort réel de mon travail.

---

## 6. Pièces jointes

| Fichier | Contenu |
|---|---|
| `storefront.html` | Source complète de la vitrine publique, inspectable |
| `office.html` | Source complète du back-office |
| `recette.log` | Sortie brute des trois suites, horodatée |
| `qa.js`, `qa_office.js`, `final.js` | Scripts de test, réexécutables |

Aucun secret, aucune clé, aucune donnée personnelle ne figure dans ces fichiers.
Les deux pages sont autonomes : ouvertes dans un navigateur, elles fonctionnent
sans installation, à l'exception des capacités de plateforme du back-office.

---

## 7. Position sur la suite

Je suis d'accord avec la décision centrale de l'audit : **la tranche transactionnelle
doit être construite hors Artifact**, dans une application versionnée avec backend,
avant toute collecte de données client ou tout encaissement. Ce qui existe
aujourd'hui garde une utilité précise et limitée : une vitrine validée qui peut
servir de référence visuelle et de test de marché sans paiement, et un registre
interne utilisable immédiatement.

Le premier lot pertinent reste **P0.0 de l'audit** : inventaire réel, dépôt ou export,
offre exacte, formats, droits, délais, révisions et exclusions arrêtés. Le prix, la
promesse et les droits ne sont toujours pas définis ; sans eux, ni le catalogue ni la
production ne peuvent être figés honnêtement.
