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

    // Fetch employee data based on filters
    const employees = await prisma.employee.findMany({
      include: {
        user: true, // Include user to get name and email
        bank: true  // Include bank info if available
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });

    // Apply filters
    const filteredEmployees = employees.filter(emp => {
      if (filters.searchTerm) {
        const matchesSearch = 
          emp.user.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          emp.staffNo.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          emp.position.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          emp.user.email.toLowerCase().includes(filters.searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
      }

      if (filters.departmentFilter && filters.departmentFilter !== 'All') {
        if (emp.department !== filters.departmentFilter) return false;
      }

      if (filters.positionFilter && filters.positionFilter !== 'All') {
        if (emp.position !== filters.positionFilter) return false;
      }

      return true;
    });

    // Format employee data for Excel
    const excelData = filteredEmployees.map(emp => ({
      'ID': emp.id,
      'Name': emp.user.name,
      'Staff No.': emp.staffNo,
      'Position': emp.position,
      'Department': emp.department,
      'Email': emp.user.email,
      'Phone': emp.phone || 'N/A',
      'Salary': emp.salary,
      'Bank': emp.bank?.name || 'N/A',
      'Account No.': emp.bankAccNo || 'N/A',
      'NHIF Rate': emp.nhifRate,
      'NSSF Rate': emp.nssfRate,
      'Hire Date': new Date(emp.createdAt).toLocaleDateString(),
    }));

    // Create worksheet and workbook
    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Employees');

    // Generate Excel buffer
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Log the export activity
    await prisma.activity.create({
      data: {
        employeeId: exportingEmployee?.id,
        actionType: 'EXPORT',
        description: `Exported ${filteredEmployees.length} employee records`,
        module: 'EMPLOYEE',
        details: {
          action: 'EXPORT_EMPLOYEES',
          exportedEmployeeCount: filteredEmployees.length,
          filterParams: filters
        }
      }
    });

    // Set response headers for Excel file download
    const fileName = `employees_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting employees:', error);
    return new Response(JSON.stringify({ error: 'Failed to export employees' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}