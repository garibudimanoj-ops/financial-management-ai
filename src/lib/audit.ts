import { prisma } from './prisma';

interface LogParams {
  action: string;
  businessId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Creates an audit log entry.
 * Catches error internally to avoid crashing core operations on log failure.
 */
export async function logAuditEvent({ action, businessId, userId, details, ipAddress }: LogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        businessId,
        userId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
