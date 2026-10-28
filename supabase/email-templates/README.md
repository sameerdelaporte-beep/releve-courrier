# Emails d'authentification Supabase

À coller dans Supabase → Authentication → Emails → Templates :

| Modèle Supabase | Fichier | Objet suggéré |
|---|---|---|
| Magic Link | magic-link.html | Votre lien de connexion à Relève |
| Confirm signup | confirm-signup.html | Votre lien de connexion à Relève |

Pour que l'expéditeur affiché soit « Relève <contact@releve-courrier.com> » (et non « Supabase Auth »),
activer Authentication → SMTP Settings → Custom SMTP :
hôte smtp.hostinger.com, port 465, utilisateur contact@releve-courrier.com, mot de passe de la boîte,
nom d'expéditeur « Relève », adresse d'expéditeur contact@releve-courrier.com.
