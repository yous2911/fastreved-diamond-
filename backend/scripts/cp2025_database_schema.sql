-- CP2025 Database Schema
-- Complete educational system for French primary education

-- Drop existing tables if they exist
DROP TABLE IF EXISTS cp2025_exercise_configurations CASCADE;
DROP TABLE IF EXISTS cp2025_exercises CASCADE;
DROP TABLE IF EXISTS cp2025_modules CASCADE;
DROP TABLE IF EXISTS cp2025_competence_codes CASCADE;
DROP TABLE IF EXISTS cp2025_periods CASCADE;
DROP TABLE IF EXISTS cp2025_subjects CASCADE;
DROP TABLE IF EXISTS cp2025_levels CASCADE;

-- Create enum types
CREATE TYPE niveau_scolaire AS ENUM ('CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CP-CE1');
CREATE TYPE matiere AS ENUM ('FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS');
CREATE TYPE periode AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5', 'P1-P2', 'P3-P4', 'P1-P3', 'P2-P4', 'P2-P3', 'P4-P5', 'P5-Synthese', 'Synthese-CE1');
CREATE TYPE difficulte AS ENUM ('decouverte', 'entrainement', 'consolidation', 'approfondissement');
CREATE TYPE type_exercice AS ENUM ('QCM', 'CALCUL', 'DRAG_DROP', 'TEXT_INPUT', 'LECTURE', 'GEOMETRIE', 'PROBLEME');

-- Create tables
CREATE TABLE cp2025_levels (
    id SERIAL PRIMARY KEY,
    code niveau_scolaire NOT NULL UNIQUE,
    nom VARCHAR(50) NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cp2025_subjects (
    id SERIAL PRIMARY KEY,
    code matiere NOT NULL UNIQUE,
    nom VARCHAR(50) NOT NULL,
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cp2025_periods (
    id SERIAL PRIMARY KEY,
    code periode NOT NULL UNIQUE,
    nom VARCHAR(50) NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cp2025_competence_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    niveau niveau_scolaire NOT NULL,
    matiere matiere NOT NULL,
    domaine VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    competence INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cp2025_modules (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    niveau niveau_scolaire NOT NULL,
    matiere matiere NOT NULL,
    periode periode NOT NULL,
    ordre INTEGER NOT NULL,
    competence_domain VARCHAR(20),
    cp2025 BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (niveau) REFERENCES cp2025_levels(code),
    FOREIGN KEY (matiere) REFERENCES cp2025_subjects(code),
    FOREIGN KEY (periode) REFERENCES cp2025_periods(code),
    FOREIGN KEY (competence_domain) REFERENCES cp2025_competence_codes(code)
);

CREATE TABLE cp2025_exercises (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    consigne TEXT NOT NULL,
    type type_exercice NOT NULL,
    difficulte difficulte NOT NULL,
    module_id INTEGER NOT NULL,
    competence_code VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (module_id) REFERENCES cp2025_modules(id) ON DELETE CASCADE,
    FOREIGN KEY (competence_code) REFERENCES cp2025_competence_codes(code)
);

CREATE TABLE cp2025_exercise_configurations (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER NOT NULL,
    configuration_type VARCHAR(50) NOT NULL, -- 'QCM', 'CALCUL', 'DRAG_DROP', etc.
    configuration_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (exercise_id) REFERENCES cp2025_exercises(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_modules_niveau ON cp2025_modules(niveau);
CREATE INDEX idx_modules_matiere ON cp2025_modules(matiere);
CREATE INDEX idx_modules_periode ON cp2025_modules(periode);
CREATE INDEX idx_exercises_module_id ON cp2025_exercises(module_id);
CREATE INDEX idx_exercises_type ON cp2025_exercises(type);
CREATE INDEX idx_exercises_difficulte ON cp2025_exercises(difficulte);
CREATE INDEX idx_exercises_competence_code ON cp2025_exercises(competence_code);
CREATE INDEX idx_configurations_exercise_id ON cp2025_exercise_configurations(exercise_id);

-- Create views for easier querying
CREATE VIEW cp2025_module_exercises AS
SELECT 
    m.id as module_id,
    m.titre as module_titre,
    m.niveau,
    m.matiere,
    m.periode,
    e.id as exercise_id,
    e.titre as exercise_titre,
    e.type,
    e.difficulte,
    e.competence_code,
    ec.configuration_data
FROM cp2025_modules m
JOIN cp2025_exercises e ON m.id = e.module_id
LEFT JOIN cp2025_exercise_configurations ec ON e.id = ec.exercise_id;

-- Create statistics view
CREATE VIEW cp2025_statistics AS
SELECT 
    COUNT(DISTINCT m.id) as total_modules,
    COUNT(DISTINCT e.id) as total_exercises,
    COUNT(DISTINCT CASE WHEN e.difficulte = 'decouverte' THEN e.id END) as decouverte_count,
    COUNT(DISTINCT CASE WHEN e.difficulte = 'entrainement' THEN e.id END) as entrainement_count,
    COUNT(DISTINCT CASE WHEN e.difficulte = 'consolidation' THEN e.id END) as consolidation_count,
    COUNT(DISTINCT CASE WHEN e.difficulte = 'approfondissement' THEN e.id END) as approfondissement_count,
    COUNT(DISTINCT CASE WHEN e.type = 'QCM' THEN e.id END) as qcm_count,
    COUNT(DISTINCT CASE WHEN e.type = 'CALCUL' THEN e.id END) as calcul_count,
    COUNT(DISTINCT CASE WHEN e.type = 'DRAG_DROP' THEN e.id END) as drag_drop_count,
    COUNT(DISTINCT CASE WHEN e.type = 'TEXT_INPUT' THEN e.id END) as text_input_count,
    COUNT(DISTINCT CASE WHEN m.niveau = 'CP' THEN m.id END) as cp_modules,
    COUNT(DISTINCT CASE WHEN m.niveau = 'CP-CE1' THEN m.id END) as cp_ce1_modules,
    COUNT(DISTINCT CASE WHEN m.matiere = 'FRANCAIS' THEN m.id END) as francais_modules,
    COUNT(DISTINCT CASE WHEN m.matiere = 'MATHEMATIQUES' THEN m.id END) as mathematiques_modules
FROM cp2025_modules m
LEFT JOIN cp2025_exercises e ON m.id = e.module_id;

-- Insert initial data
INSERT INTO cp2025_levels (code, nom, description, ordre) VALUES
('CP', 'Cours Préparatoire', 'Première année de l''école primaire', 1),
('CE1', 'Cours Élémentaire 1', 'Deuxième année de l''école primaire', 2),
('CE2', 'Cours Élémentaire 2', 'Troisième année de l''école primaire', 3),
('CM1', 'Cours Moyen 1', 'Quatrième année de l''école primaire', 4),
('CM2', 'Cours Moyen 2', 'Cinquième année de l''école primaire', 5),
('CP-CE1', 'Pont CP-CE1', 'Transition entre CP et CE1', 1);

INSERT INTO cp2025_subjects (code, nom, description, couleur) VALUES
('FRANCAIS', 'Français', 'Langue française, lecture, écriture, grammaire', '#3B82F6'),
('MATHEMATIQUES', 'Mathématiques', 'Nombres, calculs, géométrie, mesures', '#10B981'),
('SCIENCES', 'Sciences', 'Découverte du monde, expérimentation', '#F59E0B'),
('HISTOIRE_GEOGRAPHIE', 'Histoire-Géographie', 'Histoire et géographie', '#EF4444'),
('ANGLAIS', 'Anglais', 'Langue anglaise', '#8B5CF6');

INSERT INTO cp2025_periods (code, nom, description, ordre) VALUES
('P1', 'Période 1', 'Septembre-Octobre', 1),
('P2', 'Période 2', 'Novembre-Décembre', 2),
('P3', 'Période 3', 'Janvier-Février', 3),
('P4', 'Période 4', 'Mars-Avril', 4),
('P5', 'Période 5', 'Mai-Juin', 5),
('P1-P2', 'Périodes 1-2', 'Septembre-Décembre', 1),
('P2-P3', 'Périodes 2-3', 'Novembre-Février', 2),
('P3-P4', 'Périodes 3-4', 'Janvier-Avril', 3),
('P4-P5', 'Périodes 4-5', 'Mars-Juin', 4),
('P5-Synthese', 'Période 5 - Synthèse', 'Mai-Juin - Synthèse', 5),
('Synthese-CE1', 'Synthèse vers CE1', 'Transition vers CE1', 6);

-- Insert competence codes
INSERT INTO cp2025_competence_codes (code, niveau, matiere, domaine, numero, competence, description) VALUES
-- CP French competences
('CP.FR.L1.1', 'CP', 'FRANCAIS', 'L1', 1, 1, 'Reconnaissance des phonèmes'),
('CP.FR.L1.3', 'CP', 'FRANCAIS', 'L1', 1, 3, 'Sons complexes'),
('CP.FR.L1.4', 'CP', 'FRANCAIS', 'L1', 1, 4, 'Graphèmes complexes'),
('CP.FR.L1.5', 'CP', 'FRANCAIS', 'L1', 1, 5, 'Graphèmes complexes avancés'),
('CP.FR.L2.1', 'CP', 'FRANCAIS', 'L2', 2, 1, 'Construction de syllabes'),
('CP.FR.L2.3', 'CP', 'FRANCAIS', 'L2', 2, 3, 'Syllabation'),
('CP.FR.L3.3', 'CP', 'FRANCAIS', 'L3', 3, 3, 'Lecture fluente'),
('CP.FR.L3.4', 'CP', 'FRANCAIS', 'L3', 3, 4, 'Ponctuation'),
('CP.FR.G1.1', 'CP', 'FRANCAIS', 'G1', 1, 1, 'Catégories grammaticales'),
('CP.FR.G1.3', 'CP', 'FRANCAIS', 'G1', 1, 3, 'Accord singulier/pluriel'),
('CP.FR.G1.4', 'CP', 'FRANCAIS', 'G1', 1, 4, 'Accord singulier/pluriel avancé'),
('CP.FR.C1.4', 'CP', 'FRANCAIS', 'C1', 1, 4, 'Connecteurs logiques'),
('CP.FR.C2.4', 'CP', 'FRANCAIS', 'C2', 2, 4, 'Compréhension de l''implicite'),
('CP.FR.E1.6', 'CP', 'FRANCAIS', 'E1', 1, 6, 'Copie et orthographe'),
('CP.FR.E2.2', 'CP', 'FRANCAIS', 'E2', 2, 2, 'Homophones'),
('CP.FR.E3.2', 'CP', 'FRANCAIS', 'E3', 3, 2, 'Production d''écrit'),
('CP.FR.E3.3', 'CP', 'FRANCAIS', 'E3', 3, 3, 'Ponctuation avancée'),

-- CP Mathematics competences
('CP.MA.N1.1', 'CP', 'MATHEMATIQUES', 'N1', 1, 1, 'Dénombrement'),
('CP.MA.N1.4', 'CP', 'MATHEMATIQUES', 'N1', 1, 4, 'Nombres jusqu''à 100'),
('CP.MA.N1.5', 'CP', 'MATHEMATIQUES', 'N1', 1, 5, 'Suite numérique'),
('CP.MA.N2.3', 'CP', 'MATHEMATIQUES', 'N2', 2, 3, 'Décomposition'),
('CP.MA.N3.1', 'CP', 'MATHEMATIQUES', 'N3', 3, 1, 'Calcul mental'),
('CP.MA.N4.2', 'CP', 'MATHEMATIQUES', 'N4', 4, 2, 'Problèmes de recherche'),
('CP.MA.N4.3', 'CP', 'MATHEMATIQUES', 'N4', 4, 3, 'Sens de la multiplication'),
('CP.MA.N4.4', 'CP', 'MATHEMATIQUES', 'N4', 4, 4, 'Sens de la division'),
('CP.MA.P1.2', 'CP', 'MATHEMATIQUES', 'P1', 1, 2, 'Problèmes à étapes'),
('CP.MA.P2.1', 'CP', 'MATHEMATIQUES', 'P2', 2, 1, 'Problèmes de multiplication'),
('CP.MA.P2.2', 'CP', 'MATHEMATIQUES', 'P2', 2, 2, 'Problèmes d''arrangement'),
('CP.MA.P3.2', 'CP', 'MATHEMATIQUES', 'P3', 3, 2, 'Stratégies de résolution'),
('CP.MA.M1.4', 'CP', 'MATHEMATIQUES', 'M1', 1, 4, 'Estimation de longueur'),
('CP.MA.M2.1', 'CP', 'MATHEMATIQUES', 'M2', 2, 1, 'Comparaison de masses'),
('CP.MA.M4.3', 'CP', 'MATHEMATIQUES', 'M4', 4, 3, 'Monnaie'),
('CP.MA.M4.4', 'CP', 'MATHEMATIQUES', 'M4', 4, 4, 'Problèmes de monnaie'),
('CP.MA.G2.1', 'CP', 'MATHEMATIQUES', 'G2', 2, 1, 'Logique spatiale'),
('CP.MA.G2.3', 'CP', 'MATHEMATIQUES', 'G2', 2, 3, 'Reproduction de figures'),
('CP.MA.D1.3', 'CP', 'MATHEMATIQUES', 'D1', 1, 3, 'Lecture de diagrammes'),
('CP.MA.D1.4', 'CP', 'MATHEMATIQUES', 'D1', 1, 4, 'Comparaison de données'),

-- CE1 French competences
('FR.CE1.G1.1', 'CP-CE1', 'FRANCAIS', 'G1', 1, 1, 'Catégories grammaticales'),
('FR.CE1.G1.2', 'CP-CE1', 'FRANCAIS', 'G1', 1, 2, 'Identification du sujet'),
('FR.CE1.G2.1', 'CP-CE1', 'FRANCAIS', 'G2', 2, 1, 'Conjugaison ÊTRE/AVOIR'),
('FR.CE1.G2.2', 'CP-CE1', 'FRANCAIS', 'G2', 2, 2, 'Conjugaison verbes en -er'),
('FR.CE1.C1.4', 'CP-CE1', 'FRANCAIS', 'C1', 1, 4, 'Connecteurs logiques'),
('FR.CE1.E2.3', 'CP-CE1', 'FRANCAIS', 'E2', 2, 3, 'Homophones grammaticaux'),
('FR.CE1.E3.2', 'CP-CE1', 'FRANCAIS', 'E3', 3, 2, 'Production d''écrit guidée'),

-- CE1 Mathematics competences
('MA.CE1.N1.1', 'CP-CE1', 'MATHEMATIQUES', 'N1', 1, 1, 'Nombres jusqu''à 1000'),
('MA.CE1.N3.1', 'CP-CE1', 'MATHEMATIQUES', 'N3', 3, 1, 'Opérations posées'),
('MA.CE1.N3.2', 'CP-CE1', 'MATHEMATIQUES', 'N3', 3, 2, 'Tables de multiplication'),
('MA.CE1.P2.1', 'CP-CE1', 'MATHEMATIQUES', 'P2', 2, 1, 'Problèmes de multiplication'),
('MA.CE1.P3.1', 'CP-CE1', 'MATHEMATIQUES', 'P3', 3, 1, 'Problèmes à étapes multiples'),
('MA.CE1.P3.3', 'CP-CE1', 'MATHEMATIQUES', 'P3', 3, 3, 'Questions cachées'),
('MA.CE1.M3.1', 'CP-CE1', 'MATHEMATIQUES', 'M3', 3, 1, 'Lecture de l''heure'),
('MA.CE1.G3.2', 'CP-CE1', 'MATHEMATIQUES', 'G3', 3, 2, 'Symétrie');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cp2025_modules_updated_at BEFORE UPDATE ON cp2025_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cp2025_exercises_updated_at BEFORE UPDATE ON cp2025_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cp2025_exercise_configurations_updated_at BEFORE UPDATE ON cp2025_exercise_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 