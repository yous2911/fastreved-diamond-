import { db, competencePrerequisites } from '../../db';
import { generatePrerequisites } from '../../data/ce2-competences-2026';

export async function seedCompetencePrerequisites() {
  console.log('🌱 Seeding competence prerequisites...');
  
  try {
    // Clear existing data
    await db.delete(competencePrerequisites);
    console.log('✅ Cleared existing competence prerequisites');
    
    // Generate prerequisites from CE2 framework
    const prerequisites = generatePrerequisites();
    console.log(`📊 Generated ${prerequisites.length} prerequisite relationships`);
    
    // Insert all prerequisites
    const insertedPrerequisites = await db.insert(competencePrerequisites).values(prerequisites);
    console.log(`✅ Inserted ${prerequisites.length} competence prerequisites`);
    
    // Log some examples
    const examples = prerequisites.slice(0, 5);
    console.log('📋 Example prerequisites:');
    examples.forEach(prereq => {
      console.log(`  ${prereq.competenceCode} ← ${prereq.prerequisiteCode} (weight: ${prereq.weight})`);
    });
    
    return {
      success: true,
      count: prerequisites.length,
      examples
    };
    
  } catch (error) {
    console.error('❌ Error seeding competence prerequisites:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedCompetencePrerequisites()
    .then(() => {
      console.log('✅ Competence prerequisites seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Competence prerequisites seeding failed:', error);
      process.exit(1);
    });
}
