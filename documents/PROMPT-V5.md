# AURA BUSINESS — BRIEF COMPLET POUR LA V5

Document autonome. Il contient tout ce qu'il faut savoir sur Aura Business pour
concevoir une version 5 sans avoir lu une seule conversation antérieure.

Rédigé le 15 septembre 2026, à l'état du commit `f29794f`.
Tout ce qui est marqué **[VÉRIFIÉ]** a été testé et le journal est joint.
Tout ce qui est marqué **[NON DÉFINI]** n'a pas de réponse à ce jour.
N'invente rien pour combler un **[NON DÉFINI]**. Dis-le et propose la mesure.

---

## 1. LE PRODUIT, SANS AMBIGUÏTÉ

Aura Business vend des **packs de contenu Instagram prêts à publier** à des
commerces et indépendants. Le client paie une fois, reçoit un fichier, colle,
publie. Ce n'est ni une agence, ni du community management, ni un abonnement,
ni un logiciel.

**Il n'y a aucun produit audio ni vidéo.** Le vocabulaire « Miami, nocturne,
cinématographique » décrit la direction artistique du site de vente, pas la
marchandise. Le seul son du site est une ambiance synthétisée par le navigateur,
annoncée comme telle. Ne construis aucune hypothèse de droits musicaux.

### Catalogue — source unique, à ne pas modifier sans décision explicite

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

Suppléments : bio +15 € (pack n°1 seulement, les autres l'incluent), 5 messages
de plus +20 €, 5 stories de plus +20 €, express 24 h +25 €.

Les deux catalogues ont des numérotations distinctes. **Confondre « n°2 Night à
80 € » et « n°2 Signature à 90 € » a déjà été un bug réel.** Le champ `kind`
existe pour ça et un test le protège.

### Parcours réel, aujourd'hui

```
site → choix d'un numéro → brief en 3 lignes → message composé
     → dialogue explicite : le client copie le message
     → il l'envoie en privé à @polakpl_f44
     → LA MAISON confirme prix et délai              [humain]
     → LE CLIENT PAIE DANS LA CONVERSATION           [humain, hors site]
     → production                                     [humain, assisté par IA]
     → livraison du fichier en message privé          [humain]
```

**Rien n'est encaissé sur le site, à aucun stade, ni en test ni en réel.** Le
site est un catalogue et un compositeur de message. Ne décris jamais l'inverse.

---

## 2. CE QUI EXISTE ET FONCTIONNE **[VÉRIFIÉ]**

Deux pages autonomes, publiées, testées au commit `f29794f` — 26 contrôles verts,
0 erreur JavaScript, journal joint (`recette.log`).

**La vitrine publique** (151 Ko + une image de 137 Ko en fichier séparé) :
direction artistique nocturne Miami, hero photographique, quatre langues
(FR/EN/ES/IT), catalogue des huit offres, parcours de commande en trois étapes
avec validation, aperçu visuel recomposé à partir du compte du client,
Social Club avec carte locale et lien de parrainage, FAQ, navigation mobile.

**Le back-office privé** : registre des commandes qui lit automatiquement le
message reçu en privé (les deux formats, brief et collection prête), cycle de vie
nouveau → confirmée → production → livrée, chiffres calculés uniquement sur les
commandes réelles, commissions par code de parrainage, et un assistant qui rédige
la première version des textes du livrable.

### Points techniques déjà réglés — ne pas les refaire

- débordement horizontal : nul à 320, 360, 390, 414, 430, 760, 1440, 1600, 2000 px ;
- bouton de menu mobile atteignable partout, sélecteur de langue déplacé dans le
  panneau sur téléphone ;
- presse-papier vérifié avec repli dans le dialogue et message d'échec réel ;
- aucune redirection automatique vers Instagram : le client voit et copie ;
- injection XSS depuis les champs client : testée avec une charge réelle, bloquée ;
- codes de parrainage tirés par `crypto.getRandomValues`, format validé ;
- carte locale validée à la lecture, un clic sur une mission n'accorde aucun XP ;
- image externalisée, recompressée, cacheable ; page passée de 472 à 151 Ko ;
- catalogue centralisé dans `catalog.json`, test automatique contre la divergence ;
- la recette échoue en code 1 sur une assertion **ou** une erreur JavaScript.

---

## 3. CE QUI N'EXISTE PAS

Pas de paiement, ni test ni réel. Pas de compte client. Pas de backend, pas de
serveur. Pas d'email automatique. Pas d'analytics — seulement des points de
branchement inertes. Pas de sauvegarde. Pas de conditions générales ni de
mentions de TVA. Aucun appel réel au fournisseur de rédaction n'a jamais été
exécuté (testé avec un faux fournisseur uniquement).

### Deux blocages majeurs, à traiter avant toute chose

**A. Les collections prêtes n'ont aucun fichier.** Le site affiche « Déjà prêt —
livraison directe » et vend Night à 80 €. Zéro visuel, zéro texte n'existe pour
Street, Night, Heat ou House. Si quelqu'un paie ce soir, il n'y a rien à
envoyer — et décrire un produit comme immédiatement disponible alors qu'il
n'existe pas expose le vendeur dans l'UE. Deux issues : produire réellement les
44 visuels et leurs textes, ou retirer la section. **[NON DÉFINI]**

**B. Aucun pack n'a jamais été chronométré.** Le temps réel de production d'un
Signature à 90 €, support et reprises compris, est inconnu. Sans ce chiffre :
aucune marge calculable, aucun prix plancher défendable, aucune capacité
hebdomadaire connue, aucune décision d'automatisation fondée. **[NON DÉFINI]**

### Les sept autres inconnues commerciales **[NON DÉFINI]**

Droits cédés au client · nombre de révisions incluses · point de départ exact du
délai (paiement ? brief complet ?) · exclusions · procédure en cas d'échec ou de
remboursement · sort d'une commande payée dont le client ne répond plus · entité
vendeuse, TVA, conditions générales.

---

## 4. DÉCISIONS DÉJÀ PRISES — ne pas les rouvrir sans raison nouvelle

1. **Deux produits séparés.** Une page qui déclare une base de données sur cette
   plateforme devient interne à l'organisation et non partageable publiquement
   (source : définitions de types de la plateforme, contrat 0.2.48). La vitrine
   ne déclare donc aucune capacité et reste publique ; le back-office est privé.
2. **Aucun envoi automatique de message privé.** L'API officielle d'Instagram ne
   fournit pas de liste de prospects et ses conditions interdisent la collecte
   automatisée. La prospection réaliste est : liste approuvée → qualification →
   brouillon personnalisé → validation humaine → envoi manuel.
3. **Aucune preuve fabriquée.** Les notes et avis inventés ainsi qu'un compteur
   de membres simulé ont été retirés du site. Les faux avis sont interdits dans
   l'UE. Pas de témoignage, de statistique, d'étude de cas ou d'avant/après
   inventé, jamais.
4. **La direction artistique nocturne Miami / art déco / laiton est retenue.**
5. **La migration hors de la plateforme d'artifacts** est nécessaire avant tout
   encaissement, compte client ou donnée personnelle — mais après la mesure du
   point B, pas avant.

---

## 5. CE QUE JE DEMANDE POUR LA V5

Conçois la version 5 en respectant ce qui précède. Priorité à la clarté
commerciale sur l'effet visuel : le visiteur doit comprendre en moins de dix
secondes ce qui est vendu, à quel prix, dans quel délai, et quelle est l'action
suivante.

Livrables attendus :

1. **Fiche produit complète pour les huit offres** : contenu exact, prix, délai,
   nombre de révisions, droits cédés, exclusions, ce qui n'est pas inclus. Si une
   information manque, écris **[À DÉCIDER PAR LE PROPRIÉTAIRE]** — c'est la
   réponse honnête, pas une invention.
2. **Direction artistique V5** : palette avec rôles et contrastes mesurés,
   typographies, grille desktop et mobile, traitement des miniatures des huit
   offres, motion sobre, respect du mouvement réduit, poids maximal par page.
3. **Architecture des écrans** : accueil, fiche pack, brief, remise du message,
   espace de suivi, back-office.
4. **Plan de production des collections prêtes** : que faut-il réellement
   produire pour pouvoir vendre Street, Night, Heat et House.
5. **Modèle économique à variables**, pas de fiction : ce qu'il faut mesurer,
   les formules, les seuils de décision. Pas de prix « optimal » déduit d'une
   intuition.
6. **Ce qui doit rester humain**, ce qui peut être assisté, ce qui peut être
   automatisé — en justifiant par le gain de temps réel, pas par la mode.

### Interdictions

Aucune garantie de revenu. Aucun chiffre, avis, prospect, conversion, témoignage
ou capture inventés. Aucune fonctionnalité annoncée comme branchée si elle ne
l'est pas. Aucun visuel présenté comme un livrable client s'il s'agit d'une
étude d'ambiance. Aucune réutilisation de visage, logo, son, texte ou interface
appartenant à un tiers.

### Ce qui ferait perdre du temps

Une quatrième refonte complète avant que le point B soit mesuré. Un organigramme
de treize agents pour une activité qui n'a pas encore de client. Une migration
d'infrastructure avant de savoir si le prix tient. Un système de prospection
automatique qui ne peut pas exister légalement.

---

## 6. PIÈCES JOINTES

| Fichier | Contenu |
|---|---|
| `source/vitrine.html` | Page publique complète, autonome |
| `source/back-office.html` | Registre privé complet |
| `source/hero.webp` | Image d'accueil, 137 Ko |
| `source/catalog.json` | Catalogue, source unique |
| `apercu/` | Les mêmes pages, ouvrables hors ligne d'un double-clic |
| `tests/` | Recette Playwright réexécutable, code 1 si échec |
| `tests/recette.log` | Journal daté, rattaché au commit `f29794f` |
| `git/aura-business.bundle` | Dépôt git complet, clonable et vérifiable |
| `documents/` | Brief produit, dossier de preuves, fiche de chronométrage |

Vérification indépendante :

```
git clone aura-business.bundle aura && cd aura
npm install && npx playwright install chromium && npm test
echo $?        # 0 = tout vert, 1 = au moins un contrôle rouge
```
