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

## Images
- `img/<slug>.webp` : détourées depuis le visuel de sélection fourni. Basse définition d'origine : **à remplacer par de vraies photos** des pièces.
- `img/bg-hero.webp`, `img/bg-night.webp` : générées (ElevenLabs, gpt-image-2), sans texte ni logo.
- `img/trio-signature.webp` : extrait du visuel d'intro fourni.

## Mise en ligne
N'importe quel hébergeur statique (Netlify, Vercel, GitHub Pages, Cloudflare Pages) : publier le dossier `watches/` tel quel.
