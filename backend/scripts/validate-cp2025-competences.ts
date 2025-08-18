#!/usr/bin/env tsx

import { competenceReference } from '../src/data/cp2025-competences';
import { CP2025Service } from '../src/services/cp2025.service';

// Node.js types are available in tsx environment
declare const process: any;
declare const require: any;
declare const module: any;

interface ValidationResult {
  code: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  errors: string[];
  warnings: string[];
}

function validateCompetenceCode(code: string): ValidationResult {
  const result: ValidationResult = {
    code,
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check format: CP.FR.L1.1
  const regex = /^(CP|CE1|CE2|CM1|CM2)\.(FR|MA)\.[A-Z]+\d+\.\d+$/;
  if (!regex.test(code)) {
    result.isValid = false;
    result.errors.push('Format invalide. Attendu: NIVEAU.MATIERE.DOMAINE.NUMERO');
    return result;
  }

  // Parse components
  const [niveau, matiere, domaine, competence] = code.split('.');
  
  // Validate niveau
  const validNiveaux = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
  if (!validNiveaux.includes(niveau)) {
    result.isValid = false;
    result.errors.push(`Niveau invalide: ${niveau}. Valides: ${validNiveaux.join(', ')}`);
  }

  // Validate matiere
  const validMatieres = ['FR', 'MA'];
  if (!validMatieres.includes(matiere)) {
    result.isValid = false;
    result.errors.push(`Matière invalide: ${matiere}. Valides: ${validMatieres.join(', ')}`);
  }

  // Validate domaine format
  if (!/^[A-Z]+\d+$/.test(domaine)) {
    result.isValid = false;
    result.errors.push(`Domaine invalide: ${domaine}. Format attendu: LETTRES+CHIFFRES`);
  }

  // Validate competence number
  const competenceNum = parseInt(competence);
  if (isNaN(competenceNum) || competenceNum < 1) {
    result.isValid = false;
    result.errors.push(`Numéro de compétence invalide: ${competence}`);
  }

  return result;
}

function validateCompetenceContent(code: string, content: any): ValidationResult {
  const result: ValidationResult = {
    code,
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check required fields
  const requiredFields = ['titre', 'description', 'periode'];
  for (const field of requiredFields) {
    if (!content[field]) {
      result.isValid = false;
      result.errors.push(`Champ requis manquant: ${field}`);
    }
  }

  // Validate periode format
  if (content.periode && !/^P[1-5]$/.test(content.periode)) {
    result.isValid = false;
    result.errors.push(`Période invalide: ${content.periode}. Format attendu: P1-P5`);
  }

  // Check for optional but recommended fields
  if (!content.prerequis) {
    result.warnings.push('Prérequis non spécifiés');
  }

  if (!content.objectifs || !Array.isArray(content.objectifs) || content.objectifs.length === 0) {
    result.warnings.push('Objectifs non spécifiés ou vides');
  }

  // Validate exercise generation
  try {
    const template = CP2025Service.generateExerciseTemplate(code);
    if (!template) {
      result.warnings.push('Impossible de générer un template d\'exercice');
    }
  } catch (error) {
    result.warnings.push(`Erreur lors de la génération d'exercice: ${error}`);
  }

  return result;
}

function validateCompetenceDependencies(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const [code, content] of Object.entries(competenceReference)) {
    if (content.prerequis && Array.isArray(content.prerequis)) {
      for (const prerequis of content.prerequis) {
        if (!competenceReference[prerequis]) {
          const result: ValidationResult = {
            code,
            isValid: false,
            errors: [`Prérequis non trouvé: ${prerequis}`],
            warnings: []
          };
          results.push(result);
        }
      }
    }
  }
  
  return results;
}

function generateValidationReport(): ValidationSummary {
  const summary: ValidationSummary = {
    total: 0,
    valid: 0,
    invalid: 0,
    errors: [],
    warnings: []
  };

  console.log('🔍 Validation des compétences CP 2025...\n');

  // Validate each competence
  for (const [code, content] of Object.entries(competenceReference)) {
    summary.total++;
    
    console.log(`📋 Validating: ${code}`);
    
    // Validate code format
    const formatResult = validateCompetenceCode(code);
    if (!formatResult.isValid) {
      summary.invalid++;
      summary.errors.push(...formatResult.errors.map(e => `${code}: ${e}`));
      console.log(`  ❌ Format errors: ${formatResult.errors.join(', ')}`);
    }

    // Validate content
    const contentResult = validateCompetenceContent(code, content);
    if (!contentResult.isValid) {
      summary.invalid++;
      summary.errors.push(...contentResult.errors.map(e => `${code}: ${e}`));
      console.log(`  ❌ Content errors: ${contentResult.errors.join(', ')}`);
    }

    if (contentResult.warnings.length > 0) {
      summary.warnings.push(...contentResult.warnings.map(w => `${code}: ${w}`));
      console.log(`  ⚠️  Warnings: ${contentResult.warnings.join(', ')}`);
    }

    if (formatResult.isValid && contentResult.isValid) {
      summary.valid++;
      console.log(`  ✅ Valid`);
    }
    
    console.log('');
  }

  // Validate dependencies
  console.log('🔗 Validation des dépendances...\n');
  const dependencyResults = validateCompetenceDependencies();
  for (const result of dependencyResults) {
    summary.invalid++;
    summary.errors.push(...result.errors);
    console.log(`❌ ${result.errors.join(', ')}`);
  }

  return summary;
}

function printSummary(summary: ValidationSummary) {
  console.log('📊 RÉSUMÉ DE VALIDATION');
  console.log('='.repeat(50));
  console.log(`Total des compétences: ${summary.total}`);
  console.log(`✅ Valides: ${summary.valid}`);
  console.log(`❌ Invalides: ${summary.invalid}`);
  console.log(`⚠️  Avertissements: ${summary.warnings.length}`);
  console.log(`🔗 Erreurs de dépendance: ${summary.errors.filter(e => e.includes('Prérequis')).length}`);
  
  if (summary.errors.length > 0) {
    console.log('\n❌ ERREURS:');
    summary.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (summary.warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    summary.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (summary.invalid === 0) {
    console.log('🎉 Toutes les compétences sont valides !');
  } else {
    console.log(`⚠️  ${summary.invalid} compétence(s) nécessitent une correction.`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run validate-competences [options]

Options:
  --help, -h        Show this help message
  --verbose, -v     Show detailed validation output
  --fix-suggestions Show suggestions for fixing issues

Examples:
  npm run validate-competences
  npm run validate-competences --verbose
    `);
    process.exit(0);
  }

  try {
    const summary = generateValidationReport();
    printSummary(summary);
    
    // Exit with error code if there are validation errors
    if (summary.invalid > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 