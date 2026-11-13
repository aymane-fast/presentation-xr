# Étude SUS — Google Arts & Culture

**Deux liens publics, une base de données et aucun compte participant.** Site en HTML/CSS/JS avec deux fonctions Vercel et base Supabase (PostgreSQL).

## 1. Créer une base Supabase gratuite

1. Aller sur https://supabase.com et créer un compte puis **New project** (Free).
2. Dans le projet, ouvrir **SQL Editor** > **New query**.
3. Coller le contenu de `schema.sql` et cliquer sur **Run**. Ceci crée la table `public.sus_responses`.
4. Dans **Project Settings > API Keys**, récupérer la clé **Secret** (`sb_secret_...`, PAS la clé publishable) ; copier aussi l'URL du projet (dans le panneau **Connect** ou les paramètres du projet).

**Attention : ne jamais partager la clé Secret et ne jamais la mettre dans un HTML ou un dépôt public.** Les réponses sont stockées dans Supabase, pas dans les fichiers statiques Vercel.

## 2. Déployer sur Vercel (sans installation)

1. Décompresser ce ZIP ; mettre son **contenu** dans un nouveau dépôt GitHub (fichiers à la racine du dépôt). Ne pas ajouter de fichier `.env` avec des secrets.
2. Aller sur https://vercel.com > **Add New > Project**, importer ce dépôt GitHub.
3. Framework Preset : **Other** ; Root Directory : le dossier contenant `index.html` et `vercel.json` ; **pas de commande de build**.
4. Dans **Environment Variables** ajouter :
   - `SUPABASE_URL` = `https://VOTRE-PROJET.supabase.co`
   - `SUPABASE_SECRET_KEY` = votre clé **Secret** (`sb_secret_...`).
5. Déployer, ou **Redeploy** si les variables ont été ajoutées après le premier déploiement.

Les deux liens seront :

- **Questionnaire** : `https://votre-nom.vercel.app/`
- **Analyse** : `https://votre-nom.vercel.app/analyse`

## 3. Comment ça fonctionne

- Chaque personne explore d'abord **la même visite immersive** sur Google Arts & Culture (smartphone, aucun casque requis), puis complète les **10 questions SUS** et clique sur Envoyer.
- Chaque soumission est enregistrée dans `public.sus_responses` avec la réponse aux 10 questions et les sommes et score calculés **par le serveur**.
- La page `/analyse` récupère les réponses depuis l'API Vercel et affiche la moyenne, chaque score, les contributions par question, les observations et des **exports CSV/JSON**.
- Le questionnaire ne collecte aucun nom, e-mail, téléphone ou adresse IP dans notre table. La page d'analyse est **publique si son lien est connu** ; toute personne avec accès au site peut aussi soumettre des réponses. Éviter des détails personnels dans les champs libres.

## Calcul SUS

Questions 1/3/5/7/9 (impaires) : réponse − 1. Questions 2/4/6/8/10 (paires) : 5 − réponse.

`SUS = (somme des réponses impaires − somme des réponses paires + 20) × 2,5`.

Le calcul n'est **pas** un pourcentage de réussite. Un score d'environ 68 est un repère habituel, pas une frontière clinique.

## Limitations (à connaître)

- **Zéro authentification** implique qu'il n'existe pas de véritable protection contre des soumissions répétées, un spam intentionnel ou l'accès au tableau de bord. C'est adapté à un petit test de classe, pas à une collecte confidentielle.
- Le tableau affiche jusqu'à **1 000 réponses** (limite de cette démo) ; toutes restent enregistrées dans Supabase.
- Un projet Supabase Free peut être **mis en pause après faible activité (~7 jours)**. Les données sont conservées ; restaurer le projet depuis le tableau de bord Supabase.
- L'impression PDF marche depuis la page Analyse ; en local (`file://`), le formulaire s'affiche mais **l'enregistrement et l'analyse nécessitent un déploiement Vercel ou l'exécution d'un serveur approprié**.
- Les polices externes sont facultatives : si elles ne chargent pas, les polices système prennent le relais.

## Référence académique du questionnaire

Gronier, G., & Baudet, A. (2021). Psychometric evaluation of the F-SUS: Creation and validation of the French version of the System Usability Scale. *International Journal of Human–Computer Interaction, 37*(16), 1571–1582. https://doi.org/10.1080/10447318.2021.1898828

Les dix formulations sont celles du questionnaire français de votre version précédente. Pour un usage de recherche exigeant une reproduction strictement identique à la F-SUS validée, vérifier les libellés contre la version littéraire de Gronier et Baudet. Le score applique la formule originale (Brooke, 1996).
