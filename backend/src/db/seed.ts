import { db } from './connection';
import * as schema from './schema';
import type { NewExercise } from './schema';

export async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Seed students
    console.log('📚 Seeding students...');
    const students = await db.insert(schema.students).values([
      {
        prenom: 'Lucas',
        nom: 'Martin',
        dateNaissance: '2014-05-15',
        niveauActuel: 'CE2',
        totalPoints: 150,
        serieJours: 3,
        mascotteType: 'dragon',
        dernierAcces: null,
        estConnecte: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        prenom: 'Emma',
        nom: 'Durand',
        dateNaissance: '2013-08-22',
        niveauActuel: 'CM1',
        totalPoints: 200,
        serieJours: 5,
        mascotteType: 'unicorn',
        dernierAcces: null,
        estConnecte: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        prenom: 'Noah',
        nom: 'Lefebvre',
        dateNaissance: '2015-03-10',
        niveauActuel: 'CE1',
        totalPoints: 75,
        serieJours: 1,
        mascotteType: 'robot',
        dernierAcces: null,
        estConnecte: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        prenom: 'Alice',
        nom: 'Dupont',
        dateNaissance: '2015-11-05',
        niveauActuel: 'CE1',
        totalPoints: 120,
        serieJours: 2,
        mascotteType: 'cat',
        dernierAcces: null,
        estConnecte: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Seed modules
    console.log('📖 Seeding modules...');
    const modules = await db.insert(schema.modules).values([
      {
        titre: 'Les nombres jusqu\'à 100',
        description: 'Découverte et manipulation des nombres de 0 à 100',
        niveau: 'CE1',
        matiere: 'MATHEMATIQUES',
        ordre: 1,
        estActif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        titre: 'Les verbes du premier groupe',
        description: 'Conjugaison des verbes en -er au présent',
        niveau: 'CE2',
        matiere: 'FRANCAIS',
        ordre: 1,
        estActif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        titre: 'Le système solaire',
        description: 'Découverte des planètes et du soleil',
        niveau: 'CM1',
        matiere: 'SCIENCES',
        ordre: 1,
        estActif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Seed exercises
    console.log('🎯 Seeding exercises...');
    const exercise1: NewExercise = {
      titre: 'Compter de 10 en 10',
      description: 'Complète la suite : 10, 20, ___, 40, 50',
      type: 'multiple-choice',
      difficulte: 'FACILE',
      xp: 10,
      configuration: JSON.stringify({
        question: 'Complète la suite : 10, 20, ___, 40, 50',
        options: ['25', '30', '35', '45'],
        correctAnswer: '30',
        explanation: 'En comptant de 10 en 10, après 20 vient 30',
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const exercise2: NewExercise = {
      titre: 'Conjuguer CHANTER',
      description: 'Conjugue "chanter" à la première personne du singulier',
      type: 'fill-in-blank',
      difficulte: 'MOYEN',
      xp: 15,
      configuration: JSON.stringify({
        question: 'Conjugue "chanter" à la première personne du singulier',
        correctAnswer: 'chante',
        explanation: 'Je chante - première personne du singulier du verbe chanter',
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const exercise3: NewExercise = {
      titre: 'Les planètes rocheuses',
      description: 'Quelles sont les planètes rocheuses du système solaire ?',
      type: 'multiple-choice',
      difficulte: 'DIFFICILE',
      xp: 20,
      configuration: JSON.stringify({
        question: 'Quelles sont les planètes rocheuses du système solaire ?',
        options: ['Mercure, Vénus, Terre, Mars', 'Jupiter, Saturne, Uranus, Neptune', 'Toutes les planètes', 'Aucune'],
        correctAnswer: 'Mercure, Vénus, Terre, Mars',
        explanation: 'Les planètes rocheuses sont les 4 plus proches du Soleil',
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(schema.exercises).values([exercise1, exercise2, exercise3]);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('🎉 Seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
