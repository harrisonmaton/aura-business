# AURA WATCHES — showroom privé

Site statique, sans panier, sans paiement, sans aucun prix affiché. La vente se fait en message privé sur Instagram.

- `data/modeles.json` : **source unique**. Handle Instagram, zones de remise, les dix modèles.
  Pour ajouter une caractéristique **confirmée**, remplir `specs` (`mouvement`, `verre`, `materiaux`, `diametre`, `etancheite`).
  Quand `specs` est vide, la fiche l'indique au lieu d'inventer.
- `build.js` : génère `index.html` et `montre/<slug>.html`. Lancer `npm run build:watches`.
- `assets/aura.js` : « Demander le prix » copie un message prêt à envoyer, affiche un toast, et le lien natif
  ouvre `https://www.instagram.com/polakpl_f44/`. Rien n'est envoyé automatiquement : Instagram ne le permet pas.
- `tests/watches.js` (`npm run test:watches`) : sort en code 1 si un prix, une trace fournisseur, un panier ou un autre lien
  Instagram apparaît, ou si la copie et l'ouverture du profil échouent (bureau, iPhone, navigateur Instagram), ou si une page déborde à 360 px.

## Règle produit
Montres custom, dont des Seiko mods **uniquement** quand la pièce est réellement montée sur base ou mouvement Seiko
(champ `specs.base`). Aucune pièce présentée comme une montre d'une autre maison, aucun logo ni marquage de marque tierce
(le test échoue si un nom de manufacture apparaît). La pièce remise doit correspondre à celle montrée : tant qu'un visuel
est un rendu (`"visuel": "illustration"`), la fiche l'annonce ; passer à `"reelle"` quand il est remplacé par une photo de la vraie pièce.

## Images
- `img/<slug>.webp` : photo de la pièce, détourée sur fond sombre 4:5 (1664×2080). Uniquement des cadrans sans marquage de marque tierce.
  Tant qu'un modèle n'a pas sa photo, la carte et la fiche affichent un cartouche « Photo en préparation ».
  `npm run build:watches` liste les photos manquantes.
- Les prompts des 18 packshots sont prêts dans le flow ElevenLabs « AURA WATCHES — packshots » : même préfixe de style, seule la description de la montre change.
- `img/bg-hero.webp`, `img/bg-night.webp` : générées, sans texte ni logo.
- CARRÉ IVORY et OCEAN BLUE : photos transmises par le propriétaire (`"visuel": "reelle"`). Vérifier l’autorisation écrite de réutilisation auprès de l’atelier.

## Mise en ligne
N'importe quel hébergeur statique (Netlify, Vercel, GitHub Pages, Cloudflare Pages) : publier le dossier `watches/` tel quel.
