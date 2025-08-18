#!/usr/bin/env tsx

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env' });

import { CP2025Service } from '../src/services/cp2025.service';
import { connectDatabase, getDatabase } from '../src/db/connection';
import { modules, exercises } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { competenceReference } from '../src/data/cp2025-competences';

interface GenerateOptions {
  niveau: string;
  matiere: string;
  periode?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

async function generateExercisesFromCompetences(options: GenerateOptions) {
  const { niveau, matiere, periode, dryRun = false, verbose = false } = options;
  
  console.log(`🎯 Generating exercises for ${niveau} ${matiere}${periode ? ` P${periode}` : ''}`);
  
  // Connect to database
  await connectDatabase();
  const db = getDatabase();
  
  // Get all competence codes for the specified criteria
  const competenceCodes = Object.keys(competenceReference).filter(code => {
    const [n, m, , ] = code.split('.');
    const matchesNiveau = n === niveau;
    const matchesMatiere = m === matiere.substring(0, 2); // FR or MA
    
    if (periode) {
      const competence = competenceReference[code];
      return matchesNiveau && matchesMatiere && competence.periode === `P${periode}`;
    }
    
    return matchesNiveau && matchesMatiere;
  });
  
  if (verbose) {
    console.log(`📋 Found ${competenceCodes.length} competences:`, competenceCodes);
  }
  
  // Create module if not exists
  const moduleTitle = `${matiere} ${niveau}${periode ? ` - Période ${periode}` : ''}`;
  const existingModule = await db
    .select()
    .from(modules)
    .where(eq(modules.nom, moduleTitle))
    .limit(1);
  
  let moduleId: number;
  
  if (existingModule.length === 0) {
    if (dryRun) {
      console.log(`🧪 [DRY RUN] Would create module: ${moduleTitle}`);
      moduleId = 999; // Fake ID for dry run
    } else {
      const result = await db.insert(modules).values({
        nom: moduleTitle,
        description: `Module auto-généré pour ${moduleTitle}`,
        niveau: niveau,
        matiere: matiere,
        ordre: 1,
        estActif: true
      });
      const newModule = { id: (result as any).insertId, nom: moduleTitle };
      
      moduleId = newModule.id;
      console.log(`✓ Created module: ${moduleTitle} (ID: ${moduleId})`);
    }
  } else {
    moduleId = existingModule[0].id;
    console.log(`📁 Using existing module: ${moduleTitle} (ID: ${moduleId})`);
  }
  
  // Generate exercises for each competence
  const generatedExercises: any[] = [];
  let totalCreated = 0;
  
  for (const competenceCode of competenceCodes) {
    if (verbose) {
      console.log(`\n🔧 Processing competence: ${competenceCode}`);
    }
    
    try {
      // Check if exercises already exist for this competence
      const existingExercises = await db
        .select()
        .from(exercises)
        .where(eq(exercises.metadata, { competenceCode }))
        .limit(1);
      
      if (existingExercises.length > 0) {
        if (verbose) {
          console.log(`⏭️  Skipping ${competenceCode} - exercises already exist`);
        }
        continue;
      }
      
      // Generate exercise templates
      const template = CP2025Service.generateExerciseTemplate(competenceCode);
      
      if (!template) {
        console.log(`⚠️  Could not generate template for ${competenceCode}`);
        continue;
      }
      
      // Create variations (easy, medium, hard)
      const variations = [
        {
          titre: `${template.titre} - Découverte`,
          difficulte: 'FACILE' as const,
          ordre: 1,
          contenu: {
            question: template.configuration.question || template.titre,
            options: template.configuration.choix || [],
            correctAnswer: template.configuration.bonneReponse || template.configuration.resultat || '',
            explanation: template.configuration.explication || '',
            hints: template.configuration.aide ? [template.configuration.aide] : [],
            mediaUrl: template.configuration.audioUrl || template.configuration.imageUrl,
            type: 'multiple-choice' as const
          },
          niveau: niveau,
          matiere: matiere,
          moduleId: moduleId,
          tempsEstime: template.dureeEstimee * 60, // Convert to seconds
          pointsMax: template.pointsReussite,
          metadata: {
            ...template.metadata,
            competenceCode,
            difficulteOriginale: 'decouverte'
          },
          donneesSupplementaires: {
            consigne: template.consigne,
            type: template.type
          }
        },
        {
          titre: `${template.titre} - Entraînement`,
          difficulte: 'MOYEN' as const,
          ordre: 2,
          contenu: {
            question: template.configuration.question || template.titre,
            options: template.configuration.choix || [],
            correctAnswer: template.configuration.bonneReponse || template.configuration.resultat || '',
            explanation: template.configuration.explication || '',
            hints: template.configuration.aide ? [template.configuration.aide] : [],
            mediaUrl: template.configuration.audioUrl || template.configuration.imageUrl,
            type: 'multiple-choice' as const
          },
          niveau: niveau,
          matiere: matiere,
          moduleId: moduleId,
          tempsEstime: template.dureeEstimee * 60,
          pointsMax: template.pointsReussite + 5,
          metadata: {
            ...template.metadata,
            competenceCode,
            difficulteOriginale: 'entrainement'
          },
          donneesSupplementaires: {
            consigne: template.consigne,
            type: template.type
          }
        },
        {
          titre: `${template.titre} - Consolidation`,
          difficulte: 'DIFFICILE' as const,
          ordre: 3,
          contenu: {
            question: template.configuration.question || template.titre,
            options: template.configuration.choix || [],
            correctAnswer: template.configuration.bonneReponse || template.configuration.resultat || '',
            explanation: template.configuration.explication || '',
            hints: template.configuration.aide ? [template.configuration.aide] : [],
            mediaUrl: template.configuration.audioUrl || template.configuration.imageUrl,
            type: 'multiple-choice' as const
          },
          niveau: niveau,
          matiere: matiere,
          moduleId: moduleId,
          tempsEstime: template.dureeEstimee * 60,
          pointsMax: template.pointsReussite + 10,
          metadata: {
            ...template.metadata,
            competenceCode,
            difficulteOriginale: 'consolidation'
          },
          donneesSupplementaires: {
            consigne: template.consigne,
            type: template.type
          }
        }
      ];
      
      if (dryRun) {
        console.log(`🧪 [DRY RUN] Would create ${variations.length} exercises for ${competenceCode}`);
        generatedExercises.push(...variations);
      } else {
        // Insert exercises
        for (const variation of variations) {
          const result = await db.insert(exercises).values(variation);
          const created = { ...variation, id: (result as any).insertId };
          generatedExercises.push(created);
          totalCreated++;
          
          if (verbose) {
            console.log(`  ✓ Created: ${created.titre}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${competenceCode}:`, error);
    }
  }
  
  console.log(`\n🎉 Generation complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Competences processed: ${competenceCodes.length}`);
  console.log(`   - Exercises ${dryRun ? 'would be created' : 'created'}: ${dryRun ? generatedExercises.length : totalCreated}`);
  console.log(`   - Module ID: ${moduleId}`);
  
  return generatedExercises;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    niveau: 'CP',
    matiere: 'FRANCAIS'
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      switch (arg) {
        case '--niveau':
          options.niveau = args[++i];
          break;
        case '--matiere':
          options.matiere = args[++i];
          break;
        case '--periode':
          options.periode = args[++i];
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
          console.log(`
Usage: npm run generate-exercises [options]

Options:
  --niveau <niveau>     School level (CP, CE1, CE2, CM1, CM2) [default: CP]
  --matiere <matiere>   Subject (FRANCAIS, MATHEMATIQUES) [default: FRANCAIS]
  --periode <periode>   Period (1, 2, 3, 4, 5) [optional]
  --dry-run            Show what would be created without actually creating
  --verbose            Show detailed output
  --help               Show this help message

Examples:
  npm run generate-exercises --niveau CP --matiere FRANCAIS --periode 1
  npm run generate-exercises --niveau CP --matiere MATHEMATIQUES --dry-run
  npm run generate-exercises --verbose
        `);
          process.exit(0);
      }
    } else {
      // Handle positional arguments for backward compatibility
      if (!options.niveau || options.niveau === 'CP') {
        options.niveau = arg;
      } else if (!options.matiere || options.matiere === 'FRANCAIS') {
        options.matiere = arg;
      } else if (!options.periode) {
        options.periode = arg;
      }
    }
  }
  
  try {
    await generateExercisesFromCompetences(options);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 