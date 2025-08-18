// src/services/gdpr.service.ts
import { eq, inArray } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { 
  students, studentProgress, sessions, revisions, gdprFiles, 
  gdprDataProcessingLog, type NewGdprDataProcessingLog 
} from '../db/schema';

class GdprService {
  private db = getDatabase();

  async logDataProcessing(data: {
    studentId?: number;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'ANONYMIZE';
    dataType: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    const logEntry: NewGdprDataProcessingLog = {
      studentId: data.studentId || null,
      action: data.action,
      dataType: data.dataType,
      description: data.description,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      requestId: data.requestId || null,
      metadata: '{}',
      createdAt: new Date(),
    };

    await this.db.insert(gdprDataProcessingLog).values(logEntry);
  }

  async exportStudentData(studentId: number): Promise<Record<string, any>> {
    // Récupérer toutes les données de l'étudiant
    const studentData = await this.db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const progressData = await this.db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    const sessionsData = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.studentId, studentId));

    const revisionsData = await this.db
      .select()
      .from(revisions)
      .where(eq(revisions.studentId, studentId));

    const filesData = await this.db
      .select()
      .from(gdprFiles)
      .where(eq(gdprFiles.studentId, studentId));

    return {
      student: studentData[0] || null,
      progress: progressData,
      sessions: sessionsData,
      revisions: revisionsData,
      files: filesData,
      exportedAt: new Date().toISOString(),
      dataTypes: ['student', 'progress', 'sessions', 'revisions', 'files'],
    };
  }

  async softDeleteStudentData(studentId: number): Promise<{ success: boolean; affectedRecords: number }> {
    let affectedRecords = 0;

    // Marquer comme supprimé sans effacer physiquement
    const studentResult = await this.db
      .update(students)
      .set({
        estConnecte: false,
        dernierAcces: null,
        // Ajouter un flag de suppression logique si nécessaire
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    affectedRecords += studentResult.changes || 0;

    return { success: true, affectedRecords };
  }

  async hardDeleteStudentData(studentId: number): Promise<{ success: boolean; affectedRecords: number }> {
    let affectedRecords = 0;

    // Supprimer dans l'ordre inverse des dépendances
    const filesResult = await this.db.delete(gdprFiles).where(eq(gdprFiles.studentId, studentId));
    affectedRecords += filesResult.changes || 0;

    const revisionsResult = await this.db.delete(revisions).where(eq(revisions.studentId, studentId));
    affectedRecords += revisionsResult.changes || 0;

    const sessionsResult = await this.db.delete(sessions).where(eq(sessions.studentId, studentId));
    affectedRecords += sessionsResult.changes || 0;

    const progressResult = await this.db.delete(studentProgress).where(eq(studentProgress.studentId, studentId));
    affectedRecords += progressResult.changes || 0;

    const studentResult = await this.db.delete(students).where(eq(students.id, studentId));
    affectedRecords += studentResult.changes || 0;

    return { success: true, affectedRecords };
  }

  convertToCSV(data: Record<string, any>): string {
    let csv = '';
    
    // En-têtes
    csv += 'Table,Field,Value\n';
    
    // Parcourir récursivement les données
    const flattenObject = (obj: any, tableName: string, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              flattenObject(item, tableName, `${fieldName}[${index}]`);
            } else {
              csv += `${tableName},"${fieldName}[${index}]","${item}"\n`;
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          flattenObject(value, tableName, fieldName);
        } else {
          csv += `${tableName},"${fieldName}","${value}"\n`;
        }
      }
    };

    if (data.student) flattenObject(data.student, 'student');
    if (data.progress) data.progress.forEach((p: any, i: number) => flattenObject(p, 'progress', `record_${i}`));
    if (data.sessions) data.sessions.forEach((s: any, i: number) => flattenObject(s, 'sessions', `record_${i}`));
    if (data.revisions) data.revisions.forEach((r: any, i: number) => flattenObject(r, 'revisions', `record_${i}`));
    if (data.files) data.files.forEach((f: any, i: number) => flattenObject(f, 'files', `record_${i}`));

    return csv;
  }
}

export const gdprService = new GdprService(); 