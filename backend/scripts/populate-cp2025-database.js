#!/usr/bin/env node

/**
 * CP2025 Database Population Script
 * Populates the database with all modules and exercises from the CP2025 system
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fastrevedkids',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const pool = new Pool(dbConfig);

// CP2025 Data Structure
const cp2025Data = {
  modules: [
    {
      id: 1,
      titre: "Français CP - Lecture Période 1 & 2",
      description: "Apprentissage des correspondances graphème-phonème, assemblage de syllabes et compréhension de phrases simples.",
      niveau: "CP",
      matiere: "FRANCAIS",
      periode: "P1-P2",
      ordre: 1,
      competence_domain: "CP.FR.L1.1",
      metadata: { competenceDomain: "CP.FR.L1", cp2025: true }
    },
    {
      id: 2,
      titre: "Mathématiques CP - Nombres et Calculs Période 1 & 2",
      description: "Construction des nombres, décomposition, calcul mental et résolution de problèmes simples.",
      niveau: "CP",
      matiere: "MATHEMATIQUES",
      periode: "P1-P2",
      ordre: 2,
      competence_domain: "CP.MA.N1.1",
      metadata: { competenceDomain: "CP.MA.N1", cp2025: true }
    },
    {
      id: 3,
      titre: "Français CP - Graphèmes et Sons Complexes",
      description: "Maîtrise des sons complexes (ch, on, an...), accord singulier/pluriel et construction de phrases.",
      niveau: "CP",
      matiere: "FRANCAIS",
      periode: "P2-P3",
      ordre: 3,
      competence_domain: "CP.FR.L1.3",
      metadata: { competenceDomain: "CP.FR.L1", cp2025: true }
    },
    {
      id: 4,
      titre: "Mathématiques CP - Nombres > 60 et Mesures",
      description: "Apprentissage des nombres jusqu'à 100, des doubles/moitiés, et initiation aux grandeurs (longueur, temps, monnaie).",
      niveau: "CP",
      matiere: "MATHEMATIQUES",
      periode: "P3-P4",
      ordre: 4,
      competence_domain: "CP.MA.N1.4",
      metadata: { competenceDomain: "CP.MA.N1", cp2025: true }
    },
    {
      id: 5,
      titre: "Français CP - Maîtrise et Automatisation",
      description: "Lecture fluente, compréhension de l'implicite, graphèmes complexes et production de textes courts.",
      niveau: "CP",
      matiere: "FRANCAIS",
      periode: "P4-P5",
      ordre: 5,
      competence_domain: "CP.FR.L1.4",
      metadata: { competenceDomain: "CP.FR.L1", cp2025: true }
    },
    {
      id: 6,
      titre: "Mathématiques CP - Vers la Multiplication et les Données",
      description: "Sens de la multiplication et de la division, problèmes à étapes, et lecture de graphiques.",
      niveau: "CP",
      matiere: "MATHEMATIQUES",
      periode: "P4-P5",
      ordre: 6,
      competence_domain: "CP.MA.N4.3",
      metadata: { competenceDomain: "CP.MA.N4", cp2025: true }
    },
    {
      id: 7,
      titre: "Français CP - Logique et Raisonnement",
      description: "Application des compétences de lecture et d'écriture à des problèmes de logique, de catégorisation et de compréhension fine.",
      niveau: "CP",
      matiere: "FRANCAIS",
      periode: "P5-Synthese",
      ordre: 7,
      competence_domain: "CP.FR.C2.4",
      metadata: { competenceDomain: "CP.FR.C2", cp2025: true }
    },
    {
      id: 8,
      titre: "Mathématiques CP - Stratégies de Résolution",
      description: "Développement de la flexibilité mentale en mathématiques : problèmes à étapes, problèmes inversés et raisonnement logique.",
      niveau: "CP",
      matiere: "MATHEMATIQUES",
      periode: "P5-Synthese",
      ordre: 8,
      competence_domain: "CP.MA.P3.2",
      metadata: { competenceDomain: "CP.MA.P3", cp2025: true }
    },
    {
      id: 9,
      titre: "Français - Pont vers le CE1",
      description: "Introduction à la conjugaison, aux homophones grammaticaux et à la structure des phrases complexes.",
      niveau: "CP-CE1",
      matiere: "FRANCAIS",
      periode: "Synthese-CE1",
      ordre: 9,
      competence_domain: "FR.CE1.G1.1",
      metadata: { competenceDomain: "FR.CE1.G1", cp2025: true }
    },
    {
      id: 10,
      titre: "Mathématiques - Pont vers le CE1",
      description: "Découverte des nombres jusqu'à 1000, des opérations posées, des tables de multiplication et de la lecture précise de l'heure.",
      niveau: "CP-CE1",
      matiere: "MATHEMATIQUES",
      periode: "Synthese-CE1",
      ordre: 10,
      competence_domain: "MA.CE1.N1.1",
      metadata: { competenceDomain: "MA.CE1.N1", cp2025: true }
    }
  ],
  exercises: [
    // Module 1 Exercises
    {
      titre: "Reconnaissance du son [o]",
      consigne: "Écoute le mot. Entends-tu le son [o] ?",
      type: "QCM",
      difficulte: "decouverte",
      module_id: 1,
      competence_code: "CP.FR.L1.1",
      metadata: { competenceCode: "CP.FR.L1.1" },
      configuration: {
        question: "Entends-tu le son [o] dans 'MOTO' ?",
        choix: ["Oui", "Non"],
        bonneReponse: "Oui",
        audioRequired: true
      }
    },
    {
      titre: "Construction de la syllabe 'RI'",
      consigne: "Assemble les lettres pour former la syllabe 'RI'.",
      type: "DRAG_DROP",
      difficulte: "decouverte",
      module_id: 1,
      competence_code: "CP.FR.L2.1",
      metadata: { competenceCode: "CP.FR.L2.1" },
      configuration: {
        question: "Forme la syllabe 'RI'",
        dragItems: [{id: "r", content: "R"}, {id: "i", content: "I"}, {id: "a", content: "A"}],
        zones: [{id: "syllabe", label: "Syllabe", limit: 2}],
        solution: ["R", "I"]
      }
    },
    {
      titre: "Lecture de mots simples",
      consigne: "Lis le mot et choisis l'image correspondante.",
      type: "QCM",
      difficulte: "entrainement",
      module_id: 1,
      competence_code: "CP.FR.L1.1",
      metadata: { competenceCode: "CP.FR.L1.1" },
      configuration: {
        question: "Quelle image correspond au mot 'CHAT' ?",
        image_url: "/images/exercises/chat.png",
        choix: ["Image 1", "Image 2", "Image 3", "Image 4"],
        bonneReponse: "Image 1"
      }
    },
    {
      titre: "Accord singulier/pluriel",
      consigne: "Complète la phrase avec le bon accord.",
      type: "TEXT_INPUT",
      difficulte: "entrainement",
      module_id: 1,
      competence_code: "CP.FR.G1.3",
      metadata: { competenceCode: "CP.FR.G1.3" },
      configuration: {
        question: "Complète : 'Les ___ sont mignons.'",
        inputType: "keyboard",
        bonneReponse: "chats"
      }
    },
    {
      titre: "Compréhension de phrase",
      consigne: "Lis la phrase et réponds à la question.",
      type: "QCM",
      difficulte: "consolidation",
      module_id: 1,
      competence_code: "CP.FR.L3.3",
      metadata: { competenceCode: "CP.FR.L3.3" },
      configuration: {
        question: "Qui mange dans la phrase 'Le chat mange sa nourriture' ?",
        choix: ["Le chat", "La nourriture", "Le propriétaire"],
        bonneReponse: "Le chat"
      }
    },

    // Module 2 Exercises
    {
      titre: "Dénombrer jusqu'à 10",
      consigne: "Compte les jetons et choisis le bon nombre.",
      type: "QCM",
      difficulte: "decouverte",
      module_id: 2,
      competence_code: "CP.MA.N1.1",
      metadata: { competenceCode: "CP.MA.N1.1" },
      configuration: {
        question: "Combien y a-t-il de jetons ?",
        image_url: "/images/exercises/jetons_9.png",
        choix: ["7", "8", "9", "10"],
        bonneReponse: "9"
      }
    },
    {
      titre: "Addition simple",
      consigne: "Calcule cette addition.",
      type: "CALCUL",
      difficulte: "decouverte",
      module_id: 2,
      competence_code: "CP.MA.N3.1",
      metadata: { competenceCode: "CP.MA.N3.1" },
      configuration: {
        question: "Calcule : 5 + 3",
        operation: "5 + 3",
        resultat: 8
      }
    },
    {
      titre: "Décomposition de nombres",
      consigne: "Décompose le nombre en dizaines et unités.",
      type: "DRAG_DROP",
      difficulte: "entrainement",
      module_id: 2,
      competence_code: "CP.MA.N2.3",
      metadata: { competenceCode: "CP.MA.N2.3" },
      configuration: {
        question: "Décompose le nombre 25",
        dragItems: [{id: "20", content: "20"}, {id: "5", content: "5"}],
        zones: [{id: "dizaines", label: "Dizaines"}, {id: "unites", label: "Unités"}],
        solution: ["20", "5"]
      }
    },
    {
      titre: "Problème simple",
      consigne: "Lis le problème et calcule la réponse.",
      type: "CALCUL",
      difficulte: "entrainement",
      module_id: 2,
      competence_code: "CP.MA.P1.2",
      metadata: { competenceCode: "CP.MA.P1.2" },
      configuration: {
        question: "Paul a 4 pommes. Il en mange 2. Combien lui reste-t-il ?",
        operation: "4 - 2",
        resultat: 2
      }
    },
    {
      titre: "Suite numérique",
      consigne: "Complète la suite de nombres.",
      type: "TEXT_INPUT",
      difficulte: "consolidation",
      module_id: 2,
      competence_code: "CP.MA.N1.5",
      metadata: { competenceCode: "CP.MA.N1.5" },
      configuration: {
        question: "Complète : 2, 4, 6, ___, 10",
        inputType: "keyboard",
        bonneReponse: "8"
      }
    },

    // Add more exercises for all modules...
    // (This is a sample - the full script would include all 70+ exercises)
  ]
};

async function createTables() {
  try {
    console.log('Creating database tables...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'cp2025_database_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
}

async function insertModules() {
  try {
    console.log('Inserting modules...');
    
    for (const module of cp2025Data.modules) {
      const query = `
        INSERT INTO cp2025_modules (titre, description, niveau, matiere, periode, ordre, competence_domain, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          titre = EXCLUDED.titre,
          description = EXCLUDED.description,
          niveau = EXCLUDED.niveau,
          matiere = EXCLUDED.matiere,
          periode = EXCLUDED.periode,
          ordre = EXCLUDED.ordre,
          competence_domain = EXCLUDED.competence_domain,
          metadata = EXCLUDED.metadata
      `;
      
      await pool.query(query, [
        module.titre,
        module.description,
        module.niveau,
        module.matiere,
        module.periode,
        module.ordre,
        module.competence_domain,
        JSON.stringify(module.metadata)
      ]);
    }
    
    console.log(`✅ ${cp2025Data.modules.length} modules inserted successfully`);
  } catch (error) {
    console.error('❌ Error inserting modules:', error.message);
    throw error;
  }
}

async function insertExercises() {
  try {
    console.log('Inserting exercises...');
    
    for (const exercise of cp2025Data.exercises) {
      // Insert exercise
      const exerciseQuery = `
        INSERT INTO cp2025_exercises (titre, consigne, type, difficulte, module_id, competence_code, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const exerciseResult = await pool.query(exerciseQuery, [
        exercise.titre,
        exercise.consigne,
        exercise.type,
        exercise.difficulte,
        exercise.module_id,
        exercise.competence_code,
        JSON.stringify(exercise.metadata)
      ]);
      
      const exerciseId = exerciseResult.rows[0].id;
      
      // Insert configuration if it exists
      if (exercise.configuration) {
        const configQuery = `
          INSERT INTO cp2025_exercise_configurations (exercise_id, configuration_type, configuration_data)
          VALUES ($1, $2, $3)
          ON CONFLICT (exercise_id, configuration_type) DO UPDATE SET
            configuration_data = EXCLUDED.configuration_data
        `;
        
        await pool.query(configQuery, [
          exerciseId,
          exercise.type,
          JSON.stringify(exercise.configuration)
        ]);
      }
    }
    
    console.log(`✅ ${cp2025Data.exercises.length} exercises inserted successfully`);
  } catch (error) {
    console.error('❌ Error inserting exercises:', error.message);
    throw error;
  }
}

async function displayStatistics() {
  try {
    console.log('\n📊 Database Statistics:');
    
    const statsQuery = 'SELECT * FROM cp2025_statistics';
    const statsResult = await pool.query(statsQuery);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`   • Total Modules: ${stats.total_modules}`);
      console.log(`   • Total Exercises: ${stats.total_exercises}`);
      console.log(`   • CP Modules: ${stats.cp_modules}`);
      console.log(`   • CP-CE1 Bridge Modules: ${stats.cp_ce1_modules}`);
      console.log(`   • French Modules: ${stats.francais_modules}`);
      console.log(`   • Mathematics Modules: ${stats.mathematiques_modules}`);
      console.log(`   • QCM Exercises: ${stats.qcm_count}`);
      console.log(`   • Calculation Exercises: ${stats.calcul_count}`);
      console.log(`   • Drag & Drop Exercises: ${stats.drag_drop_count}`);
      console.log(`   • Text Input Exercises: ${stats.text_input_count}`);
    }
  } catch (error) {
    console.error('❌ Error displaying statistics:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Starting CP2025 Database Population...\n');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Create tables
    await createTables();
    
    // Insert data
    await insertModules();
    await insertExercises();
    
    // Display statistics
    await displayStatistics();
    
    console.log('\n🎉 CP2025 Database population completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Error during database population:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createTables,
  insertModules,
  insertExercises,
  displayStatistics
}; 