// Kraxia - dictionnaire i18n français
// Toutes les chaînes visibles de l'UI passent par ce fichier

export const fr = {
  // Marque
  brand: {
    name: 'Kraxia',
    tagline: 'SaaS multi-tenant d\'agents IA',
    version: 'Kraxia v1.0.0',
  },

  // Navigation
  nav: {
    overview: 'Vue d\'ensemble',
    agents: 'Agents',
    skillCenter: 'Centre de compétences',
    system: 'Système',
    admin: 'Administration SaaS',
    dashboard: 'Tableau de bord',
    agentList: 'Liste des agents',
    chat: 'Conversations',
    skills: 'Bibliothèque de compétences',
    channels: 'Canaux de communication',
    plugins: 'Extensions',
    models: 'Modèles IA',
    files: 'Gestionnaire de fichiers',
    knowledge: 'Base de connaissances',
    terminal: 'Terminal temps réel',
    sessions: 'Historique des conversations',
    cron: 'Tâches planifiées',
    nodes: 'Gestion des nœuds',
    api: 'Accès API',
    settings: 'Paramètres système',
  },

  // Sidebar
  sidebar: {
    changePassword: 'Modifier le mot de passe',
    logout: 'Se déconnecter',
    passwordChange: 'Modification du mot de passe',
    oldPassword: 'Ancien mot de passe',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    submitChange: 'Confirmer la modification',
    passwordTooShort: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    emptyOldPassword: 'Veuillez saisir l\'ancien mot de passe',
    passwordChanged: 'Mot de passe modifié avec succès',
    changeFailed: 'Échec de la modification',
    wrongOldPassword: 'Ancien mot de passe incorrect',
  },

  // Service status
  status: {
    initializing: 'Service en cours d\'initialisation',
    online: 'Service opérationnel',
    offline: 'Service hors ligne',
  },

  // Theme
  theme: {
    switchToDark: 'Passer au thème sombre',
    switchToLight: 'Passer au thème clair',
  },

  // TopBar
  topbar: {
    systemSettings: 'Paramètres système',
    logoutTitle: 'Se déconnecter',
  },

  // Brand subtitle
  brandSubtitle: 'Plateforme multi-agents',

  // Login
  login: {
    title: 'Kraxia',
    usernameOrEmail: 'Nom d\'utilisateur ou email',
    username: 'Nom d\'utilisateur',
    email: 'Adresse email',
    password: 'Mot de passe',
    submit: 'Se connecter',
    register: 'S\'inscrire',
    noAccount: 'Pas encore de compte ?',
    hasAccount: 'Déjà un compte ?',
    loginFailed: 'Échec de la connexion',
    unexpectedError: 'Une erreur inattendue s\'est produite',
    loggingIn: 'Connexion en cours...',
  },

  // Dashboard
  dashboard: {
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble des agents',
    totalAgents: 'Nombre total d\'agents',
    totalSessions: 'Conversations',
    totalCompétences: 'Compétences',
    agentsOverview: 'Aperçu des agents',
    viewAll: 'Tout afficher',
    status_running: 'En cours',
    status_active: 'Actif récemment',
    status_idle: 'Inactif',
    agentName: 'Nom de l\'agent',
    agentId: 'Identifiant',
    status: 'État',
    actions: 'Actions',
  },

  // Agents
  agents: {
    title: 'Gestion des agents',
    subtitle: 'Administrer et configurer vos agents IA',
    newAgent: 'Créer un agent',
    search: 'Rechercher un agent par nom ou ID...',
    details: 'Détails',
    delete: 'Supprimer',
    confirmDelete: 'Confirmer la suppression de cet agent ?',
  },

  // agent Create
  agentCreate: {
    title: 'Créer un agent',
    subtitle: 'Configurer et créer un nouvel agent IA',
    back: 'Retour à la liste des agents',
    displayName: 'Nom affiché *',
    displayNamePlaceholder: 'ex : Assistant Service Client',
    agentId: 'Identifiant de l\'agent *',
    agentIdHint: 'Lettres minuscules, chiffres, tirets et underscores uniquement',
    manualIdHint: '- Veuillez saisir un identifiant en anglais',
    workspace: 'Chemin du workspace',
    workspaceHelp: 'Laissez vide pour générer automatiquement',
    creationCall: 'Appel à la création :',
    submit: 'Créer l\'agent',
    cancel: 'Annuler',
    failed: 'Échec de la création, veuillez réessayer',
  },

  // agent Detail
  agentDetail: {
    title: 'Détails de l\'agent',
    loading: 'Chargement des détails...',
    files: 'Fichiers de configuration',
    systemPrompt: 'Prompt système',
    view: 'Voir',
    hide: 'Masquer',
    loadingFile: 'Chargement du fichier...',
    loadFileFailed: '(Impossible de charger le contenu du fichier)',
    selectAgent: 'Sélectionner un agent',
  },

  // Sessions
  sessions: {
    title: 'Historique des conversations',
    subtitle: 'Consulter toutes les conversations des agents',
    refresh: 'Actualiser',
    empty: 'Aucun historique de conversation',
    session: 'Conversation',
    createdAt: 'Créée le',
    updatedAt: 'Dernière mise à jour',
    view: 'Voir',
    delete: 'Supprimer',
    confirm: 'Confirmer la suppression de cette conversation ?',
    messagesCount: 'messages',
    createdOn: 'Créée le',
    noMessages: 'Aucun message',
    emptyMessage: '(message vide)',
    user: 'Utilisateur',
    agent: 'Agent',
    deleteSession: 'Supprimer la conversation',
    viewSession: 'Voir la conversation',
  },

  // Chat
  chat: {
    activeSessions: 'Conversations actives',
    new: 'Nouvelle',
    noSessions: 'Aucune conversation',
    sendFirstMessage: 'Envoyez un message pour démarrer la conversation',
    supportsUpload: 'Téléversement d\'images et fichiers pris en charge',
    processing: 'En cours de traitement',
    refresh: 'Actualiser',
    confirmDelete: 'Confirmer la suppression de cette conversation ?',
    user: 'Utilisateur',
    agent: 'Agent',
  },

  // Compétences
  skills: {
    title: 'Bibliothèque de compétences',
    subtitle: 'Installer et gérer les compétences IA',
    install: 'Installer',
    installed: 'Installée',
    enable: 'Activer',
    disable: 'Désactiver',
    delete: 'Supprimer',
    search: 'Rechercher une compétence...',
    upload: 'Téléverser',
    download: 'Télécharger',
    recommendedCategories: 'Catégories recommandées',
    installSuccess: 'Installation réussie',
    installFailed: 'Échec de l\'installation',
  },

  // Channels
  channels: {
    title: 'Canaux de communication',
    subtitle: 'Connecter vos agents à Telegram, Discord, WhatsApp, etc.',
    configured: 'Canaux configurés',
    available: 'Canaux disponibles',
    refresh: 'Actualiser',
    configure: 'Configurer',
    delete: 'Supprimer',
    deleteConfirm: 'Confirmer la suppression de ce canal ?',
    deleteSuccess: 'Canal supprimé',
    save: 'Enregistrer',
    cancel: 'Annuler',
    restartHint: 'Redémarrez la passerelle pour appliquer',
    weixinBind: 'Lier WeChat',
  },

  // Plugins
  plugins: {
    title: 'Gestion des extensions',
    subtitle: 'Installer des extensions de canaux et fonctionnalités',
    refresh: 'Actualiser',
    installed: 'Extensions installées',
    installNew: 'Installer une nouvelle extension',
    customInstall: 'Installation personnalisée',
    installSpec: 'Spécification npm',
    install: 'Installer',
    uninstall: 'Désinstaller',
    uninstallConfirm: 'Confirmer la désinstallation ?',
    installSuccess: 'Extension installée avec succès, redémarrez la passerelle',
  },

  // Models
  models: {
    title: 'Modèles IA',
    subtitle: 'Configurer les fournisseurs LLM (Anthropic, OpenAI, Mistral...)',
    refresh: 'Actualiser',
    addProvider: 'Ajouter un fournisseur',
    addModel: 'Ajouter un modèle',
    save: 'Enregistrer',
    defaultModelSet: 'Modèle par défaut défini sur',
    apiKey: 'Clé API',
    baseUrl: 'URL de base',
    apiType: 'Type d\'API',
    modelId: 'Identifiant du modèle',
    modelName: 'Nom du modèle',
    category: {
      official: 'Services internationaux',
      cn: 'Services chinois',
      local: 'Déploiement local',
      custom: 'Personnalisé',
    },
  },

  // Files
  files: {
    title: 'Gestionnaire de fichiers',
    subtitle: 'Naviguer et gérer les fichiers des agents',
    back: 'Remonter',
    newFolder: 'Nouveau dossier',
    upload: 'Téléverser',
    refresh: 'Actualiser',
    confirmDelete: 'Confirmer la suppression ?',
    newFolderName: 'Nom du dossier',
    download: 'Télécharger',
    sortBy: 'Trier par',
    sortName: 'Nom',
    sortSize: 'Taille',
    sortModified: 'Modifié',
  },

  // Knowledge
  knowledge: {
    title: 'Base de connaissances',
    subtitle: 'Gérer les documents et bases de connaissances',
    selectAgent: 'Sélectionner un agent',
    back: 'Remonter',
    newFolder: 'Nouveau dossier',
    upload: 'Téléverser',
    refresh: 'Actualiser',
    currentPath: 'Chemin actuel',
  },

  // Terminal
  terminal: {
    title: 'Terminal temps réel',
    subtitle: 'Terminal complet (xterm.js + PTY), prise en charge des touches fléchées, Tab, TUI (vi/top/htop). Tapez vos commandes directement ici.',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    connect: 'Connecter',
    disconnect: 'Déconnecter',
    clear: 'Effacer',
    command: 'Commande de démarrage',
    commandPlaceholder: 'ex : bash -il',
    notLoggedIn: 'Non connecté ou jeton expiré',
  },

  // Cron Jobs
  cron: {
    title: 'Tâches planifiées',
    refresh: 'Actualiser',
    newTask: 'Nouvelle tâche',
    empty: 'Aucune tâche planifiée. Cliquez sur "Nouvelle tâche" pour en créer.',
    name: 'Nom de la tâche',
    schedule: 'Planification',
    lastRun: 'Dernière exécution',
    nextRun: 'Prochaine exécution',
    actions: 'Actions',
    enable: 'Activer',
    disable: 'Désactiver',
    runNow: 'Exécuter maintenant',
    delete: 'Supprimer',
    fixedInterval: 'Intervalle fixe',
    cronExpression: 'Expression cron',
    oneTime: 'Exécution unique',
    intervalSeconds: 'Intervalle en secondes',
    cronExpr: 'Expression cron',
    datetime: 'Date et heure',
    message: 'Message',
    deliveryChannel: 'Canal de livraison',
    deliveryTarget: 'Cible',
    submit: 'Créer la tâche',
    cancel: 'Annuler',
    failed: 'Échec de l\'opération',
  },

  // Nodes
  nodes: {
    title: 'Gestion des nœuds',
    pairedNodes: 'Nœuds appairés',
    pending: 'Demandes de pairing en attente',
    approve: 'Approuver',
    reject: 'Rejeter',
    delete: 'Supprimer',
    capabilities: 'Capacités',
    version: 'Version',
    platform: 'Plateforme',
    ipAddress: 'Adresse IP',
    addNode: 'Ajouter un nœud',
    viaCli: 'Via ligne de commande',
    viaMacMenuBar: 'Via barre de menu macOS',
    viaSshTunnel: 'Via tunnel SSH',
  },

  // API
  api: {
    title: 'Accès API',
    subtitle: 'Générer un jeton API pour intégrer vos agents dans vos outils',
    generateToken: 'Générer un jeton',
    tokenValidity: 'Validité : 365 jours',
    copy: 'Copier',
    copied: 'Copié',
    cliUsage: 'Utilisation en CLI',
    pythonExample: 'Exemple Python',
    method: 'POST',
    endpoint: '/api/openclaw/sessions/:key/messages',
  },

  // Settings
  settings: {
    title: 'Paramètres système',
    subtitle: 'Administrer la configuration de la passerelle Kraxia',
    refresh: 'Actualiser',
    save: 'Enregistrer',
    saved: 'Paramètres enregistrés, cliquez sur << Redémarrer la passerelle >> pour appliquer',
    restartGateway: 'Redémarrer la passerelle',
    restarting: 'Redémarrage en cours...',
    restartConfirm: 'Confirmer le redémarrage de la passerelle ? Le service sera brièvement indisponible.',
    restartSuccess: 'Passerelle redémarrée',
    autoFix: 'Réparation automatique',
    fixing: 'Réparation en cours...',
    fixConfirm: 'Lancer la réparation ? Les problèmes de configuration seront corrigés automatiquement.',
    fixComplete: 'Réparation terminée, conteneur redémarré',
    fixFailed: 'La commande de réparation a renvoyé un code non nul',
    gatewayStatus: 'État de la passerelle',
    containerInfo: 'Informations sur le conteneur',
    gatewayConfig: 'Configuration de la passerelle',
    about: 'À propos',
    bind: 'Adresse de liaison',
    port: 'Port',
    allowedOrigins: 'Origines autorisées (CORS)',
    bindOptions: {
      loopback: 'loopback (machine locale uniquement)',
      all: 'all (toutes les interfaces)',
      tailscale: 'tailscale',
    },
    originHelp: 'Une URL par ligne, pour le contrôle d\'accès CORS de l\'UI',
    connected: 'Connectée',
    notConnected: 'Non connectée',
    configFile: 'Fichier de configuration',
    workspace: 'Workspace',
    currentModel: 'Modèle actuel',
    containerName: 'Nom du conteneur',
    containerStatus: 'État du conteneur',
    createdAt: 'Créé le',
    portMappings: 'Mappage de ports',
    statusRunning: 'En cours',
    statusRestarting: 'Redémarrage anormal',
    statusCreating: 'Création',
    statusPaused: 'En pause',
    statusStopped: 'Arrêté',
    statusArchived: 'Archivé',
    platformVersion: 'Version de la plateforme',
    gateway: 'Passerelle',
    authMode: 'Mode d\'authentification',
    dataDir: 'Répertoire de données',
    noContainer: 'Aucun conteneur',
    loadFailed: 'Échec du chargement',
    saveFailed: 'Échec de l\'enregistrement',
    invalidConfig: 'Contrôle de configuration invalide, corrigez avant de redémarrer',
    copyContainerName: 'Copier le nom du conteneur',
    copied: 'Copié',
    v1: 'SaaS Kraxia',
  },

  // Audit Log
  audit: {
    title: 'Journal d\'audit',
    subtitle: 'Opérations système et événements de sécurité',
    level_info: 'Info',
    level_warning: 'Avertissement',
    level_security: 'Sécurité',
    level_success: 'Succès',
    today: 'aujourd\'hui',
    source: 'Source',
  },

  // Notifications
  notifications: {
    title: 'Notifications',
    subtitle: 'Vos conversations terminées apparaîtront ici',
    markAllRead: 'Tout marquer comme lu',
    empty: 'Aucune notification',
    agentDone: 'Conversation avec l\'agent terminée',
    conversationDone: 'Conversation terminée',
    minutesAgo: 'il y a X min',
    hoursAgo: 'il y a X h',
    daysAgo: 'il y a X j',
    assistantDone: 'L\'assistant a terminé sa réponse',
    deleteNotification: 'Supprimer la notification',
  },

  // Admin SaaS Panel
  adminPanel: {
    title: 'Administration SaaS Kraxia',
    subtitle: 'Gestion globale de la plateforme multi-tenant',
    tabs: {
      dashboard: 'Tableau de bord',
      users: 'Utilisateurs',
      containers: 'Conteneurs',
      audit: 'Audit',
      usage: 'Utilisation',
    },
    dashboard: {
      totalUtilisateurs: 'Utilisateurs',
      activeUtilisateurs: 'Actifs',
      adminUtilisateurs: 'Administrateurs',
      totalSessions: 'Conversations',
      totalAgents: 'Agents',
      totalCompétences: 'Compétences',
      tokensToday: 'Jetons aujourd\'hui',
      tokensThisMonth: 'Jetons ce mois-ci',
      containersRunning: 'Conteneurs en cours',
      containersTotal: 'Conteneurs totaux',
      recentSignups: 'Inscriptions récentes',
    },
    users: {
      title: 'Gestion des utilisateurs',
      search: 'Rechercher (nom, email, ID)',
      filterAll: 'Tous',
      filterAdmin: 'Administrateurs',
      filterUtilisateur: 'Utilisateurs',
      filterInactive: 'Désactivés',
      username: 'Nom',
      email: 'Email',
      role: 'Rôle',
      quota: 'Quota',
      runtime: 'Runtime',
      status: 'État',
      container: 'Conteneur',
      actions: 'Actions',
      edit: 'Modifier',
      resetPassword: 'Réinitialiser MDP',
      restartContainer: 'Redémarrer conteneur',
      pause: 'Pause',
      resume: 'Reprise',
      destroy: 'Détruire',
      confirmRéinitialiser: 'Confirmer la réinitialisation du mot de passe ?',
      confirmRestart: 'Confirmer le redémarrage du conteneur ?',
      confirmDestroy: 'Détruire ce conteneur ?',
      newPassword: 'Nouveau mot de passe',
      roleAdmin: 'Administrateur',
      roleUtilisateur: 'Utilisateur',
      quotaFree: 'Gratuit',
      quotaBasic: 'Basique',
      quotaPro: 'Pro',
      runtimeDedicated: 'Dédié',
      runtimeShared: 'Partagé',
      active: 'Actif',
      inactive: 'Inactif',
      saving: 'Enregistrement...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      created: 'Créé',
      updated: 'Mis à jour',
      signup: 'Inscription',
      lastSeen: 'Vu',
      tokensToday: 'Jetons aujourd\'hui',
      noUtilisateurs: 'Aucun utilisateur',
      prevPage: 'Page précédente',
      nextPage: 'Page suivante',
      pageInfo: 'Page X / Y - Z utilisateurs',
    },
    containers: {
      title: 'Conteneurs runtime',
      user: 'Utilisateur',
      dockerId: 'ID Docker',
      status: 'État',
      port: 'Port',
      created: 'Créé le',
      actions: 'Actions',
      restart: 'Redémarrer',
      pause: 'Pause',
      resume: 'Reprise',
      destroy: 'Détruire',
    },
    auditLog: {
      title: 'Journal d\'audit',
      action: 'Action',
      actor: 'Acteur',
      target: 'Cible',
      timestamp: 'Horodatage',
      details: 'Détails',
      refresh: 'Actualiser',
    },
    usage: {
      title: 'Statistiques d\'utilisation',
      period: 'Période',
      days7: '7 derniers jours',
      days30: '30 derniers jours',
      days90: '90 derniers jours',
      totalTokens: 'Jetons totaux',
      inputTokens: 'Jetons d\'entrée',
      outputTokens: 'Jetons de sortie',
      perDay: 'Par jour',
      topModels: 'Modèles les plus utilisés',
      topUtilisateurs: 'Utilisateurs les plus actifs',
      modelName: 'Modèle',
      usageCount: 'Appels',
    },
    errors: {
      loadFailed: 'Échec du chargement',
      actionFailed: 'Action échouée',
      savedSuccess: 'Modifications enregistrées',
      passwordRéinitialiserSent: 'Mot de passe réinitialisé',
      containerRestarted: 'Conteneur redémarré',
      containerPaused: 'Conteneur mis en pause',
      containerResumed: 'Conteneur repris',
      containerDestroyed: 'Conteneur détruit',
    },
  },

  // Markdown / common
  common: {
    copy: 'Copier',
    copied: 'Copié',
    code: 'code',
    ok: 'OK',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    refresh: 'Actualiser',
    add: 'Ajouter',
    remove: 'Retirer',
    yes: 'Oui',
    no: 'Non',
    enabled: 'Activé',
    disabled: 'Désactivé',
    success: 'Succès',
    error: 'Erreur',
    warning: 'Avertissement',
    info: 'Information',
    noData: 'Aucune donnée',
    loading: 'Chargement...',
  },

  // Tool labels (Chat)
  tools: {
    skill_view: 'Chargement de compétence',
    terminal: 'Exécution de commande',
    run_command: 'Exécution de commande',
    view_file: 'Lecture de fichier',
    write_file: 'Écriture de fichier',
    edit_file: 'Édition de fichier',
    skills_list: 'Liste des compétences',
    web_search: 'Recherche web',
    browser_navigate: 'Navigation web',
    loaded: 'Chargé : ',
    loadFailed: 'Échec du chargement',
  },

  // Slash command categories
  slashCategories: {
    status: 'État',
    session: 'Sessions',
    management: 'Gestion',
    options: 'Options',
    tools: 'Outils',
    media: 'Média',
    skills: 'Compétences',
    docks: 'Canaux',
    other: 'Divers',
  },
};

export type Translations = typeof fr;

let current: Translations = fr;
let fallback: Translations = fr;

export function setLocale(_locale: 'fr'): void {
  current = fr;
}

export function t<K extends keyof Translations>(key: K): Translations[K] {
  return (current[key] ?? fallback[key]) as Translations[K];
}

export function tt(path: string): string {
  const parts = path.split('.');
  let cur: unknown = current;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}
