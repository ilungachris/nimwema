// Nimwema i18n (Internationalization) System
// Supports: French (fr), Lingala (ln), English (en)

const translations = {
  fr: {
    // Header
    login: "Connexion",
    welcome: "Bienvenue",
    
    // Homepage
    tagline: "Bons d'achat simples et sécurisés.",
    hero_line1: "Le bien donné.",
    hero_line2: "revient couronné.",
    send_now: "Envoyer maintenant",
    support_text: "« Soutenez votre famille dans toute la RDC, remerciez votre personnel, surprenez un ami, offrez un cadeau, bénissez un frère, une sœur... »",
    good_heart: "Retrouvons notre bon Cœur",
    request_voucher: "Demander un bon d'achat",
    send_voucher: "Envoyer un bon d'achat",
    our_merchants: "Nos Marchands",
    
    // About
    our_story: "Notre Histoire",
    story_text: "Au cœur de l'Afrique, il existe une richesse plus profonde que l'or et le cuivre, celle du cœur congolais. Depuis toujours, notre peuple a su partager le peu qu'il avait, accueillir, donner, et se relever ensemble. Cette solidarité, héritée de nos villages, est notre plus grand trésor.",
    story_text2: "Nimwema, qui signifie « bonté », est née pour faire vivre cet esprit dans le monde moderne. C'est une plateforme congolaise d'entraide simple, rapide et sûre, où chaque geste de générosité devient un lien entre les cœurs.",
    
    // Footer
    quick_links: "Liens Rapides",
    how_it_works: "Comment ça marche",
    about: "À propos",
    support: "Support",
    contact: "Contact",
    terms: "Termes et Conditions",
    privacy: "Politique de Confidentialité",
    all_rights: "Tous droits réservés.",
    
    // Forms
    amount: "Montant",
    quantity: "Quantité",
    recipient_phone: "Numéro du destinataire",
    sender_name: "Votre nom",
    message: "Message (optionnel)",
    send: "Envoyer",
    request: "Demander",
    
    // Request Form
    request_voucher_title: "Demander un bon d'achat",
    request_voucher_subtitle: "Remplissez le formulaire ci-dessous pour demander un bon d'achat alimentaire.",
    personal_info: "Informations personnelles",
    first_name: "Prénom",
    last_name: "Nom",
    first_name_placeholder: "Entrez votre prénom",
    last_name_placeholder: "Entrez votre nom",
    phone_number: "Numéro de téléphone",
    phone_placeholder: "+243 XXX XXX XXX",
    phone_helper: "Format: +243 suivi de votre numéro",
    confirm_phone: "Confirmer le numéro",
    request_type_title: "Type de demande",
    waiting_list: "Liste d'attente",
    waiting_list_desc: "Votre demande sera visible pendant 48 heures",
    known_sender: "Expéditeur connu",
    known_sender_desc: "Envoyer la demande à un numéro spécifique",
    sender_info: "Informations de l'expéditeur",
    sender_name_label: "Nom de l'expéditeur",
    sender_name_placeholder: "Nom de la personne",
    sender_phone: "Numéro de l'expéditeur",
    confirm_sender_phone: "Confirmer le numéro",
    amount_title: "Montant demandé",
    amount_placeholder: "Ex: 50000",
    amount_helper: "Montant minimum: 1,000 CDF",
    message_optional: "Message (optionnel)",
    message_placeholder: "Ajoutez un message pour expliquer votre demande...",
    characters: "caractères",
    clear_form: "Effacer",
    send_request: "Envoyer la demande",
    
    // Confirmation Page
    request_sent_title: "Demande envoyée avec succès !",
    request_sent_message: "Merci d'avoir utilisé Nimwema. Votre demande a été enregistrée et sera traitée dans les plus brefs délais.",
    what_happens_next: "Que se passe-t-il maintenant ?",
    next_step_1: "Un SMS a été envoyé à l'expéditeur pour l'informer de votre demande",
    next_step_2: "L'expéditeur recevra un lien direct pour envoyer le bon d'achat",
    next_step_3: "Vous recevrez un SMS avec le code du bon d'achat une fois envoyé",
    next_step_4: "Vous pourrez utiliser ce code dans l'un de nos marchands partenaires",
    sign_in_sign_up: "Se connecter / S'inscrire",
    back_home: "Retour à l'accueil",
    make_another_request: "Faire une autre demande",
    guest_note: "💡 Astuce : Créez un compte pour suivre vos demandes, gérer vos expéditeurs favoris et accéder à votre historique.",
    
    // Dashboard
    my_vouchers: "Mes Bons",
    sent_vouchers: "Bons Envoyés",
    received_vouchers: "Bons Reçus",
    pending_requests: "Demandes en Attente",
    
    // Status
    active: "Actif",
    used: "Utilisé",
    expired: "Expiré",
    pending: "En Attente",
    fulfilled: "Satisfait",
    redeemed: "Utilisé",
    completed: "Complété",
    failed: "Échoué",
    
    // Navigation
    nav_sender_dashboard: "Mon Tableau de Bord",
    nav_redeem: "Utiliser un Bon",
    
    // Sender Dashboard
    sender_dashboard_title: "Tableau de Bord Envoyeur",
    my_sent_vouchers: "Mes Bons Envoyés",
    recipients_management: "Gestion des Destinataires",
    transaction_history: "Historique des Transactions",
    settings: "Paramètres",
    
    // Statistics
    total_sent: "Total Envoyé",
    redeemed_vouchers: "Bons Utilisés",
    pending_vouchers: "Bons en Attente",
    total_recipients: "Total Destinataires",
    all_time: "Tout le temps",
    vouchers: "bons",
    people: "personnes",
    
    // Vouchers Section
    send_new_voucher: "Envoyer un Nouveau Bon",
    all_statuses: "Tous les statuts",
    newest_first: "Plus récent",
    oldest_first: "Plus ancien",
    highest_amount: "Montant le plus élevé",
    lowest_amount: "Montant le plus bas",
    search_vouchers: "Rechercher par code ou destinataire...",
    no_vouchers_sent: "Aucun bon envoyé",
    no_vouchers_message: "Vous n'avez pas encore envoyé de bons d'achat.",
    send_first_voucher: "Envoyer votre premier bon",
    voucher_code: "Code du bon",
    recipient: "Destinataire",
    sent_on: "Envoyé le",
    redeemed_on: "Utilisé le",
    expires_on: "Expire le",
    view_details: "Voir Détails",
    voucher_details: "Détails du Bon",
    
    // Recipients Section
    add_recipient: "Ajouter un Destinataire",
    edit_recipient: "Modifier le Destinataire",
    no_recipients: "Aucun destinataire",
    no_recipients_message: "Ajoutez des destinataires pour envoyer des bons plus rapidement.",
    recipient_name: "Nom du destinataire",
    notes: "Notes (optionnel)",
    send_voucher: "Envoyer un Bon",
    edit: "Modifier",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    total: "Total",
    
    // Transactions Section
    export_history: "Exporter l'Historique",
    date_range: "Période",
    today: "Aujourd'hui",
    this_week: "Cette semaine",
    this_month: "Ce mois",
    this_year: "Cette année",
    payment_method: "Méthode de paiement",
    all_methods: "Toutes les méthodes",
    date: "Date",
    transaction_id: "ID Transaction",
    amount: "Montant",
    vouchers_count: "Bons",
    status: "Statut",
    actions: "Actions",
    no_transactions: "Aucune transaction",
    no_transactions_message: "Votre historique de transactions apparaîtra ici.",
    
    // Settings Section
    notification_settings: "Paramètres de Notification",
    email_notifications: "Notifications par email",
    sms_notifications: "Notifications par SMS",
    redemption_alerts: "Alertes d'utilisation de bons",
    account_settings: "Paramètres du Compte",
    default_currency: "Devise par défaut",
    language: "Langue",
    privacy_settings: "Paramètres de Confidentialité",
    hide_identity_default: "Masquer mon identité par défaut",
    share_stats: "Partager mes statistiques anonymes",
    save_settings: "Enregistrer les Paramètres",
    
    // Redemption
    redeem_voucher: "Utiliser un Bon d'Achat",
    enter_code: "Entrez le code de votre bon pour l'utiliser",
    code_placeholder: "NMW-XXXXXX",
    checking_code: "Vérification du code...",
    check_code: "Vérifier le Code",
    redeem_now: "Utiliser Maintenant",
    merchant_info: "Informations du Marchand",
    merchant_name: "Nom du marchand",
    merchant_phone: "Téléphone du marchand",
    merchant: "Marchand",
    redeemed_at: "Utilisé le",
    redemption_success: "Bon Utilisé avec Succès!",
    redemption_message: "Le bon a été utilisé et le destinataire a été notifié.",
    redeem_another: "Utiliser un Autre Bon",
    
    // Dashboard specific
    my_requests: "Mes Demandes",
    my_senders: "Mes Expéditeurs",
    new_request: "Nouvelle Demande",
    requests_subtitle: "Gérez toutes vos demandes de bons d'achat",
    senders_subtitle: "Gérez vos contacts expéditeurs favoris",
    filter_by_status: "Filtrer par statut",
    filter_by_type: "Filtrer par type",
    sort_by: "Trier par",
    all_statuses: "Tous",
    all_types: "Tous",
    newest_first: "Plus récent",
    oldest_first: "Plus ancien",
    request_details: "Détails de la demande",
    add_sender: "Ajouter un expéditeur",
    relation: "Relation",
    relation_placeholder: "Ex: Famille, Ami, Collègue",
    logout: "Déconnexion",
    loading: "Chargement...",
    close: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    delete: "Supprimer",
    confirm_delete: "Confirmer la suppression",
    delete_confirmation: "Êtes-vous sûr de vouloir supprimer cet élément ?",
    
    // Send Voucher
    send_voucher_title: "Envoyer un bon d'achat",
    send_voucher_subtitle: "Choisissez le montant et envoyez un bon d'achat à vos proches",
    currency_selection: "Devise",
    exchange_rate: "Taux de change:",
    amount_selection: "Montant",
    custom_amount: "Montant personnalisé",
    amount_helper_send: "Sélectionnez un montant prédéfini ou entrez un montant personnalisé",
    quantity_selection: "Quantité",
    number_of_vouchers: "Nombre de bons",
    quantity_helper: "Nombre de bons d'achat à créer (maximum 50)",
    total_amount: "Montant total:",
    recipients_selection: "Destinataires",
    from_waiting_list: "Depuis la liste d'attente",
    from_waiting_list_desc: "Choisir des demandes en attente",
    specific_recipients: "Destinataires spécifiques",
    specific_recipients_desc: "Entrer les numéros manuellement",
    select_from_waiting_list: "Sélectionner depuis la liste d'attente",
    enter_recipients: "Entrer les destinataires",
    recipients_info_text: "Vous pouvez entrer jusqu'à 50 numéros maximum par opération.",
    batch_info_text: "Vous devrez entrer",
    batch_info_text2: "lot(s) de numéros.",
    add_recipient: "Ajouter un destinataire",
    sender_options: "Options d'envoi",
    your_name: "Votre nom",
    hide_identity: "Masquer mon identité (envoyer anonymement)",
    fees_payment: "Frais et paiement",
    subtotal: "Sous-total:",
    service_fee: "Frais de service (3.5%):",
    total_to_pay: "Total à payer:",
    cover_fees: "Je prends en charge les frais (le destinataire recevra le montant complet)",
    payment_method: "Méthode de paiement",
    proceed_to_payment: "Procéder au paiement",
    
    // Payment Instructions
    payment_pending_title: "Paiement en attente",
    payment_pending_message: "Votre commande a été créée avec succès. Veuillez suivre les instructions ci-dessous pour compléter votre paiement.",
    print_instructions: "Imprimer les instructions",
    
    // Payment Success
    payment_success_title: "Paiement réussi !",
    payment_success_message: "Votre paiement a été traité avec succès. Les bons d'achat ont été générés et envoyés aux destinataires par SMS.",
    success_step_1: "Les bons d'achat ont été générés avec des codes uniques",
    success_step_2: "Un SMS a été envoyé à chaque destinataire avec son code",
    success_step_3: "Les destinataires peuvent utiliser leurs codes dans nos marchands partenaires",
    success_step_4: "Vous recevrez un email de confirmation avec tous les détails",
    view_dashboard: "Voir mon tableau de bord",
    send_another: "Envoyer un autre bon",
    thank_you_message: "Votre générosité fait la différence. Le bien circule, les bénédictions suivent.",
    
    // Messages
    success_send: "Bon d'achat envoyé avec succès!",
    success_request: "Demande envoyée avec succès!",
    error_generic: "Une erreur s'est produite. Veuillez réessayer.",
  },
  
  ln: {
    // Header
    login: "Kokɔta",
    welcome: "Boyei malamu",
    
    // Homepage
    tagline: "Makabo ya malamu mpe ya libateli.",
    hero_line1: "Bolamu ezali kotambola.",
    hero_line2: "Mapamboli ezali kolanda.",
    send_now: "Tinda sikawa",
    support_text: "« Salisá libota na yo na RDC mobimba, zongisa matondi na basali na yo, kamwisa moninga, pesa likabo, pambola ndeko... »",
    good_heart: "Tozonga na motema malamu",
    request_voucher: "Senga likabo",
    send_voucher: "Tinda likabo",
    our_merchants: "Bavendeur na biso",
    
    // About
    our_story: "Lisolo na biso",
    story_text: "Na kati ya Afrika, ezali na bozwi moko ya mozindo koleka wolo mpe cuivre — oyo ya motema ya Mukongi. Banda kala, bato na biso bayebi kokabola moke oyo bazalaki na yango, koyamba, kopesa, mpe kotelema elongo.",
    story_text2: "Nimwema — oyo elingi koloba « bolamu » — ebotami mpo na kopesa bomoi na molimo oyo na ntango ya lelo. Ezali plateforme ya Kongo ya lisalisi ya pete, ya mbangu mpe ya libateli.",
    
    // Footer
    quick_links: "Ba liens ya mbangu",
    how_it_works: "Ndenge esalemaka",
    about: "Na ntina ya",
    support: "Lisalisi",
    contact: "Kokutana",
    terms: "Mibeko",
    privacy: "Politique ya kobomba",
    all_rights: "Makoki nyonso ebombami.",
    
    // Forms
    amount: "Mbongo",
    quantity: "Motango",
    recipient_phone: "Nimero ya moto akozwa",
    sender_name: "Nkombo na yo",
    message: "Nsango (soki olingi)",
    send: "Tinda",
    request: "Senga",
    
    // Dashboard
    my_vouchers: "Makabo na ngai",
    sent_vouchers: "Makabo oyo natindaki",
    received_vouchers: "Makabo oyo nazwaki",
    pending_requests: "Bosenga oyo ezali kozela",
    
    // Status
    active: "Ezali kosala",
    used: "Esalemaki",
    expired: "Ekweyi",
    pending: "Ezali kozela",
    
    // Messages
    success_send: "Likabo etindami malamu!",
    success_request: "Bosenga etindami malamu!",
    error_generic: "Likambo moko esalemaki. Meka lisusu.",
  },
  
  en: {
    // Header
    login: "Login",
    welcome: "Welcome",
    
    // Homepage
    tagline: "Simple and secure grocery vouchers.",
    hero_line1: "Goodness circulates.",
    hero_line2: "Blessings follow.",
    send_now: "Send now",
    support_text: "« Support your family across DRC, thank your staff, surprise a friend, give a gift, bless a brother, a sister... »",
    good_heart: "Let's rediscover our good heart",
    request_voucher: "Request a voucher",
    send_voucher: "Send a voucher",
    our_merchants: "Our Merchants",
    
    // About
    our_story: "Our Story",
    story_text: "In the heart of Africa, there exists a wealth deeper than gold and copper — that of the Congolese heart. Since always, our people have known how to share the little they had, welcome, give, and rise together.",
    story_text2: "Nimwema — which means 'goodness' — was born to bring this spirit to life in the modern world. It's a Congolese platform for simple, fast, and secure mutual aid.",
    
    // Footer
    quick_links: "Quick Links",
    how_it_works: "How it works",
    about: "About",
    support: "Support",
    contact: "Contact",
    terms: "Terms and Conditions",
    privacy: "Privacy Policy",
    all_rights: "All rights reserved.",
    
    // Forms
    amount: "Amount",
    quantity: "Quantity",
    recipient_phone: "Recipient's phone",
    sender_name: "Your name",
    message: "Message (optional)",
    send: "Send",
    request: "Request",
    
    // Dashboard
    my_vouchers: "My Vouchers",
    sent_vouchers: "Sent Vouchers",
    received_vouchers: "Received Vouchers",
    pending_requests: "Pending Requests",
    
    // Status
    active: "Active",
    used: "Used",
    expired: "Expired",
    pending: "Pending",
    
    // Messages
    success_send: "Voucher sent successfully!",
    success_request: "Request sent successfully!",
    error_generic: "An error occurred. Please try again.",
  }
};

// Current language (default: French)
let currentLang = localStorage.getItem('nimwema_lang') || 'fr';

// Initialize i18n on page load
document.addEventListener('DOMContentLoaded', function() {
  initI18n();
  setupLanguageSwitcher();
});

// Initialize internationalization
function initI18n() {
  updatePageLanguage(currentLang);
  updateActiveLanguageButton();
}

// Update all translatable elements on the page
function updatePageLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('nimwema_lang', lang);
  
  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Find all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = translations[lang][key];
    
    if (translation) {
      // Check if element contains HTML (like spans with classes)
      if (element.innerHTML.includes('<span')) {
        // For elements with nested HTML, we need to preserve the structure
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = translation;
        element.innerHTML = tempDiv.innerHTML;
      } else {
        element.textContent = translation;
      }
    }
  });
}

// Setup language switcher buttons
function setupLanguageSwitcher() {
  const langButtons = document.querySelectorAll('.lang-btn');
  
  langButtons.forEach(button => {
    button.addEventListener('click', function() {
      const lang = this.getAttribute('data-lang');
      updatePageLanguage(lang);
      updateActiveLanguageButton();
    });
  });
}

// Update active language button styling
function updateActiveLanguageButton() {
  const langButtons = document.querySelectorAll('.lang-btn');
  
  langButtons.forEach(button => {
    if (button.getAttribute('data-lang') === currentLang) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Get translation for a specific key
function t(key) {
  return translations[currentLang][key] || key;
}

// Export for use in other scripts
window.i18n = {
  t: t,
  currentLang: () => currentLang,
  setLang: updatePageLanguage
};
// Authentication translations
translations.fr.signup = {
  title: "Créer un compte",
  subtitle: "Rejoignez Nimwema et commencez à partager la solidarité",
  fullName: "Nom complet",
  email: "Email",
  phone: "Téléphone",
  password: "Mot de passe",
  confirmPassword: "Confirmer le mot de passe",
  submit: "Créer mon compte",
  haveAccount: "Vous avez déjà un compte ?",
  login: "Se connecter",
  processing: "Création de votre compte...",
  userType: {
    user: "Utilisateur",
    userDesc: "Envoyer et recevoir des bons",
    merchant: "Commerçant",
    merchantDesc: "Accepter les bons"
  },
  password: {
    length: "Au moins 8 caractères",
    uppercase: "Une lettre majuscule",
    lowercase: "Une lettre minuscule",
    number: "Un chiffre"
  },
  terms: {
    agree: "J'accepte les",
    terms: "conditions d'utilisation",
    and: "et la",
    privacy: "politique de confidentialité"
  },
  errors: {
    fullNameRequired: "Le nom complet est requis",
    emailInvalid: "Email invalide",
    phoneInvalid: "Numéro de téléphone invalide",
    passwordWeak: "Mot de passe trop faible",
    passwordMismatch: "Les mots de passe ne correspondent pas"
  }
};

translations.en.signup = {
  title: "Create Account",
  subtitle: "Join Nimwema and start sharing solidarity",
  fullName: "Full Name",
  email: "Email",
  phone: "Phone",
  password: "Password",
  confirmPassword: "Confirm Password",
  submit: "Create Account",
  haveAccount: "Already have an account?",
  login: "Sign In",
  processing: "Creating your account...",
  userType: {
    user: "User",
    userDesc: "Send and receive vouchers",
    merchant: "Merchant",
    merchantDesc: "Accept vouchers"
  },
  password: {
    length: "At least 8 characters",
    uppercase: "One uppercase letter",
    lowercase: "One lowercase letter",
    number: "One number"
  },
  terms: {
    agree: "I accept the",
    terms: "terms of service",
    and: "and",
    privacy: "privacy policy"
  },
  errors: {
    fullNameRequired: "Full name is required",
    emailInvalid: "Invalid email",
    phoneInvalid: "Invalid phone number",
    passwordWeak: "Password too weak",
    passwordMismatch: "Passwords do not match"
  }
};


// Thank you page translations
translations.fr.nav_thank_you = "Dire Merci";
translations.en.nav_thank_you = "Say Thanks";


// Terms page translations
translations.fr.nav_terms = "Conditions";
translations.en.nav_terms = "Terms";

