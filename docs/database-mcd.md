# Audit BDD vs MCD - Ramene ta Poire

## General

### `roles`

Roles applicatifs.

- `id` : identifiant du role.
- `name` : role utilisateur (`USER`, `HOST`, `ADMIN`).
Oui, pour roles.name, c’est bien un enum en BDD.

### `users`

Compte utilisateur principal : connexion, profil public, role, infos personnelles.

- `id` : identifiant utilisateur.
- `pseudo` : pseudo public optionnel.
- `email` : email unique de connexion.
- `phone` : telephone optionnel unique.
- `password_hash` : mot de passe chiffre, nul pour certains providers OAuth.
- `first_name`, `last_name` : prenom / nom.
- `profile_photo_url` : avatar utilisateur.
- `city`, `country` : localisation affichee dans le profil.
- `bio` : description du profil.
- `birth_date` : date de naissance.
- `email_verified_at` : date de verification email.
Pour email_verified_at : oui, c’est exactement ça. C’est la date à laquelle l’utilisateur a validé son email après inscription. Tant que ce champ est null, la connexion classique est refusée avec “Veuillez vérifier votre adresse email”. Quand le lien reçu par email est validé, le backend met email_verified_at = new Date().
- `auth_provider`, `auth_provider_id` : connexion locale / Google / Apple.
- `is_profile_complete` : profil utilisateur complete.
Pour is_profile_complete : dans l’état actuel du code, il sert surtout pour les comptes OAuth.
Un compte créé par inscription classique est directement mis à true, parce que le formulaire demande déjà les infos nécessaires. Pour OAuth, le profil est considéré complet seulement si on a au minimum :
country && city && birthDate
Donc pays, ville et date de naissance. Ensuite completeProfile() le passe à true.
- `email_verification_token_hash`, 
version hashée du token envoyé par email.
`email_verification_expires_at` : verification email.
expiration du lien de vérification email, actuellement 1 heure.
- `password_reset_token_hash`, 
version hashée du token de réinitialisation de mot de passe.
`password_reset_expires_at` : reset mot de passe.
expiration du lien de reset, aussi 1 heure.
Pour tester l’envoi d’emails en local, j’ai utilisé MailHog, un faux serveur SMTP qui intercepte les emails envoyés par l’application. Ça permet de vérifier les emails de validation ou de reset sans envoyer de vrais emails aux utilisateurs
- `account_status` : compte actif, suspendu ou supprimé.
- `role_id` : lien vers `roles`.
- `created_at`, `updated_at` : audit technique.

### `preference_tags`

Tags de preferences utilisateur (il s'agit de tags personnalisés que l'utilisateur choisi pour son profil) :  ambiances, preferences alimentaires.

- `id` : identifiant.
- `slug` : cle technique stable.
- `label` : libelle affiche.
- `category` : categorie (`dietary`, `meal_ambiance`).
- `is_system` : tag cree par le systeme.
- `is_active` : tag actif.
is_active sert à désactiver un tag sans le supprimer de la base. Comme ça on garde l’historique ou les anciennes associations, mais le tag n’est plus affiché ni proposé à l’utilisateur
- `owner_user_id` : utilisateur proprietaire si tag personnalise.
- `created_at` : date de creation.

### `user_preference_tags`

Table de liaison entre un utilisateur et ses preferences.

- `user_id` : utilisateur.
- `tag_id` : preference.
- `created_at` : date d'association.

### `newsletter_subscriptions`

Inscription newsletter.

- `id` : identifiant.
- `email` : email inscrit.
- `is_active` : inscription active.
- `created_at` : date d'inscription.
- `unsubscribed_at` : date de desinscription.

## Profil hote et administration

### `host_profiles`

Demande / statut hote et informations du logement visibles dans "Chez l'hote".

- `id` : identifiant profil hote.
- `user_id` : utilisateur proprietaire.
- `is_active` : hote actif.
is_active dit si le profil hôte est opérationnel sur le site
- `validation_status` : demande en attente, approuvee ou refusee.
- `host_level` : niveau hote.
Actuellement il est mis à 1 par défaut. Ça peut servir plus tard à faire des niveaux type hôte débutant, confirmé, super hôte, etc. Aujourd’hui, c’est surtout un champ prévu pour l’évolution.
- `activated_at` : date d'activation.
- `country`, `city`, `district_label` : quartier ou secteur affiché., `address` : adresse du logement.
- `lat`, `lng` : coordonnees.
- `home_photo_url` : ancienne photo principale.
ancienne photo principale.
C’est une colonne texte qui garde une seule photo principale. Maintenant vous avez aussi home_photo_urls, donc home_photo_url sert surtout de compatibilité / photo principale.
- `home_photo_urls` : liste des photos logement.
ce n’est pas un enum.
C’est du jsonb en Postgres : une liste de plusieurs URLs de photos du logement. Exemple :
["/uploads/photo1.jpg", "/uploads/photo2.jpg"]
C’est ce qui sert à afficher les photos “Chez l’hôte”.
Avantage : c’est rapide à stocker, simple à lire, et ça évite de créer une table host_profile_photos juste pour une liste de 2 à 5 photos.
- `address_verified` : adresse verifiee.
- `home_photo_verified` : photos validees.
- `verification_score` : score de verification automatique.
score automatique de vérification, entre 0 et 100. Il est calculé à partir de plusieurs critères : adresse vérifiée, champs propres, photo valide, photo qui ressemble à un logement, absence de risques.
- `auto_review_notes` : notes de verification automatique.
notes textuelles générées automatiquement.
Exemple : “Adresse vérifiée par OpenStreetMap”, “Photo liée à un intérieur”, “Score calculé 80/100”. Ça aide l’admin à comprendre pourquoi le profil semble OK ou risqué.
- `rejection_reason` : raison de refus.
- `last_auto_reviewed_at` : derniere verification automatique.
- `home_photo_vision_labels` : labels IA des photos.
labels détectés par Google Vision sur la photo.
Exemple : room, kitchen, bedroom, furniture. Ça sert à vérifier que la photo ressemble bien à un logement.
- `home_photo_safe_search` : analyse de securite des photos.
analyse de sécurité Google Vision.
Ça vérifie s’il y a du contenu adulte, violent, médical, choquant, etc.
- `verification_risk_flags` : listes des problèmes détectés automatiquement.
- `manual_review_required` : indique si un admin doit vérifier manuellement.

### `host_profile_review_logs`

Historique des decisions admin sur une demande hote.

- `id` : identifiant log.
- `host_profile_id` : demande hote concernee.
- `admin_user_id` : admin ayant decide.
- `decision` : approuve ou refuse.
- `rejection_reason` : raison du refus.
- `created_at` : date de decision.

### `reports`

Signalements envoyes par les utilisateurs.

- `id` : identifiant signalement.
- `reporter_user_id` : utilisateur qui signale.
- `target_type` : type de cible (`user`, `meal`, `booking`, `conversation`).
Ça permet de savoir quel type d’élément est signalé : un profil, un repas, une réservation ou une conversation.
- `target_id` : id generique de la cible.
on stocke un id générique parce que la cible peut être de plusieurs types.
- `reported_user_id` : cible utilisateur, si applicable.
- `reported_meal_id` : cible repas, si applicable.
- `reported_booking_id` : cible reservation, si applicable.
- `reported_conversation_id` : cible conversation, si applicable.
- `reason` : motif.
Le champ reason, oui, il vient de la raison choisie par l’utilisateur dans la liste du site.
C’est un enum en BDD. Valeurs possibles :
inappropriate_behavior, harassment, safety, fraud, spam, wrong_information, payment, hygiene, other
- `description` : details envoyes par l'utilisateur.
- `status` : etat du traitement.
status sert à suivre le traitement du signalement côté admin/modération.
C’est aussi un enum :
pending, in_review, resolved, dismissed
- `admin_note` : note interne moderation.
c’est une note interne pour l’équipe de modération.
Elle n’est pas destinée à l’utilisateur
- `reviewed_by_user_id` : admin/moderateur ayant traite.
- `reviewed_at` : date de traitement.
- `created_at`, `updated_at` : dates techniques.

## Repas, reservation, paiement

### `meals`

Evenement / repas cree par un hote.

- `id` : identifiant repas.
- `host_id` : hote organisateur.
host_id est relié à la table users.
Ça veut dire que l’hôte qui organise le repas est un utilisateur de la table users. Il doit normalement avoir le rôle HOST et un profil hôte approuvé/actif.
- `title` : titre.
- `meal_type` : type de repas.
Dans la BDD, ce n’est pas un enum actuellement : c’est un varchar(20), donc du texte. Exemple possible selon votre interface :
brunch
dinner
lunch
apero
- `menu_description` : description globale du menu.
- `date_time` : date et heure.
- `seats_total` : nombre de places.
- `price_per_seat_cents` : prix par place en centimes.
- `house_rules` : regles de la maison.
- `status` : brouillon, publie, annule, termine.
- `created_at`, `updated_at` : dates techniques.

### `meal_menu_items`

Lignes du menu d'un repas.

- `id` : identifiant.
- `meal_id` : repas concerne.
- `category` : entree, plat, dessert, boisson, etc.
C'est un enum en BDD
- `label` : nom de l'element.
- `position` : ordre d'affichage.
- `created_at`, `updated_at` : dates techniques.

### `meal_tags`

Tags applicables aux repas : regimes, ambiance, regles.

- `id` : identifiant.
- `code` : cle technique unique.
- `label` : libelle affiche.
- `category` : type de tag.
- `sort_order` : ordre d'affichage.
- `is_active` : tag actif.

### `meal_tag_assignments`

Table de liaison repas / tags.

- `meal_id` : repas.
- `tag_id` : tag.
- `created_at` : date d'association.

### `bookings`

Reservation d'un utilisateur sur un repas.

- `id` : identifiant reservation.
- `guest_user_id` : invite qui reserve.
- `meal_id` : repas reserve.
- `seats` : nombre de places reservees.
- `booking_status` : en attente, confirmee, refusee, annulee, terminee.
- `payment_method` : moyen de paiement.
- `payment_state` : etat paiement metier.
- `unit_price_cents`, `total_price_cents` : prix.
- `confirmed_at`, `refused_at`, `cancelled_at`, `completed_at` : dates de cycle de vie.
- `refusal_reason` : raison de refus.
- `created_at`, `updated_at` : dates techniques.

### `payments`

Paiement lie a une reservation.

- `id` : identifiant paiement.
- `booking_id` : reservation payee.
- `provider` : prestataire de paiement utilisé. Actuellement la valeur prévue est `stripe`.
- `provider_intent_id` : identifiant du paiement côté Stripe, par exemple l'id du PaymentIntent. Il permet de retrouver l'opération dans Stripe.
- `amount_total_cents` : montant total payé par le participant, stocké en centimes. Exemple : `2500` = 25,00 €.
- `platform_fee_cents` : part gardée par la plateforme sous forme de commission, en centimes.
- `host_amount_cents` : montant destiné à l'hôte après déduction de la commission plateforme, en centimes.
- `status` : état technique du paiement (`pending`, `authorized`, `succeeded`, `failed`, `canceled`, `refunded`).
- `paid_at`: date à laquelle le paiement a été payé/validé., `released_at`: date à laquelle l'argent a été libéré ou considéré comme reversable à l'hôte., `refunded_at` : date à laquelle le paiement a été remboursé, si remboursement.
- `created_at`, `updated_at` : dates techniques.

### `reviews`

Avis laisse apres une reservation.

- `id` : identifiant avis.
- `booking_id` : reservation evaluee.
- `rating` : note.
- `comment` : commentaire.
- `created_at` : date de creation.

### `tips`

Pourboire associe a un avis et une reservation.

- `id` : identifiant pourboire.
- `booking_id` : reservation concernee.
- `review_id` : avis lie.
- `amount_cents` : montant du pourboire en centimes. Exemple : `300` = 3,00 €.
- `payment_id` : identifiant du paiement externe lié au pourboire, par exemple un identifiant Stripe.
- `status` : état du paiement du pourboire (`pending`, `succeeded`, `failed`, `canceled`).
- `paid_at` : date de paiement.
- `created_at`, `updated_at` : dates techniques.

## Messagerie et notifications

### `message_conversations`

Conversation de messagerie.

- `id` : identifiant conversation.
- `type` : conversation de reservation, groupe repas, direct repas.
- `title` : titre optionnel.
- `meal_id` : repas rattache, optionnel.
- `created_at`, `updated_at` : dates techniques.

### `message_conversation_members`

Participants d'une conversation.

- `id` : identifiant membre.
- `conversation_id` : conversation concernée.
- `user_id` : utilisateur participant.
- `role` : rôle de l'utilisateur dans cette conversation (`host`, `guest`, `participant`).
- `last_read_at` : date de dernière lecture de la conversation par cet utilisateur. Sert à savoir si des messages sont non lus.
- `joined_at` : date à laquelle l'utilisateur a rejoint la conversation

### `message_entries`

Messages envoyes.

- `id` : identifiant message.
- `conversation_id` : conversation.
- `sender_user_id` : auteur.
- `body` : contenu.
- `created_at` : date d'envoi.

Ces trois tables servent aux notifications push de l’application/PWA, c’est-à-dire les notifications que l’utilisateur peut recevoir sur son téléphone ou navigateur, même s’il n’est pas forcément en train de regarder la page.

### `push_notification_preferences`

Les réglages utilisateur
Ça sert à savoir quels types de notifications l’utilisateur accepte.

- `id` : identifiant.
- `user_id` : utilisateur.
- `messages_enabled` : recevoir une notification quand quelqu’un envoie un message.
- `reservations_enabled` : recevoir une notification quand une réservation est acceptée/refusée ou quand quelqu’un réserve.
- `meal_reminders_enabled` : recevoir un rappel avant un repas.
- `host_status_enabled` : recevoir une notification quand sa demande hôte est validée ou refusée.
- `created_at`, `updated_at` : dates techniques.

### `push_subscriptions`

Abonnements push par appareil / navigateur.

- `id` : identifiant de l'abonnement push.
- `user_id` : utilisateur.
- `endpoint` :  URL technique fournie par le navigateur pour envoyer une notification à cet appareil.
- `p256dh_key`, `auth_key` : cles Web Push.
- `expiration_time` : expiration eventuelle.
- `user_agent` : informations sur le navigateur ou l'appareil utilisé, par exemple Chrome mobile, Safari, ordinateur, etc.
- `created_at`, `updated_at` : dates techniques.

### `meal_reminder_notifications`

Rappels deja envoyes pour un repas.

- `id` : identifiant du rappel envoyé.
- `meal_id` : repa concerné
- `user_id` : utilisateur notifié
- `reminder_type` : type de rappel envoyé (`day_before`, `two_hours_before`).
- `target_date_time` : date et heure prévues pour le rappel
- `sent_at` : date et heure auxquelles le rappel a réellement été envoyé