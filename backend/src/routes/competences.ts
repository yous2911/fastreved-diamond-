import { FastifyInstance } from 'fastify';
import { enhancedDatabaseService as databaseService } from '../services/enhanced-database.service.js';

export default async function competencesRoutes(fastify: FastifyInstance) {
  // GET /api/competences/:code/prerequisites - Get prerequisites for a competence
  fastify.get('/:code/prerequisites', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includePrerequisiteDetails: { type: 'boolean', default: true },
          studentId: { type: 'number' },
          depth: { type: 'number', default: 1, minimum: 1, maximum: 5 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code: competenceCode } = request.params as { code: string };
      const { includePrerequisiteDetails = true, studentId, depth = 1 } = request.query as any;

      // Get direct prerequisites
      const prerequisites = await databaseService.getCompetencePrerequisites(competenceCode, {
        includeDetails: includePrerequisiteDetails,
        depth
      });

      let studentProgressData = null;
      if (studentId) {
        // Get student's progress on prerequisites if studentId provided
        const prerequisiteCodes = prerequisites.map(p => p.prerequisiteCode);
        studentProgressData = await databaseService.getStudentCompetenceProgress(studentId, {
          competenceCodes: prerequisiteCodes
        });
      }

      // Build prerequisite tree with student progress
      const prerequisiteTree = await Promise.all(prerequisites.map(async prereq => {
        const studentProgress = studentProgressData?.find(
          sp => sp.competenceCode === prereq.prerequisiteCode
        );
        
        return {
          id: prereq.id,
          competenceCode: competenceCode,
          prerequisiteCode: prereq.prerequisiteCode,
          prerequisiteType: prereq.prerequisiteType,
          masteryThreshold: prereq.masteryThreshold,
          weight: parseFloat(prereq.weight.toString()),
          description: prereq.description,
          
          // Student progress info (if available)
          studentProgress: studentProgress ? {
            masteryLevel: studentProgress.masteryLevel,
            progressPercent: studentProgress.progressPercent,
            averageScore: parseFloat(studentProgress.averageScore.toString()),
            isMasteryThresholdMet: studentProgress.progressPercent >= prereq.masteryThreshold,
            totalTimeSpent: studentProgress.totalTimeSpent,
            lastAttemptAt: studentProgress.lastAttemptAt
          } : null,
          
          // Competence details (if requested)
          prerequisiteDetails: includePrerequisiteDetails ? await databaseService.getCompetenceDetails(prereq.prerequisiteCode) : null
        };
      }));

      // Calculate overall readiness
      const readinessAnalysis = {
        totalPrerequisites: prerequisites.length,
        requiredPrerequisites: prerequisites.filter(p => p.prerequisiteType === 'required').length,
        recommendedPrerequisites: prerequisites.filter(p => p.prerequisiteType === 'recommended').length,
        helpfulPrerequisites: prerequisites.filter(p => p.prerequisiteType === 'helpful').length,
        
        // Student readiness (if student data available)
        studentReadiness: studentProgressData ? {
          requiredMet: prerequisites
            .filter(p => p.prerequisiteType === 'required')
            .every(p => {
              const progress = studentProgressData.find(sp => sp.competenceCode === p.prerequisiteCode);
              return progress && progress.progressPercent >= p.masteryThreshold;
            }),
          recommendedMet: prerequisites
            .filter(p => p.prerequisiteType === 'recommended')
            .filter(p => {
              const progress = studentProgressData.find(sp => sp.competenceCode === p.prerequisiteCode);
              return progress && progress.progressPercent >= p.masteryThreshold;
            }).length,
          readinessScore: calculateReadinessScore(prerequisites, studentProgressData),
          blockers: prerequisites
            .filter(p => p.prerequisiteType === 'required')
            .filter(p => {
              const progress = studentProgressData.find(sp => sp.competenceCode === p.prerequisiteCode);
              return !progress || progress.progressPercent < p.masteryThreshold;
            })
            .map(p => ({
              prerequisiteCode: p.prerequisiteCode,
              currentProgress: studentProgressData.find(sp => sp.competenceCode === p.prerequisiteCode)?.progressPercent || 0,
              requiredProgress: p.masteryThreshold,
              gap: p.masteryThreshold - (studentProgressData.find(sp => sp.competenceCode === p.prerequisiteCode)?.progressPercent || 0)
            }))
        } : null
      };

      return {
        success: true,
        data: {
          competenceCode,
          prerequisites: prerequisiteTree,
          readinessAnalysis,
          metadata: {
            depth,
            includeDetails: includePrerequisiteDetails,
            hasStudentData: !!studentId,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      fastify.log.error('Get prerequisites error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get competence prerequisites'
        }
      });
    }
  });

  // GET /api/competences/:code - Get competence details
  fastify.get('/:code', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code: competenceCode } = request.params as { code: string };
      
      const competenceDetails = await databaseService.getCompetenceDetails(competenceCode);
      
      if (!competenceDetails) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'COMPETENCE_NOT_FOUND',
            message: 'Competence not found'
          }
        });
      }

      return {
        success: true,
        data: {
          competence: competenceDetails
        }
      };
    } catch (error) {
      fastify.log.error('Get competence details error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get competence details'
        }
      });
    }
  });

  // GET /api/competences - Search and filter competences
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CP-CE1'] },
          matiere: { type: 'string', enum: ['FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS'] },
          domaine: { type: 'string' },
          search: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { niveau, matiere, domaine, search, limit = 50, offset = 0 } = request.query as any;
      
      const competences = await databaseService.searchCompetences({
        niveau,
        matiere,
        domaine,
        search,
        limit,
        offset
      });

      return {
        success: true,
        data: {
          competences,
          filters: { niveau, matiere, domaine, search },
          pagination: { limit, offset, total: competences.length }
        }
      };
    } catch (error) {
      fastify.log.error('Search competences error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search competences'
        }
      });
    }
  });
}

// Helper function to calculate readiness score
function calculateReadinessScore(prerequisites: any[], studentProgressData: any[]): number {
  if (!studentProgressData || prerequisites.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  prerequisites.forEach(prereq => {
    const progress = studentProgressData.find(sp => sp.competenceCode === prereq.prerequisiteCode);
    const progressPercent = progress?.progressPercent || 0;
    const weight = parseFloat(prereq.weight.toString());
    
    // Adjust weight based on prerequisite type
    const adjustedWeight = weight * (prereq.prerequisiteType === 'required' ? 2 : 
                                   prereq.prerequisiteType === 'recommended' ? 1.5 : 1);
    
    totalWeight += adjustedWeight;
    weightedScore += (progressPercent / 100) * adjustedWeight;
  });
  
  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
}