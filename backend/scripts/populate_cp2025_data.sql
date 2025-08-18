-- Populate CP2025 Database with Complete Data
-- This script inserts all modules and exercises from the CP2025 system

-- Insert Modules (10 modules total)
INSERT INTO cp2025_modules (titre, description, niveau, matiere, periode, ordre, competence_domain, metadata) VALUES
-- Module 1: Français CP - Lecture Période 1 & 2
('Français CP - Lecture Période 1 & 2', 'Apprentissage des correspondances graphème-phonème, assemblage de syllabes et compréhension de phrases simples.', 'CP', 'FRANCAIS', 'P1-P2', 1, 'CP.FR.L1.1', '{"competenceDomain": "CP.FR.L1", "cp2025": true}'),

-- Module 2: Mathématiques CP - Nombres et Calculs Période 1 & 2
('Mathématiques CP - Nombres et Calculs Période 1 & 2', 'Construction des nombres, décomposition, calcul mental et résolution de problèmes simples.', 'CP', 'MATHEMATIQUES', 'P1-P2', 2, 'CP.MA.N1.1', '{"competenceDomain": "CP.MA.N1", "cp2025": true}'),

-- Module 3: Français CP - Graphèmes et Sons Complexes
('Français CP - Graphèmes et Sons Complexes', 'Maîtrise des sons complexes (ch, on, an...), accord singulier/pluriel et construction de phrases.', 'CP', 'FRANCAIS', 'P2-P3', 3, 'CP.FR.L1.3', '{"competenceDomain": "CP.FR.L1", "cp2025": true}'),

-- Module 4: Mathématiques CP - Nombres > 60 et Mesures
('Mathématiques CP - Nombres > 60 et Mesures', 'Apprentissage des nombres jusqu''à 100, des doubles/moitiés, et initiation aux grandeurs (longueur, temps, monnaie).', 'CP', 'MATHEMATIQUES', 'P3-P4', 4, 'CP.MA.N1.4', '{"competenceDomain": "CP.MA.N1", "cp2025": true}'),

-- Module 5: Français CP - Maîtrise et Automatisation
('Français CP - Maîtrise et Automatisation', 'Lecture fluente, compréhension de l''implicite, graphèmes complexes et production de textes courts.', 'CP', 'FRANCAIS', 'P4-P5', 5, 'CP.FR.L1.4', '{"competenceDomain": "CP.FR.L1", "cp2025": true}'),

-- Module 6: Mathématiques CP - Vers la Multiplication et les Données
('Mathématiques CP - Vers la Multiplication et les Données', 'Sens de la multiplication et de la division, problèmes à étapes, et lecture de graphiques.', 'CP', 'MATHEMATIQUES', 'P4-P5', 6, 'CP.MA.N4.3', '{"competenceDomain": "CP.MA.N4", "cp2025": true}'),

-- Module 7: Français CP - Logique et Raisonnement
('Français CP - Logique et Raisonnement', 'Application des compétences de lecture et d''écriture à des problèmes de logique, de catégorisation et de compréhension fine.', 'CP', 'FRANCAIS', 'P5-Synthese', 7, 'CP.FR.C2.4', '{"competenceDomain": "CP.FR.C2", "cp2025": true}'),

-- Module 8: Mathématiques CP - Stratégies de Résolution
('Mathématiques CP - Stratégies de Résolution', 'Développement de la flexibilité mentale en mathématiques : problèmes à étapes, problèmes inversés et raisonnement logique.', 'CP', 'MATHEMATIQUES', 'P5-Synthese', 8, 'CP.MA.P3.2', '{"competenceDomain": "CP.MA.P3", "cp2025": true}'),

-- Module 9: Français - Pont vers le CE1
('Français - Pont vers le CE1', 'Introduction à la conjugaison, aux homophones grammaticaux et à la structure des phrases complexes.', 'CP-CE1', 'FRANCAIS', 'Synthese-CE1', 9, 'FR.CE1.G1.1', '{"competenceDomain": "FR.CE1.G1", "cp2025": true}'),

-- Module 10: Mathématiques - Pont vers le CE1
('Mathématiques - Pont vers le CE1', 'Découverte des nombres jusqu''à 1000, des opérations posées, des tables de multiplication et de la lecture précise de l''heure.', 'CP-CE1', 'MATHEMATIQUES', 'Synthese-CE1', 10, 'MA.CE1.N1.1', '{"competenceDomain": "MA.CE1.N1", "cp2025": true}');

-- Insert Exercises for Module 1 (Français CP - Lecture Période 1 & 2)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Reconnaissance du son [o]', 'Écoute le mot. Entends-tu le son [o] ?', 'QCM', 'decouverte', 1, 'CP.FR.L1.1', '{"competenceCode": "CP.FR.L1.1"}'),
('Construction de la syllabe ''RI''', 'Assemble les lettres pour former la syllabe ''RI''.', 'DRAG_DROP', 'decouverte', 1, 'CP.FR.L2.1', '{"competenceCode": "CP.FR.L2.1"}'),
('Lecture de mots simples', 'Lis le mot et choisis l''image correspondante.', 'QCM', 'entrainement', 1, 'CP.FR.L1.1', '{"competenceCode": "CP.FR.L1.1"}'),
('Accord singulier/pluriel', 'Complète la phrase avec le bon accord.', 'TEXT_INPUT', 'entrainement', 1, 'CP.FR.G1.3', '{"competenceCode": "CP.FR.G1.3"}'),
('Compréhension de phrase', 'Lis la phrase et réponds à la question.', 'QCM', 'consolidation', 1, 'CP.FR.L3.3', '{"competenceCode": "CP.FR.L3.3"}');

-- Insert Exercises for Module 2 (Mathématiques CP - Nombres et Calculs Période 1 & 2)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Dénombrer jusqu''à 10', 'Compte les jetons et choisis le bon nombre.', 'QCM', 'decouverte', 2, 'CP.MA.N1.1', '{"competenceCode": "CP.MA.N1.1"}'),
('Addition simple', 'Calcule cette addition.', 'CALCUL', 'decouverte', 2, 'CP.MA.N3.1', '{"competenceCode": "CP.MA.N3.1"}'),
('Décomposition de nombres', 'Décompose le nombre en dizaines et unités.', 'DRAG_DROP', 'entrainement', 2, 'CP.MA.N2.3', '{"competenceCode": "CP.MA.N2.3"}'),
('Problème simple', 'Lis le problème et calcule la réponse.', 'CALCUL', 'entrainement', 2, 'CP.MA.P1.2', '{"competenceCode": "CP.MA.P1.2"}'),
('Suite numérique', 'Complète la suite de nombres.', 'TEXT_INPUT', 'consolidation', 2, 'CP.MA.N1.5', '{"competenceCode": "CP.MA.N1.5"}');

-- Insert Exercises for Module 3 (Français CP - Graphèmes et Sons Complexes)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Le son [ʃ] (ch)', 'Où entends-tu le son [ʃ] comme dans ''chat'' ?', 'QCM', 'decouverte', 3, 'CP.FR.L1.3', '{"competenceCode": "CP.FR.L1.3"}'),
('Le son [ɔ̃] (on)', 'Où entends-tu le son [ɔ̃] comme dans ''pont'' ?', 'QCM', 'decouverte', 3, 'CP.FR.L1.3', '{"competenceCode": "CP.FR.L1.3"}'),
('Construction de mots', 'Assemble les syllabes pour former le mot.', 'DRAG_DROP', 'entrainement', 3, 'CP.FR.L2.1', '{"competenceCode": "CP.FR.L2.1"}'),
('Orthographe des sons complexes', 'Écris le mot que tu entends.', 'TEXT_INPUT', 'entrainement', 3, 'CP.FR.L1.4', '{"competenceCode": "CP.FR.L1.4"}'),
('Lecture de phrases', 'Lis la phrase et réponds à la question.', 'QCM', 'consolidation', 3, 'CP.FR.L3.3', '{"competenceCode": "CP.FR.L3.3"}');

-- Insert Exercises for Module 4 (Mathématiques CP - Nombres > 60 et Mesures)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Nombres jusqu''à 100', 'Écris le nombre en chiffres.', 'TEXT_INPUT', 'decouverte', 4, 'CP.MA.N1.4', '{"competenceCode": "CP.MA.N1.4"}'),
('Les doubles', 'Calcule le double de ce nombre.', 'CALCUL', 'decouverte', 4, 'CP.MA.N3.1', '{"competenceCode": "CP.MA.N3.1"}'),
('Mesurer une longueur', 'Mesure la longueur de l''objet.', 'QCM', 'entrainement', 4, 'CP.MA.M1.4', '{"competenceCode": "CP.MA.M1.4"}'),
('Problème de monnaie', 'Calcule combien ça coûte.', 'CALCUL', 'entrainement', 4, 'CP.MA.M4.3', '{"competenceCode": "CP.MA.M4.3"}'),
('Lire l''heure', 'Quelle heure est-il ?', 'QCM', 'consolidation', 4, 'CP.MA.M3.1', '{"competenceCode": "CP.MA.M3.1"}');

-- Insert Exercises for Module 5 (Français CP - Maîtrise et Automatisation)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Reconnaissance du son [ɛj] (eil)', 'Dans quel mot entends-tu le son [ɛj] comme dans ''réveil'' ?', 'QCM', 'decouverte', 5, 'CP.FR.L1.4', '{"competenceCode": "CP.FR.L1.4"}'),
('Le son de ''ss''', 'Où le ''s'' fait-il le son [s] comme dans ''serpent'' ?', 'QCM', 'decouverte', 5, 'CP.FR.L1.4', '{"competenceCode": "CP.FR.L1.4"}'),
('Comprendre le connecteur ''mais''', 'Lis la phrase et réponds à la question.', 'QCM', 'decouverte', 5, 'CP.FR.C1.4', '{"competenceCode": "CP.FR.C1.4"}'),
('Correspondance ''ph'' -> [f]', 'Dans quel mot les lettres ''ph'' font-elles le son [f] ?', 'QCM', 'entrainement', 5, 'CP.FR.L1.5', '{"competenceCode": "CP.FR.L1.5"}'),
('Utiliser la ponctuation', 'Quelle ponctuation faut-il à la fin de cette phrase ?', 'QCM', 'entrainement', 5, 'CP.FR.L3.4', '{"competenceCode": "CP.FR.L3.4"}'),
('Repérer une erreur de copie', 'Trouve l''erreur dans la phrase copiée.', 'TEXT_INPUT', 'entrainement', 5, 'CP.FR.E1.6', '{"competenceCode": "CP.FR.E1.6"}'),
('Comprendre l''implicite', 'Lis la situation et déduis la réponse.', 'QCM', 'consolidation', 5, 'CP.FR.C2.4', '{"competenceCode": "CP.FR.C2.4"}'),
('Rédiger un texte court', 'Mets les deux phrases dans le bon ordre pour raconter une petite histoire.', 'DRAG_DROP', 'consolidation', 5, 'CP.FR.E3.2', '{"competenceCode": "CP.FR.E3.2"}'),
('Orthographier un mot avec ''ill''', 'Écris le mot que tu entends : ''fille''', 'TEXT_INPUT', 'consolidation', 5, 'CP.FR.L1.4', '{"competenceCode": "CP.FR.L1.4"}'),
('Lecture fluente et compréhension fine', 'Lis le petit texte et réponds à la question.', 'QCM', 'consolidation', 5, 'CP.FR.L3.3', '{"competenceCode": "CP.FR.L3.3"}');

-- Insert Exercises for Module 6 (Mathématiques CP - Vers la Multiplication et les Données)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Sens de la multiplication', 'Quelle opération correspond à l''image ?', 'QCM', 'decouverte', 6, 'CP.MA.N4.3', '{"competenceCode": "CP.MA.N4.3"}'),
('Sens de la division (partage)', 'Lis la situation et choisis la bonne image.', 'QCM', 'decouverte', 6, 'CP.MA.N4.4', '{"competenceCode": "CP.MA.N4.4"}'),
('Comparer des masses', 'Clique sur l''objet le plus lourd.', 'QCM', 'decouverte', 6, 'CP.MA.M2.1', '{"competenceCode": "CP.MA.M2.1"}'),
('Lire un diagramme simple', 'Observe le graphique et réponds.', 'QCM', 'decouverte', 6, 'CP.MA.D1.3', '{"competenceCode": "CP.MA.D1.3"}'),
('Problème de multiplication', 'Calcule le nombre total d''objets.', 'CALCUL', 'entrainement', 6, 'CP.MA.P2.1', '{"competenceCode": "CP.MA.P2.1"}'),
('Décomposer un nombre < 100', 'Décompose le nombre en dizaines et unités.', 'DRAG_DROP', 'entrainement', 6, 'CP.MA.N2.3', '{"competenceCode": "CP.MA.N2.3"}'),
('Rendre la monnaie', 'Calcule la monnaie rendue.', 'CALCUL', 'entrainement', 6, 'CP.MA.M4.3', '{"competenceCode": "CP.MA.M4.3"}'),
('Reproduire une figure', 'Reproduis la figure sur le quadrillage de droite.', 'DRAG_DROP', 'entrainement', 6, 'CP.MA.G2.3', '{"competenceCode": "CP.MA.G2.3"}'),
('Problème d''arrangement', 'Lis le problème et trouve le nombre total.', 'CALCUL', 'consolidation', 6, 'CP.MA.P2.2', '{"competenceCode": "CP.MA.P2.2"}'),
('Compléter une suite numérique', 'Écris le nombre qui manque dans la suite.', 'TEXT_INPUT', 'consolidation', 6, 'CP.MA.N1.5', '{"competenceCode": "CP.MA.N1.5"}'),
('Comparer des données dans un graphique', 'Observe le graphique et réponds à la question.', 'CALCUL', 'consolidation', 6, 'CP.MA.D1.4', '{"competenceCode": "CP.MA.D1.4"}');

-- Insert Exercises for Module 7 (Français CP - Logique et Raisonnement)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('L''intrus sonore', 'Écoute bien les mots. Lequel ne contient pas le son [a] ?', 'QCM', 'decouverte', 7, 'CP.FR.L1.1', '{"competenceCode": "CP.FR.L1.1"}'),
('L''intrus dans la phrase', 'Quel mot n''est pas un nom d''objet dans cette liste ?', 'QCM', 'decouverte', 7, 'CP.FR.G1.1', '{"competenceCode": "CP.FR.G1.1"}'),
('Logique de ponctuation', 'Choisis le bon point pour terminer la phrase.', 'QCM', 'decouverte', 7, 'CP.FR.E3.3', '{"competenceCode": "CP.FR.E3.3"}'),
('Vérifier sa lecture', 'Lis le mot et dis si l''affirmation est vraie ou fausse.', 'QCM', 'decouverte', 7, 'CP.FR.L2.3', '{"competenceCode": "CP.FR.L2.3"}'),
('Corriger l''accord', 'Il y a une erreur dans la phrase. Réécris le mot correct.', 'TEXT_INPUT', 'entrainement', 7, 'CP.FR.G1.4', '{"competenceCode": "CP.FR.G1.4"}'),
('Trouver la bonne question', 'Lis la situation et la réponse. Quelle question a-t-on bien pu poser ?', 'QCM', 'entrainement', 7, 'CP.FR.C2.4', '{"competenceCode": "CP.FR.C2.4"}'),
('Associer cause et conséquence', 'Relie la cause (ce qui se passe en premier) à sa conséquence logique.', 'DRAG_DROP', 'entrainement', 7, 'CP.FR.C1.4', '{"competenceCode": "CP.FR.C1.4"}'),
('Inférence avancée', 'Lis la situation et choisis ce qu''il s''est probablement passé.', 'QCM', 'consolidation', 7, 'CP.FR.C2.4', '{"competenceCode": "CP.FR.C2.4"}'),
('Analyse grammaticale', 'Fais glisser chaque mot de la phrase dans la bonne catégorie.', 'DRAG_DROP', 'consolidation', 7, 'CP.FR.G1.1', '{"competenceCode": "CP.FR.G1.1"}'),
('Les homophones a / à', 'Complète la phrase avec le bon mot : ''a'' ou ''à''.', 'QCM', 'consolidation', 7, 'CP.FR.E2.2', '{"competenceCode": "CP.FR.E2.2"}'),
('Production d''écrit guidée', 'Regarde l''image et écris une phrase complète pour la décrire.', 'TEXT_INPUT', 'consolidation', 7, 'CP.FR.E3.2', '{"competenceCode": "CP.FR.E3.2"}');

-- Insert Exercises for Module 8 (Mathématiques CP - Stratégies de Résolution)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Vrai ou Faux ? Ordre des nombres', 'Cette affirmation est-elle vraie ou fausse ?', 'QCM', 'decouverte', 8, 'CP.MA.N1.5', '{"competenceCode": "CP.MA.N1.5"}'),
('Quelle opération choisir ?', 'Pour résoudre ce problème, quelle opération dois-tu utiliser ?', 'QCM', 'decouverte', 8, 'CP.MA.P3.2', '{"competenceCode": "CP.MA.P3.2"}'),
('L''intrus des formes', 'Clique sur la forme qui n''est pas une figure plane.', 'QCM', 'decouverte', 8, 'CP.MA.G1.2', '{"competenceCode": "CP.MA.G1.2"}'),
('Problème inversé', 'Trouve l''opération qui donne le bon résultat.', 'QCM', 'entrainement', 8, 'CP.MA.N3.1', '{"competenceCode": "CP.MA.N3.1"}'),
('Suite logique de nombres', 'Observe bien la suite et trouve le nombre manquant.', 'TEXT_INPUT', 'entrainement', 8, 'CP.MA.N1.5', '{"competenceCode": "CP.MA.N1.5"}'),
('Vrai ou Faux ? Problème de monnaie', 'Lis l''affirmation et dis si elle est vraie ou fausse.', 'QCM', 'entrainement', 8, 'CP.MA.M4.4', '{"competenceCode": "CP.MA.M4.4"}'),
('Estimer une longueur', 'Sans mesurer, essaie d''estimer la longueur de la gomme.', 'QCM', 'entrainement', 8, 'CP.MA.M1.4', '{"competenceCode": "CP.MA.M1.4"}'),
('Problème à deux étapes', 'Lis bien le problème et calcule le résultat final.', 'CALCUL', 'consolidation', 8, 'CP.MA.P1.2', '{"competenceCode": "CP.MA.P1.2"}'),
('Interpréter un graphique', 'Observe le graphique et choisis l''affirmation qui est VRAIE.', 'QCM', 'consolidation', 8, 'CP.MA.D1.4', '{"competenceCode": "CP.MA.D1.4"}'),
('Logique spatiale complexe', 'Suis les instructions pour placer les objets correctement.', 'DRAG_DROP', 'consolidation', 8, 'CP.MA.G2.1', '{"competenceCode": "CP.MA.G2.1"}');

-- Insert Exercises for Module 9 (Français - Pont vers le CE1)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Découverte de la conjugaison : ÊTRE', 'Choisis la bonne forme du verbe ''être'' pour compléter la phrase.', 'QCM', 'decouverte', 9, 'FR.CE1.G2.1', '{"competenceCode": "FR.CE1.G2.1"}'),
('Trouver le sujet du verbe', 'Dans la phrase, qui fait l''action ?', 'QCM', 'decouverte', 9, 'FR.CE1.G1.2', '{"competenceCode": "FR.CE1.G1.2"}'),
('Homophones : et / est', 'Choisis les bons mots pour compléter la phrase.', 'QCM', 'decouverte', 9, 'FR.CE1.E2.3', '{"competenceCode": "FR.CE1.E2.3"}'),
('L''intrus des verbes', 'Quel mot n''est pas un verbe (une action) ?', 'QCM', 'decouverte', 9, 'FR.CE1.G1.1', '{"competenceCode": "FR.CE1.G1.1"}'),
('Conjugaison : AVOIR au présent', 'Écris la bonne forme du verbe ''avoir''.', 'TEXT_INPUT', 'entrainement', 9, 'FR.CE1.G2.1', '{"competenceCode": "FR.CE1.G2.1"}'),
('Logique de phrase : ''parce que''', 'Construis une phrase logique en utilisant ''parce que''.', 'DRAG_DROP', 'entrainement', 9, 'FR.CE1.C1.4', '{"competenceCode": "FR.CE1.C1.4"}'),
('Homophones : son / sont', 'Choisis les bons mots pour compléter la phrase.', 'QCM', 'entrainement', 9, 'FR.CE1.E2.3', '{"competenceCode": "FR.CE1.E2.3"}'),
('Conjugaison : Verbes en -er', 'Choisis la bonne terminaison pour chaque verbe.', 'QCM', 'consolidation', 9, 'FR.CE1.G2.2', '{"competenceCode": "FR.CE1.G2.2"}'),
('Homophones : on / ont', 'Complète la phrase avec ''on'' ou ''ont''.', 'QCM', 'consolidation', 9, 'FR.CE1.E2.3', '{"competenceCode": "FR.CE1.E2.3"}'),
('Raconter une histoire en images', 'Regarde les 3 images et écris une petite histoire de trois phrases.', 'TEXT_INPUT', 'consolidation', 9, 'FR.CE1.E3.2', '{"competenceCode": "FR.CE1.E3.2"}');

-- Insert Exercises for Module 10 (Mathématiques - Pont vers le CE1)
INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata) VALUES
('Découverte des nombres > 100', 'Comment s''écrit ce nombre en chiffres ?', 'QCM', 'decouverte', 10, 'MA.CE1.N1.1', '{"competenceCode": "MA.CE1.N1.1"}'),
('Découverte de la table de 2', 'Calcule cette multiplication.', 'CALCUL', 'decouverte', 10, 'MA.CE1.N3.2', '{"competenceCode": "MA.CE1.N3.2"}'),
('Lire la demi-heure', 'Regarde l''horloge et choisis la bonne heure.', 'QCM', 'decouverte', 10, 'MA.CE1.M3.1', '{"competenceCode": "MA.CE1.M3.1"}'),
('L''addition posée avec retenue', 'Résous l''addition. N''oublie pas la retenue !', 'CALCUL', 'entrainement', 10, 'MA.CE1.N3.1', '{"competenceCode": "MA.CE1.N3.1"}'),
('Problème : la table de 5', 'Lis le problème et trouve la solution.', 'CALCUL', 'entrainement', 10, 'MA.CE1.P2.1', '{"competenceCode": "MA.CE1.P2.1"}'),
('Découverte de la symétrie', 'Cette figure a-t-elle un axe de symétrie ?', 'QCM', 'entrainement', 10, 'MA.CE1.G3.2', '{"competenceCode": "MA.CE1.G3.2"}'),
('Soustraction posée simple', 'Calcule cette soustraction.', 'CALCUL', 'entrainement', 10, 'MA.CE1.N3.1', '{"competenceCode": "MA.CE1.N3.1"}'),
('Problème à étapes multiples', 'Lis bien le problème et calcule la réponse finale.', 'CALCUL', 'consolidation', 10, 'MA.CE1.P3.1', '{"competenceCode": "MA.CE1.P3.1"}'),
('La soustraction avec retenue', 'Résous cette soustraction posée.', 'CALCUL', 'consolidation', 10, 'MA.CE1.N3.1', '{"competenceCode": "MA.CE1.N3.1"}'),
('Trouver la question cachée', 'Lis le texte, puis trouve la question qui correspond à la réponse donnée.', 'QCM', 'consolidation', 10, 'MA.CE1.P3.3', '{"competenceCode": "MA.CE1.P3.3"}'),
('Lire les quarts d''heure', 'Quelle heure est-il sur cette horloge ?', 'QCM', 'consolidation', 10, 'MA.CE1.M3.1', '{"competenceCode": "MA.CE1.M3.1"}');

-- Insert Exercise Configurations (sample configurations for key exercises)
INSERT INTO cp2025_exercise_configurations (exercise_id, configuration_type, configuration_data) VALUES
-- QCM Configuration Example
(1, 'QCM', '{"question": "Entends-tu le son [o] dans ''MOTO'' ?", "choix": ["Oui", "Non"], "bonneReponse": "Oui", "audioRequired": true}'),

-- Drag & Drop Configuration Example
(2, 'DRAG_DROP', '{"question": "Forme la syllabe ''RI''", "dragItems": [{"id": "r", "content": "R"}, {"id": "i", "content": "I"}, {"id": "a", "content": "A"}], "zones": [{"id": "syllabe", "label": "Syllabe", "limit": 2}], "solution": ["R", "I"]}'),

-- Calcul Configuration Example
(6, 'CALCUL', '{"question": "Calcule cette addition.", "operation": "5 + 3", "resultat": 8}'),

-- Text Input Configuration Example
(4, 'TEXT_INPUT', '{"question": "Complète la phrase avec le bon accord.", "inputType": "keyboard", "bonneReponse": "chats"}'),

-- QCM with Image Configuration Example
(11, 'QCM', '{"question": "Combien y a-t-il de jetons ?", "image_url": "/images/exercises/jetons_9.png", "choix": ["7", "8", "9", "10"], "bonneReponse": "9"}');

-- Create a summary view for quick statistics
CREATE VIEW cp2025_summary AS
SELECT 
    'Total Modules' as metric,
    COUNT(*) as value
FROM cp2025_modules
UNION ALL
SELECT 
    'Total Exercises' as metric,
    COUNT(*) as value
FROM cp2025_exercises
UNION ALL
SELECT 
    'CP Modules' as metric,
    COUNT(*) as value
FROM cp2025_modules
WHERE niveau = 'CP'
UNION ALL
SELECT 
    'CP-CE1 Bridge Modules' as metric,
    COUNT(*) as value
FROM cp2025_modules
WHERE niveau = 'CP-CE1'
UNION ALL
SELECT 
    'French Exercises' as metric,
    COUNT(*) as value
FROM cp2025_exercises e
JOIN cp2025_modules m ON e.module_id = m.id
WHERE m.matiere = 'FRANCAIS'
UNION ALL
SELECT 
    'Mathematics Exercises' as metric,
    COUNT(*) as value
FROM cp2025_exercises e
JOIN cp2025_modules m ON e.module_id = m.id
WHERE m.matiere = 'MATHEMATIQUES';

-- Display summary
SELECT * FROM cp2025_summary ORDER BY metric; 