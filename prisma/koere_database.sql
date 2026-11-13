-- ============================================================
-- KOÈRÊ GMAO — Script de création de base de données MySQL
-- Version : 1.0 | Date : 2026-08-31
-- ============================================================

CREATE DATABASE IF NOT EXISTS koere_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE koere_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────
-- UTILISATEURS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom                     VARCHAR(100)  NOT NULL,
  prenom                  VARCHAR(100)  NOT NULL,
  email                   VARCHAR(150)  NOT NULL UNIQUE,
  telephone               VARCHAR(20)   NULL,
  mot_de_passe            VARCHAR(255)  NOT NULL,
  role                    ENUM('ADMIN','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN','CHAUFFEUR','DIRECTION') NOT NULL,
  departement             VARCHAR(100)  NULL,
  actif                   TINYINT(1)    NOT NULL DEFAULT 1,
  refresh_token           TEXT          NULL,
  tentatives_connexion    INT           NOT NULL DEFAULT 0,
  bloque_jusqu_a          DATETIME      NULL,
  derniere_connexion      DATETIME      NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_users_email   (email),
  INDEX idx_users_role    (role),
  INDEX idx_users_actif   (actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- VÉHICULES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicules (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_interne          VARCHAR(50)   NOT NULL UNIQUE,
  immatriculation         VARCHAR(30)   NOT NULL UNIQUE,
  marque                  VARCHAR(100)  NOT NULL,
  modele                  VARCHAR(100)  NOT NULL,
  type_vehicule           ENUM('VOITURE','CAMION','EQUIPEMENT_SPECIAL','ENGIN_TP') NOT NULL,
  annee                   SMALLINT      NULL,
  departement             VARCHAR(100)  NULL,
  site_geographique       VARCHAR(150)  NULL,
  conducteur_habituel_id  INT UNSIGNED  NULL,
  statut                  ENUM('DISPONIBLE','EN_CIRCULATION','EN_MAINTENANCE','EN_ATTENTE_REPARATION_EXTERNE','EN_ATTENTE_PIECES','IMMOBILISE','ACCIDENTE','HORS_SERVICE') NOT NULL DEFAULT 'DISPONIBLE',
  kilometrage             INT           NOT NULL DEFAULT 0,
  heures_moteur           INT           NOT NULL DEFAULT 0,
  date_mise_en_service    DATE          NULL,
  date_acquisition        DATE          NULL,
  numero_serie            VARCHAR(100)  NULL,
  couleur                 VARCHAR(50)   NULL,
  carburant               ENUM('ESSENCE','DIESEL','ELECTRIQUE','HYBRIDE','GPL') NULL,
  notes                   TEXT          NULL,
  photo_url               VARCHAR(500)  NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_vehicule_conducteur FOREIGN KEY (conducteur_habituel_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_vehicule_statut       (statut),
  INDEX idx_vehicule_type         (type_vehicule),
  INDEX idx_vehicule_conducteur   (conducteur_habituel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- RELEVÉS KILOMÉTRIQUES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS releves_kilometriques (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicule_id     INT UNSIGNED  NOT NULL,
  agent_id        INT UNSIGNED  NOT NULL,
  kilometrage     INT           NOT NULL,
  heures_moteur   INT           NULL,
  date_releve     DATETIME      NOT NULL,
  source          ENUM('MANUEL','MOBILE','GPS') NOT NULL DEFAULT 'MANUEL',
  notes           TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_releve_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,
  CONSTRAINT fk_releve_agent    FOREIGN KEY (agent_id)    REFERENCES users(id),

  INDEX idx_releve_vehicule   (vehicule_id),
  INDEX idx_releve_date       (date_releve)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- INSPECTIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspections (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicule_id             INT UNSIGNED  NOT NULL,
  inspecteur_id           INT UNSIGNED  NOT NULL,
  type_inspection         ENUM('PRE_DEPART','PERIODIQUE','RETOUR_MISSION','TECHNIQUE') NOT NULL DEFAULT 'PRE_DEPART',
  date_inspection         DATETIME      NOT NULL,
  statut                  ENUM('CONFORME','NON_CONFORME','PARTIEL') NOT NULL,
  kilometrage_releve      INT           NULL,
  heures_moteur_releve    INT           NULL,
  notes                   TEXT          NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_inspection_vehicule   FOREIGN KEY (vehicule_id)   REFERENCES vehicules(id) ON DELETE CASCADE,
  CONSTRAINT fk_inspection_inspecteur FOREIGN KEY (inspecteur_id) REFERENCES users(id),

  INDEX idx_inspection_vehicule   (vehicule_id),
  INDEX idx_inspection_date       (date_inspection),
  INDEX idx_inspection_statut     (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspection_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inspection_id   INT UNSIGNED  NOT NULL,
  categorie       VARCHAR(100)  NOT NULL,
  libelle         VARCHAR(255)  NOT NULL,
  resultat        ENUM('OK','KO','NA') NOT NULL,
  observation     TEXT          NULL,
  photo_url       VARCHAR(500)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_item_inspection FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,

  INDEX idx_item_inspection   (inspection_id),
  INDEX idx_item_resultat     (resultat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- DEMANDES D'INTERVENTION (DI)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demandes_intervention (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_di           VARCHAR(30)   NOT NULL UNIQUE,
  vehicule_id         INT UNSIGNED  NOT NULL,
  declarant_id        INT UNSIGNED  NOT NULL,
  inspection_id       INT UNSIGNED  NULL UNIQUE,
  date_signalement    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  localisation        VARCHAR(255)  NULL,
  description         TEXT          NOT NULL,
  priorite            ENUM('FAIBLE','NORMALE','URGENTE','CRITIQUE') NOT NULL DEFAULT 'NORMALE',
  statut              ENUM('EN_ATTENTE','PRISE_EN_CHARGE','TRAITEE','REJETEE') NOT NULL DEFAULT 'EN_ATTENTE',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_di_vehicule     FOREIGN KEY (vehicule_id)   REFERENCES vehicules(id) ON DELETE CASCADE,
  CONSTRAINT fk_di_declarant    FOREIGN KEY (declarant_id)  REFERENCES users(id),
  CONSTRAINT fk_di_inspection   FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL,

  INDEX idx_di_vehicule     (vehicule_id),
  INDEX idx_di_priorite     (priorite),
  INDEX idx_di_statut       (statut),
  INDEX idx_di_date         (date_signalement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS di_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  di_id       INT UNSIGNED  NOT NULL,
  url         VARCHAR(500)  NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_photo_di FOREIGN KEY (di_id) REFERENCES demandes_intervention(id) ON DELETE CASCADE,

  INDEX idx_photo_di (di_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- ORDRES DE TRAVAIL (OT)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordres_travail (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_ot               VARCHAR(30)   NOT NULL UNIQUE,
  di_id                   INT UNSIGNED  NULL,
  vehicule_id             INT UNSIGNED  NOT NULL,
  responsable_id          INT UNSIGNED  NOT NULL,
  type_maintenance        ENUM('PREVENTIVE','CORRECTIVE') NOT NULL,
  statut                  ENUM('EN_ATTENTE_VALIDATION','PLANIFIE','EN_COURS','EN_ATTENTE_PIECES','EN_ATTENTE_PRESTATAIRE','TERMINE','CONTROLE','CLOTURE','ANNULE') NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
  description             TEXT          NULL,
  date_planifiee          DATETIME      NULL,
  date_debut              DATETIME      NULL,
  date_fin                DATETIME      NULL,
  prestataire_externe     VARCHAR(200)  NULL,
  cout_prestataire        DECIMAL(10,2) NULL,
  heures_internes_total   DECIMAL(8,2)  NULL,
  cout_pieces_total       DECIMAL(10,2) NULL,
  notes_controle          TEXT          NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_ot_di           FOREIGN KEY (di_id)           REFERENCES demandes_intervention(id) ON DELETE SET NULL,
  CONSTRAINT fk_ot_vehicule     FOREIGN KEY (vehicule_id)     REFERENCES vehicules(id),
  CONSTRAINT fk_ot_responsable  FOREIGN KEY (responsable_id)  REFERENCES users(id),

  INDEX idx_ot_vehicule     (vehicule_id),
  INDEX idx_ot_statut       (statut),
  INDEX idx_ot_type         (type_maintenance),
  INDEX idx_ot_responsable  (responsable_id),
  INDEX idx_ot_date         (date_planifiee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ot_mecaniciens (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ot_id               INT UNSIGNED  NOT NULL,
  mecanicien_id       INT UNSIGNED  NOT NULL,
  temps_passe         DECIMAL(8,2)  NULL,
  diagnostic          TEXT          NULL,
  travaux_effectues   TEXT          NULL,
  notes               TEXT          NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_otm_ot          FOREIGN KEY (ot_id)         REFERENCES ordres_travail(id) ON DELETE CASCADE,
  CONSTRAINT fk_otm_mecanicien  FOREIGN KEY (mecanicien_id) REFERENCES users(id),
  UNIQUE KEY uk_ot_mecanicien   (ot_id, mecanicien_id),

  INDEX idx_otm_ot          (ot_id),
  INDEX idx_otm_mecanicien  (mecanicien_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ot_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ot_id       INT UNSIGNED  NOT NULL,
  url         VARCHAR(500)  NOT NULL,
  type        ENUM('AVANT','APRES','PIECE') NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_otphoto_ot FOREIGN KEY (ot_id) REFERENCES ordres_travail(id) ON DELETE CASCADE,

  INDEX idx_otphoto_ot (ot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- PLANS DE MAINTENANCE PRÉVENTIVE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans_maintenance (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicule_id                 INT UNSIGNED  NOT NULL,
  type_operation              VARCHAR(200)  NOT NULL,
  description                 TEXT          NULL,
  frequence_km                INT           NULL,
  frequence_jours             INT           NULL,
  derniere_execution_km       INT           NULL,
  derniere_execution_date     DATE          NULL,
  prochaine_execution_km      INT           NULL,
  prochaine_execution_date    DATE          NULL,
  actif                       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at                  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_plan_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,

  INDEX idx_plan_vehicule             (vehicule_id),
  INDEX idx_plan_prochaine_date       (prochaine_execution_date),
  INDEX idx_plan_actif                (actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- STOCKS & PIÈCES DÉTACHÉES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pieces_stock (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference             VARCHAR(100)  NOT NULL UNIQUE,
  designation           VARCHAR(255)  NOT NULL,
  marque                VARCHAR(100)  NULL,
  categorie             VARCHAR(100)  NULL,
  quantite_disponible   INT           NOT NULL DEFAULT 0,
  quantite_minimum      INT           NOT NULL DEFAULT 0,
  unite                 VARCHAR(30)   NOT NULL DEFAULT 'unité',
  emplacement           VARCHAR(100)  NULL,
  prix_unitaire         DECIMAL(10,2) NULL,
  notes                 TEXT          NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_piece_reference   (reference),
  INDEX idx_piece_categorie   (categorie),
  INDEX idx_piece_stock_alerte (quantite_disponible, quantite_minimum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mouvements_stock (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  piece_id        INT UNSIGNED  NOT NULL,
  agent_id        INT UNSIGNED  NOT NULL,
  type_mouvement  ENUM('ENTREE','SORTIE','AJUSTEMENT') NOT NULL,
  quantite        INT           NOT NULL,
  prix_unitaire   DECIMAL(10,2) NULL,
  motif           VARCHAR(255)  NULL,
  date_operation  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_mouv_piece FOREIGN KEY (piece_id) REFERENCES pieces_stock(id),
  CONSTRAINT fk_mouv_agent FOREIGN KEY (agent_id) REFERENCES users(id),

  INDEX idx_mouv_piece    (piece_id),
  INDEX idx_mouv_type     (type_mouvement),
  INDEX idx_mouv_date     (date_operation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ot_pieces (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ot_id           INT UNSIGNED  NOT NULL,
  piece_id        INT UNSIGNED  NOT NULL,
  quantite        INT           NOT NULL,
  prix_unitaire   DECIMAL(10,2) NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_otpiece_ot    FOREIGN KEY (ot_id)    REFERENCES ordres_travail(id) ON DELETE CASCADE,
  CONSTRAINT fk_otpiece_piece FOREIGN KEY (piece_id) REFERENCES pieces_stock(id),

  INDEX idx_otpiece_ot    (ot_id),
  INDEX idx_otpiece_piece (piece_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- ANALYSE AMDEC
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS amdec_analyses (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicule_id             INT UNSIGNED  NOT NULL,
  composant               VARCHAR(200)  NOT NULL,
  mode_defaillance        VARCHAR(255)  NOT NULL,
  effet                   TEXT          NOT NULL,
  cause                   TEXT          NOT NULL,
  frequence               TINYINT       NOT NULL CHECK (frequence BETWEEN 1 AND 5),
  gravite                 TINYINT       NOT NULL CHECK (gravite BETWEEN 1 AND 5),
  detectabilite           TINYINT       NOT NULL CHECK (detectabilite BETWEEN 1 AND 5),
  ipr                     SMALLINT      NOT NULL COMMENT 'frequence * gravite * detectabilite (1-125)',
  actions_recommandees    TEXT          NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_amdec_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE,

  INDEX idx_amdec_vehicule    (vehicule_id),
  INDEX idx_amdec_ipr         (ipr),
  INDEX idx_amdec_composant   (composant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destinataire_id   INT UNSIGNED  NOT NULL,
  type              ENUM('MAINTENANCE_ECHEANCE','STOCK_FAIBLE','ANOMALIE_RECURRENTE','IMMOBILISATION','OT_AFFECTE','OT_STATUT_CHANGE','DI_CREE','GENERAL') NOT NULL,
  titre             VARCHAR(255)  NOT NULL,
  message           TEXT          NOT NULL,
  lu                TINYINT(1)    NOT NULL DEFAULT 0,
  lien              VARCHAR(500)  NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_destinataire FOREIGN KEY (destinataire_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_notif_destinataire    (destinataire_id),
  INDEX idx_notif_lu              (lu),
  INDEX idx_notif_created         (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id      INT UNSIGNED  NULL,
  action              VARCHAR(100)  NOT NULL,
  entite              VARCHAR(100)  NOT NULL,
  entite_id           INT UNSIGNED  NULL,
  anciennes_valeurs   JSON          NULL,
  nouvelles_valeurs   JSON          NULL,
  ip_address          VARCHAR(45)   NULL,
  user_agent          VARCHAR(500)  NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_audit_user    (utilisateur_id),
  INDEX idx_audit_entite  (entite, entite_id),
  INDEX idx_audit_action  (action),
  INDEX idx_audit_date    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────
-- DONNÉES INITIALES
-- ─────────────────────────────────────────────

-- Administrateur par défaut (mot de passe : Admin@koere2026 — À CHANGER EN PRODUCTION)
-- Hash bcrypt de "Admin@koere2026"
INSERT INTO users (nom, prenom, email, mot_de_passe, role, actif)
VALUES (
  'Administrateur',
  'Système',
  'admin@koere.local',
  '$2b$12$placeholder_change_before_deploy',
  'ADMIN',
  1
);
