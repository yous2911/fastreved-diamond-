import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { 
  wardrobeItems, 
  studentWardrobe, 
  students, 
  studentStats,
  achievements,
  studentAchievements
} from '../db/schema-mysql-cp2025';
import { getDatabase } from '../db/connection';

interface AuthenticatedUser {
  studentId: number;
  email: string;
}

export default async function wardrobeRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // GET /api/wardrobe/:studentId - Get student's wardrobe items
  fastify.get('/:studentId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['hat', 'clothing', 'accessory', 'shoes', 'special'] },
          rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] },
          unlocked: { type: 'boolean' },
          equipped: { type: 'boolean' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { 
        type?: string; 
        rarity?: string; 
        unlocked?: boolean; 
        equipped?: boolean; 
      };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const { type, rarity, unlocked, equipped } = request.query;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Get student's wardrobe items with unlock status
        let query = db
          .select({
            id: wardrobeItems.id,
            name: wardrobeItems.name,
            type: wardrobeItems.type,
            rarity: wardrobeItems.rarity,
            unlockRequirementType: wardrobeItems.unlockRequirementType,
            unlockRequirementValue: wardrobeItems.unlockRequirementValue,
            mascotCompatibility: wardrobeItems.mascotCompatibility,
            positionData: wardrobeItems.positionData,
            color: wardrobeItems.color,
            geometryType: wardrobeItems.geometryType,
            magicalEffect: wardrobeItems.magicalEffect,
            description: wardrobeItems.description,
            icon: wardrobeItems.icon,
            isActive: wardrobeItems.isActive,
            // Unlock status from student_wardrobe
            isUnlocked: sql<boolean>`${studentWardrobe.studentId} IS NOT NULL`,
            unlockedAt: studentWardrobe.unlockedAt,
            isEquipped: studentWardrobe.isEquipped,
            equippedAt: studentWardrobe.equippedAt
          })
          .from(wardrobeItems)
          .leftJoin(
            studentWardrobe, 
            and(
              eq(studentWardrobe.itemId, wardrobeItems.id),
              eq(studentWardrobe.studentId, parseInt(studentId))
            )
          )
          .where(eq(wardrobeItems.isActive, true));

        // Apply filters
        if (type) {
          query = query.where(and(eq(wardrobeItems.isActive, true), eq(wardrobeItems.type, type as any)));
        }
        if (rarity) {
          query = query.where(and(eq(wardrobeItems.isActive, true), eq(wardrobeItems.rarity, rarity as any)));
        }

        const allItems = await query;

        // Filter by unlock status if specified
        let filteredItems = allItems;
        if (unlocked !== undefined) {
          filteredItems = allItems.filter(item => 
            unlocked ? item.isUnlocked : !item.isUnlocked
          );
        }
        if (equipped !== undefined) {
          filteredItems = filteredItems.filter(item => 
            equipped ? item.isEquipped : !item.isEquipped
          );
        }

        // Get student stats for unlock requirements
        const studentStatsData = await db
          .select()
          .from(studentStats)
          .where(eq(studentStats.studentId, parseInt(studentId)))
          .limit(1);

        const stats = studentStatsData[0] || {
          totalExercisesCompleted: 0,
          totalCorrectAnswers: 0,
          longestStreak: 0,
          competencesMastered: 0,
          totalAchievements: 0
        };

        // Check which items can be unlocked
        const itemsWithUnlockStatus = filteredItems.map(item => ({
          ...item,
          canUnlock: !item.isUnlocked && checkUnlockRequirement(item, stats),
          progressToUnlock: calculateUnlockProgress(item, stats)
        }));

        return reply.send({
          success: true,
          data: {
            items: itemsWithUnlockStatus,
            summary: {
              total: filteredItems.length,
              unlocked: filteredItems.filter(item => item.isUnlocked).length,
              equipped: filteredItems.filter(item => item.isEquipped).length,
              canUnlock: itemsWithUnlockStatus.filter(item => item.canUnlock).length
            },
            studentStats: stats
          }
        });

      } catch (error) {
        fastify.log.error('Get wardrobe error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération de la garde-robe',
            code: 'GET_WARDROBE_ERROR'
          }
        });
      }
    }
  });

  // POST /api/wardrobe/:studentId/unlock/:itemId - Unlock wardrobe item
  fastify.post('/:studentId/unlock/:itemId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId', 'itemId'],
        properties: {
          studentId: { type: 'string' },
          itemId: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string; itemId: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId, itemId } = request.params;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Check if item exists and is not already unlocked
        const existingUnlock = await db
          .select()
          .from(studentWardrobe)
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(studentWardrobe.itemId, parseInt(itemId))
          ))
          .limit(1);

        if (existingUnlock.length > 0) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'Objet déjà débloqué',
              code: 'ALREADY_UNLOCKED'
            }
          });
        }

        // Get item details
        const itemData = await db
          .select()
          .from(wardrobeItems)
          .where(eq(wardrobeItems.id, parseInt(itemId)))
          .limit(1);

        if (itemData.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Objet introuvable',
              code: 'ITEM_NOT_FOUND'
            }
          });
        }

        const item = itemData[0];

        // Get student stats to verify unlock requirements
        const studentStatsData = await db
          .select()
          .from(studentStats)
          .where(eq(studentStats.studentId, parseInt(studentId)))
          .limit(1);

        const stats = studentStatsData[0];
        
        if (!stats || !checkUnlockRequirement(item, stats)) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'Conditions de déblocage non remplies',
              code: 'UNLOCK_REQUIREMENTS_NOT_MET',
              details: {
                requirementType: item.unlockRequirementType,
                requirementValue: item.unlockRequirementValue,
                currentProgress: getCurrentProgress(item, stats)
              }
            }
          });
        }

        // Unlock the item
        const unlockResult = await db
          .insert(studentWardrobe)
          .values({
            studentId: parseInt(studentId),
            itemId: parseInt(itemId),
            unlockedAt: new Date(),
            isEquipped: false
          });

        return reply.send({
          success: true,
          data: {
            item: {
              id: item.id,
              name: item.name,
              type: item.type,
              rarity: item.rarity,
              description: item.description,
              icon: item.icon
            },
            unlockedAt: new Date()
          },
          message: `${item.name} a été débloqué avec succès !`
        });

      } catch (error) {
        fastify.log.error('Unlock wardrobe item error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors du déblocage de l\'objet',
            code: 'UNLOCK_ITEM_ERROR'
          }
        });
      }
    }
  });

  // POST /api/wardrobe/:studentId/equip/:itemId - Equip wardrobe item
  fastify.post('/:studentId/equip/:itemId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId', 'itemId'],
        properties: {
          studentId: { type: 'string' },
          itemId: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string; itemId: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId, itemId } = request.params;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Check if item is unlocked by student
        const studentItem = await db
          .select({
            id: studentWardrobe.id,
            itemId: studentWardrobe.itemId,
            isEquipped: studentWardrobe.isEquipped,
            itemType: wardrobeItems.type,
            itemName: wardrobeItems.name
          })
          .from(studentWardrobe)
          .innerJoin(wardrobeItems, eq(studentWardrobe.itemId, wardrobeItems.id))
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(studentWardrobe.itemId, parseInt(itemId))
          ))
          .limit(1);

        if (studentItem.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Objet non débloqué ou introuvable',
              code: 'ITEM_NOT_UNLOCKED'
            }
          });
        }

        const item = studentItem[0];

        // Unequip other items of the same type (only one hat, one clothing, etc.)
        await db
          .update(studentWardrobe)
          .set({
            isEquipped: false,
            equippedAt: null
          })
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(wardrobeItems.type, item.itemType)
          ))
          .innerJoin(wardrobeItems, eq(studentWardrobe.itemId, wardrobeItems.id));

        // Equip the selected item
        await db
          .update(studentWardrobe)
          .set({
            isEquipped: true,
            equippedAt: new Date()
          })
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(studentWardrobe.itemId, parseInt(itemId))
          ));

        return reply.send({
          success: true,
          data: {
            itemId: parseInt(itemId),
            itemName: item.itemName,
            itemType: item.itemType,
            equipped: true,
            equippedAt: new Date()
          },
          message: `${item.itemName} équipé avec succès !`
        });

      } catch (error) {
        fastify.log.error('Equip wardrobe item error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de l\'équipement de l\'objet',
            code: 'EQUIP_ITEM_ERROR'
          }
        });
      }
    }
  });

  // POST /api/wardrobe/:studentId/unequip/:itemId - Unequip wardrobe item
  fastify.post('/:studentId/unequip/:itemId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId', 'itemId'],
        properties: {
          studentId: { type: 'string' },
          itemId: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string; itemId: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId, itemId } = request.params;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Unequip the item
        const result = await db
          .update(studentWardrobe)
          .set({
            isEquipped: false,
            equippedAt: null
          })
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(studentWardrobe.itemId, parseInt(itemId)),
            eq(studentWardrobe.isEquipped, true)
          ));

        return reply.send({
          success: true,
          data: {
            itemId: parseInt(itemId),
            equipped: false,
            unequippedAt: new Date()
          },
          message: 'Objet retiré avec succès !'
        });

      } catch (error) {
        fastify.log.error('Unequip wardrobe item error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors du retrait de l\'objet',
            code: 'UNEQUIP_ITEM_ERROR'
          }
        });
      }
    }
  });

  // GET /api/wardrobe/:studentId/equipped - Get equipped items
  fastify.get('/:studentId/equipped', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Get equipped items
        const equippedItems = await db
          .select({
            id: wardrobeItems.id,
            name: wardrobeItems.name,
            type: wardrobeItems.type,
            rarity: wardrobeItems.rarity,
            positionData: wardrobeItems.positionData,
            color: wardrobeItems.color,
            geometryType: wardrobeItems.geometryType,
            magicalEffect: wardrobeItems.magicalEffect,
            description: wardrobeItems.description,
            icon: wardrobeItems.icon,
            equippedAt: studentWardrobe.equippedAt
          })
          .from(studentWardrobe)
          .innerJoin(wardrobeItems, eq(studentWardrobe.itemId, wardrobeItems.id))
          .where(and(
            eq(studentWardrobe.studentId, parseInt(studentId)),
            eq(studentWardrobe.isEquipped, true)
          ));

        return reply.send({
          success: true,
          data: {
            equippedItems,
            count: equippedItems.length,
            byType: {
              hat: equippedItems.filter(item => item.type === 'hat'),
              clothing: equippedItems.filter(item => item.type === 'clothing'),
              accessory: equippedItems.filter(item => item.type === 'accessory'),
              shoes: equippedItems.filter(item => item.type === 'shoes'),
              special: equippedItems.filter(item => item.type === 'special')
            }
          }
        });

      } catch (error) {
        fastify.log.error('Get equipped items error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des objets équipés',
            code: 'GET_EQUIPPED_ITEMS_ERROR'
          }
        });
      }
    }
  });
}

// Helper functions
function checkUnlockRequirement(item: any, stats: any): boolean {
  if (!stats) return false;
  
  switch (item.unlockRequirementType) {
    case 'xp':
      // This would need to be calculated from student table
      return true; // Simplified for now
    case 'streak':
      return stats.longestStreak >= item.unlockRequirementValue;
    case 'exercises':
      return stats.totalExercisesCompleted >= item.unlockRequirementValue;
    case 'achievement':
      return stats.totalAchievements >= item.unlockRequirementValue;
    default:
      return false;
  }
}

function getCurrentProgress(item: any, stats: any): number {
  if (!stats) return 0;
  
  switch (item.unlockRequirementType) {
    case 'xp':
      return 0; // Would need to calculate from student table
    case 'streak':
      return stats.longestStreak;
    case 'exercises':
      return stats.totalExercisesCompleted;
    case 'achievement':
      return stats.totalAchievements;
    default:
      return 0;
  }
}

function calculateUnlockProgress(item: any, stats: any): number {
  const current = getCurrentProgress(item, stats);
  const required = item.unlockRequirementValue;
  return Math.min(100, Math.round((current / required) * 100));
}