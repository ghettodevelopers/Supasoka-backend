const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Log admin actions for audit trail
 */
async function logAdminAction({
  adminId,
  adminEmail,
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
        userAgent
      }
    });
    
    logger.info(`Audit log: ${action} by ${adminEmail} on ${entityType}${entityId ? ` (${entityId})` : ''}`);
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs with filtering
 */
async function getAuditLogs({
  adminId = null,
  action = null,
  entityType = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 50
}) {
  try {
    const where = {};
    
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.adminAuditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    throw error;
  }
}

module.exports = {
  logAdminAction,
  getAuditLogs
};



