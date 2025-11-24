import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';

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

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE' && session.user.role !== 'REPORT' && session.user.role !== 'EMPLOYEE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get search query from URL parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Perform searches across different entities
    const lowerQuery = query.toLowerCase();
    
    // Search employees
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { staffNo: { contains: lowerQuery, mode: 'insensitive' } },
          { position: { contains: lowerQuery, mode: 'insensitive' } },
          { department: { contains: lowerQuery, mode: 'insensitive' } },
          { user: { name: { contains: lowerQuery, mode: 'insensitive' } } },
          { user: { email: { contains: lowerQuery, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: true,
      },
      take: 10, // Limit to 10 results per category
    });

    // Search leave requests
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        OR: [
          { type: { contains: lowerQuery, mode: 'insensitive' } },
          { employee: { user: { name: { contains: lowerQuery, mode: 'insensitive' } } } },
        ],
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      take: 10,
    });

    // Search payslips
    const payslips = await prisma.payslip.findMany({
      where: {
        OR: [
          { employee: { user: { name: { contains: lowerQuery, mode: 'insensitive' } } } },
          { employee: { staffNo: { contains: lowerQuery, mode: 'insensitive' } } },
        ],
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      take: 10,
    });

    // Search documents
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { filename: { contains: lowerQuery, mode: 'insensitive' } },
          { employee: { user: { name: { contains: lowerQuery, mode: 'insensitive' } } } },
        ],
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      take: 10,
    });

    // Search activities if user has appropriate permissions
    let activities = [];
    if (session.user.role === 'ADMIN' || session.user.role === 'HR') {
      activities = await prisma.activity.findMany({
        where: {
          OR: [
            { description: { contains: lowerQuery, mode: 'insensitive' } },
            { module: { contains: lowerQuery, mode: 'insensitive' } },
            { actionType: { contains: lowerQuery, mode: 'insensitive' } },
            { employee: { user: { name: { contains: lowerQuery, mode: 'insensitive' } } } },
          ],
        },
        include: {
          employee: {
            include: {
              user: true
            }
          }
        },
        take: 10,
      });
    }

    // Format results
    const searchResults = {
      employees: employees.map(emp => ({
        id: emp.id,
        title: emp.user.name || 'Unknown Employee',
        type: 'Employee',
        description: `${emp.position} - ${emp.department}`,
        href: `/admin/employees/${emp.id}`,
        matchType: 'employee',
        metadata: {
          staffNo: emp.staffNo,
          position: emp.position,
          department: emp.department,
        }
      })),
      leaves: leaves.map(leave => ({
        id: leave.id,
        title: `${leave.employee?.user?.name || 'Unknown'} - ${leave.type} Leave`,
        type: 'Leave Request',
        description: `Status: ${leave.status}, ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`,
        href: `/admin/leaves/${leave.id}`,
        matchType: 'leave',
        metadata: {
          status: leave.status,
          startDate: leave.startDate,
          endDate: leave.endDate,
        }
      })),
      payslips: payslips.map(pay => ({
        id: pay.id,
        title: `${pay.employee?.user?.name || 'Unknown'} - Payslip`,
        type: 'Payslip',
        description: `Month: ${new Date(pay.month).toLocaleString()}, Net Pay: ${pay.netPay}`,
        href: `/employee/payslips/${pay.id}`,
        matchType: 'payslip',
        metadata: {
          month: pay.month,
          netPay: pay.netPay,
          grossSalary: pay.grossSalary,
        }
      })),
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.filename,
        type: 'Document',
        description: `Uploaded for ${doc.employee?.user?.name || 'Unknown'}`,
        href: `/employee/documents/${doc.id}`, // This might need to be adjusted based on your routing
        matchType: 'document',
        metadata: {
          filename: doc.filename,
          employeeName: doc.employee?.user?.name,
        }
      })),
      activities: activities.map(activity => ({
        id: activity.id,
        title: `${activity.employee?.user?.name || 'Unknown'} - ${activity.actionType}`,
        type: 'Activity',
        description: `${activity.description}, Module: ${activity.module}`,
        href: `/admin/activities/${activity.id}`,
        matchType: 'activity',
        metadata: {
          actionType: activity.actionType,
          module: activity.module,
          timestamp: activity.timestamp,
        }
      })),
    };

    return new Response(JSON.stringify(searchResults), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return new Response(JSON.stringify({ error: 'Failed to perform search' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}