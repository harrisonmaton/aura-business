# Aura — étude concurrentielle

**Version 2 — corrigée le 17 septembre 2026.** La version 1 contenait deux
erreurs de prix et une conclusion trop forte. Les corrections sont signalées
comme telles, pas effacées.

---

## Note de méthode, et pourquoi la v1 s'est trompée

Les accès directs aux sites concurrents sont **bloqués par le proxy réseau** de
cet environnement (`durable.com`, `gohighlevel.com` : `EGRESS_BLOCKED`). La v1
s'est donc appuyée sur des analyses tierces.

**C'était la mauvaise méthode pour des tarifs.** Une grille change tous les
trimestres ; un article de comparaison, lui, garde son ancienne valeur et reste
indexé. Deux chiffres sur quatre étaient faux.

Règle retenue : **un prix n'est fiable que lu sur la page officielle du
vendeur.** Tout le reste est indicatif et doit être étiqueté comme tel.

Dans ce document : `[officiel]` = relevé sur la page du vendeur par Harrison.
`[secondaire]` = analyse tierce, à revérifier.

---

## Corrections de la v1

| Ce que disait la v1 | Réalité | Effet |
|---|---|---|
| Durable Grow à **$99/mois** | **$49/mois** (≈ $41 annuel) `[officiel]` | ⚠️ La conclusion « il y a de la place au-dessus de 29 € » s'appuyait dessus. **Invalide.** |
| Podium à **$399–800/mois** | **Aucun prix public — devis obligatoire** `[officiel]` | Les montants viennent d'analyses tierces `[secondaire]`. Ne peuvent pas servir de base. |
| « Personne ne sert le marché entre 30 € et 400 € » | Faux | Square, SumUp, Odoo, Fresha occupent cette bande. **Affirmation retirée.** |

**Ce qui reste valide :** HighLevel $97 / $297 / $497, et Wix Light ~$17,77 ·
Core ~$29,77 · Business ~$39,77 · Elite ~$159,77 (variable selon pays et
périodicité).

---

## Le paysage réel

| Concurrent | Prix | Client visé | Job principal |
|---|---|---|---|
| **Durable** | Free · Launch **$25** · Grow **$49** (≈$22/$41 annuel) `[officiel]` | Indépendant, très petite structure | Site + CRM léger, monté vite |
| **Wix** | ~$17,77 → ~$159,77 `[officiel]` | Tout public | Construire un site soi-même |
| **Square** | Online Plus **≈25 €/mois** · Appointments Plus **≈19 €/mois** (FR) `[officiel]` | Commerce avec encaissement | Encaisser + réserver |
| **SumUp** | **Aucun abonnement** · 1,69 % par transaction (0,99 % avec plan £19/mois) · lecteur ≈39 € `[secondaire]` | Commerce de terrain | Encaisser une carte |
| **Odoo** | ≈**24,90 $/utilisateur/mois** (Standard) `[officiel]` | PME structurée | ERP : gestion, compta, stock |
| **Fresha** | ≈**19,95 $/mois** (indépendant) `[officiel]` | Beauté, bien-être | Réservation + fiches clients |
| **HighLevel** | **$97 / $297 / $497** `[officiel]` | Agences marketing | Revendre un système sous sa marque |
| **Podium** | **Devis** `[officiel]` | Commerce local US, souvent multi-sites | Demandes → conversation → avis → paiement |

Sources : [tech.co — Wix](https://tech.co/website-builders/wix-pricing) ·
[ghlexperts — HighLevel](https://www.ghlexperts.com/gohighlevel-plans-pricing) ·
[SumUp IE — compte pro](https://www.sumup.com/en-ie/business-account/pricing/) ·
[joinstored — frais SumUp](https://www.joinstored.com/blogs/sumup-pricing-explained) ·
[Fresha — tarifs](https://www.fresha.com/pricing) ·
[Square — Appointments](https://squareup.com/us/en/appointments)

---

## La bonne question : que reste-t-il à faire au commerçant ?

Comparer les fonctionnalités ne mène nulle part — tout le monde a une liste plus
longue qu'Aura. **La question utile est : une fois l'abonnement payé, quel
travail reste-t-il à faire soi-même ?**

| Concurrent | Ce qu'il donne | Ce qui reste à faire au commerçant |
|---|---|---|
| **Wix** | Un éditeur et des gabarits | **Tout.** Choisir, écrire, structurer, décider de ce qu'est une bonne page pour son métier. |
| **Durable** | Un site généré vite | Relire, corriger, brancher le reste. Générique par construction : rien ne sait que c'est un camion de glace. |
| **Square / SumUp** | L'encaissement, très bien fait | Toute la partie « être trouvé et recontacté ». Ce ne sont pas des concurrents sur notre job. |
| **Odoo** | Un ERP complet | Le paramétrer. C'est un métier. Hors de portée d'un glacier ambulant. |
| **Fresha** | La réservation, bien faite, pour un secteur | Rien si on est un salon. Tout si on est un food truck : ce n'est pas notre vertical. |
| **HighLevel** | Une puissance énorme | **Construire le système.** Funnels, automations, pipelines — c'est fait POUR des agences, par des gens qui savent. |
| **Podium** | Le résultat, proche du nôtre | Passer un appel commercial et payer un tarif d'entreprise américaine. |

### Là est l'avantage d'Aura

> Les autres vendent des **outils** qu'il faut savoir configurer.
> Aura livre une **configuration déjà faite pour un métier**.

Un glacier ambulant ne doit pas apprendre ce qu'est un CRM, un tunnel ou un
pipeline. Il doit recevoir : son menu, son emplacement, son formulaire
d'événement, son WhatsApp branché, son QR d'avis, ses demandes, sa page mobile.

**Positionnement retenu, à tester :**
*Aura — le système déjà construit pour votre métier.*

Pas « un meilleur créateur de sites ». Ce terrain est perdu d'avance : Wix Light
à $17 et vingt ans d'avance en référencement.

---

## Ce qu'Aura ne doit PAS essayer de battre

Décision qui économise des mois :

- **SumUp / Square sur le paiement** — c'est leur métier, ils ont le matériel et
  les taux. À terme, **s'intégrer**, pas remplacer.
- **Odoo sur la gestion et la comptabilité.**
- **Canva sur le design.**
- **Wix sur l'éditeur.**
- **HighLevel sur la profondeur fonctionnelle.**

Aura les bat sur une seule chose : **« je ne veux rien configurer ».**

---

## PRICING — hypothèse conservée, rien n'est figé

| Plan | Prix |
|---|---|
| FREE | 0 € |
| **LAUNCH** | **29 €** |
| PRO | 59 € |
| GROWTH | 119 € |
| AGENCY | futur, non construit |

**LAUNCH est maintenu.** La v1 recommandait de le supprimer, sur la base d'un
Durable Grow à $99 qui n'existe pas. Avec Grow à $49, l'argument tombe.

Condition pour que LAUNCH tienne : il ne doit **jamais** être présenté comme un
site. C'est un kit opérationnel — page, QR, demandes, WhatsApp — déjà branché.
Comparé à un créateur de sites, il perd ; comparé à « rien n'est configuré chez
moi », il gagne.

Aucun prix n'est final. Ils seront tranchés avec de l'usage réel, des coûts
mesurés, des entretiens clients et du churn — pas avec une grille concurrente.

---

## Ce que cette étude ne dit toujours pas

- **L'effort de configuration n'est pas sourçable.** C'est pourtant l'axe
  central de notre avantage. Aucune recherche ne donne « combien de temps pour
  configurer Fresha ». Seul moyen honnête de le savoir : **s'inscrire
  soi-même** chez deux ou trois concurrents et chronométrer. À faire avant de
  bâtir une promesse publique dessus.
- **Aucune donnée de rétention ni de churn** : personne ne les publie.
- **Aucun chiffrage du marché européen** de la restauration mobile.
- **Aucune intention d'achat mesurée.** Personne n'a encore dit qu'il paierait.

## Première cible commerciale

Europe · EUR · FR/EN/ES. Architecture internationale dès maintenant,
**expansion géographique après la preuve produit.**

## Revérification

Avant tout prix public, et au plus tard dans 3 mois — **sur les pages
officielles**, pas par recherche.
