// src/services/anonymization.service.ts
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { students, studentProgress, sessions, gdprFiles } from '../db/schema';
import { encryptionService } from './encryption.service';

interface AnonymizationRule {
  field: string;
  strategy: 'REMOVE' | 'HASH' | 'REPLACE' | 'GENERALIZE';
  replacement?: string;
}

class AnonymizationService {
  private db = getDatabase();
  
  private anonymizationRules: AnonymizationRule[] = [
    { field: 'prenom', strategy: 'REPLACE', replacement: 'Anonyme' },
    { field: 'nom', strategy: 'REPLACE', replacement: 'Utilisateur' },
    { field: 'dateNaissance', strategy: 'GENERALIZE' },
    { field: 'niveauActuel', strategy: 'REPLACE', replacement: 'Niveau' },
    { field: 'mascotteType', strategy: 'REPLACE', replacement: 'default' },
  ];

  async anonymizeStudentData(studentId: number): Promise<{ success: boolean; affectedRecords: number }> {
    try {
      let affectedRecords = 0;

      // 1. Anonymiser les données de l'étudiant
      const anonymousId = encryptionService.generateAnonymousId();
      
      await this.db
        .update(students)
        .set({
          prenom: 'Anonyme',
          nom: `Utilisateur-${anonymousId.slice(0, 8)}`,
          dateNaissance: new Date('2000-01-01'),
          niveauActuel: 'Niveau',
          mascotteType: 'default',
          dernierAcces: null,
          estConnecte: false,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));
      
      affectedRecords += 1;

      // 2. Anonymiser les métadonnées des sessions
      const sessionResult = await this.db
        .update(sessions)
        .set({

        })
        .where(eq(sessions.studentId, studentId));
      
      affectedRecords += sessionResult.changes || 0;

      // 3. Anonymiser les fichiers associés
      const filesResult = await this.db
        .update(gdprFiles)
        .set({
          originalName: 'fichier_anonymise.dat',
          metadata: '{}',
          updatedAt: new Date(),
        })
        .where(eq(gdprFiles.studentId, studentId));
      
      affectedRecords += filesResult.changes || 0;

      // 4. Conserver les données d'apprentissage (sans identification)
      // Les données de progress et revisions sont conservées pour les statistiques
      // mais ne contiennent pas d'informations personnelles identifiables

      return { success: true, affectedRecords };

    } catch (error) {
      console.error('Erreur lors de l\'anonymisation:', error);
      throw new Error('Échec de l\'anonymisation des données');
    }
  }

  async applyAnonymizationRules(data: Record<string, any>): Promise<Record<string, any>> {
    const anonymizedData = { ...data };

    for (const rule of this.anonymizationRules) {
      if (anonymizedData[rule.field] !== undefined) {
        switch (rule.strategy) {
          case 'REMOVE':
            delete anonymizedData[rule.field];
            break;
          
          case 'HASH':
            if (anonymizedData[rule.field]) {
              anonymizedData[rule.field] = encryptionService.hashPersonalData(
                anonymizedData[rule.field].toString()
              );
            }
            break;
          
          case 'REPLACE':
            anonymizedData[rule.field] = rule.replacement || 'ANONYMIZED';
            break;
          
          case 'GENERALIZE':
            // Stratégie de généralisation (ex: âge exact -> tranche d'âge)
            if (rule.field === 'age' && typeof anonymizedData[rule.field] === 'number') {
              const age = anonymizedData[rule.field];
              anonymizedData[rule.field] = Math.floor(age / 5) * 5 + '-' + (Math.floor(age / 5) * 5 + 4);
            }
            break;
        }
      }
    }

    return anonymizedData;
  }

  async verifyAnonymization(studentId: number): Promise<{ isAnonymized: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Vérifier l'étudiant
    const student = await this.db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (student.length > 0) {
      const studentData = student[0];
      
      if (studentData.prenom !== 'Anonyme') {
        issues.push('Prénom non anonymisé');
      }
      
      if (studentData.nom && !studentData.nom.startsWith('Utilisateur-')) {
        issues.push('Nom non anonymisé');
      }
      
      if (studentData.niveauActuel !== 'Niveau') {
        issues.push('Niveau actuel non anonymisé');
      }
    }

    return {
      isAnonymized: issues.length === 0,
      issues,
    };
  }
}

export const anonymizationService = new AnonymizationService(); 