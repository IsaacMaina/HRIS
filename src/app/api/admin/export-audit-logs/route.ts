import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { utils, write } from 'xlsx';

// Extend the session type to include our custom properties
interface CustomSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { filters } = await request.json();

    // Get the employee who is performing the export
    const exportingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!exportingEmployee) {
      return new Response(JSON.stringify({ error: 'Exporting employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch audit logs based on filters
    const auditLogs = await prisma.activity.findMany({
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Apply filters
    const filteredLogs = auditLogs.filter(log => {
      if (filters.searchTerm) {
        const matchesSearch =
          log.actionType.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          log.employee.user.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          log.module.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          log.description.toLowerCase().includes(filters.searchTerm.toLowerCase());

        if (!matchesSearch) return false;
      }

      if (filters.actionFilter && filters.actionFilter !== 'All') {
        if (log.actionType !== filters.actionFilter) return false;
      }

      if (filters.moduleFilter && filters.moduleFilter !== 'All') {
        if (log.module !== filters.moduleFilter) return false;
      }

      return true;
    });

    // Format data for Excel
    const excelData = filteredLogs.map(log => ({
      'ID': log.id,
      'Action Type': log.actionType,
      'Module': log.module,
      'Description': log.description,
      'Timestamp': log.timestamp.toISOString(),
      'Employee Name': log.employee.user.name,
      'Employee ID': log.employeeId,
    }));

    // Create a worksheet and workbook
    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

    // Generate Excel buffer
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Log the export activity
    await prisma.activity.create({
      data: {
        employeeId: exportingEmployee?.id,
        actionType: 'EXPORT',
        description: `Exported ${filteredLogs.length} audit logs`,
        module: 'AUDIT',
        details: {
          targetId: 'ALL_AUDIT_LOGS', // Indicating bulk export
          action: 'EXPORT_AUDIT_LOGS'
        }
      }
    });

    // Set response headers for Excel file download
    const fileName = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return new Response(JSON.stringify({ error: 'Failed to export audit logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}