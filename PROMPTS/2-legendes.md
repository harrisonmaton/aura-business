# 2 — Légendes et accroches

Produit les textes qui accompagnent les visuels. Un pack de 12 visuels
demande 12 légendes qui ne se ressemblent pas : c'est là que le contenu
« généré » se trahit, quand les douze commencent par la même tournure.

---

## Prompt principal

> Tu écris les légendes Instagram d'un commerce local. Voici sa fiche :
>
> ```
> [COLLER ICI LA FICHE CLIENT REMPLIE]
> ```
>
> Écris **{N}** légendes pour les publications suivantes :
> `{LISTE_DES_SUJETS}`
>
> Contraintes, toutes obligatoires :
> - Langue : français, vouvoiement{TUTOIEMENT_SI_AUTORISE}.
> - Longueur : entre 120 et 320 caractères, espaces comprises.
> - **La première phrase doit pouvoir se lire seule** : Instagram coupe le
>   reste derrière « … plus ».
> - Une seule action par légende, celle de la fiche : `{ACTION}`.
> - Les douze premières phrases doivent avoir **douze structures
>   différentes**. Avant de me répondre, vérifie-le et corrige les doublons.
> - Aucun des `{INTERDITS}`.
> - Aucun chiffre, prix ou horaire qui ne figure pas dans la fiche.
> - Pas plus d'un émoji par légende, et seulement s'il ajoute une
>   information. Zéro par défaut.
> - Pas de hashtag dans le corps : je les gère à part.
>
> Pour chaque légende, donne dans cet ordre :
> `NUMÉRO — SUJET — LÉGENDE — [1 ligne : quel fait de la fiche elle utilise]`
>
> Si un sujet ne peut pas être traité sans inventer un fait, écris
> `MANQUE : <la question à poser au client>` au lieu de la légende.

---

## Pourquoi cette dernière consigne compte

Sans elle, un sujet mal briefé revient avec une légende plausible et fausse —
un horaire, une origine, une quantité. Le refus explicite est l'unique manière
de faire remonter le trou au lieu de le combler. C'est aussi ce qui distingue
une méthode d'un générateur : **le livrable inclut les questions restantes.**

---

## Variantes courtes

**Accroche seule** (pour les carrousels, où le texte est dans l'image) :

> Même fiche. Donne **{N}** accroches de **5 mots maximum**, en capitales,
> qui tiennent dans un carré sans être coupées. Chacune doit fonctionner
> sans la légende. Interdits : les questions rhétoriques, les jeux de mots
> sur le nom de l'enseigne, et `{INTERDITS}`.

**Déclinaison d'une légende qui a marché** :

> Voici une légende qui a bien fonctionné pour ce commerce :
> « {LEGENDE_SOURCE} ».
> Écris 4 variantes qui gardent **la structure** et changent **le sujet**.
> Ne réutilise ni les mêmes mots-clés ni le même premier mot.

---

## Hashtags — à part, et volontairement peu

> Pour `{METIER}` à `{VILLE}`, propose 12 hashtags répartis ainsi :
> 4 de lieu (ville, quartier), 4 de métier (précis, pas génériques),
> 4 de moment ou de produit. Exclus tout hashtag à plus de 5 millions de
> publications : le commerce y est invisible. Donne pour chacun l'ordre de
> grandeur du volume, et dis-moi lesquels tu n'as pas pu vérifier.

Trente hashtags génériques ne servent à rien pour un commerce de quartier.
Douze ciblés valent mieux, et il faut le dire au client qui en attend trente.

---

## Liste de contrôle avant livraison

- [ ] Lire **uniquement les premières phrases**, à la suite. Si deux se
      ressemblent, refaire les deux.
- [ ] Chaque chiffre, prix, horaire, nom propre est dans la fiche.
- [ ] Une seule action par légende, et c'est `{ACTION}`.
- [ ] Aucun `{INTERDITS}`.
- [ ] Les `MANQUE :` sont remontés au client, pas supprimés en silence.
- [ ] Lire à voix haute : ce qui ne se dit pas ne se publie pas.
