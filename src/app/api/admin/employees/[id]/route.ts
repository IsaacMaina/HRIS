import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise as per Next.js requirement
    const resolvedParams = await params;

    // Try getting session via getServerSession first
    let session = await getServerSession(authOptions as any) as CustomSession;

    // If getServerSession doesn't work, try getting the token directly
    if (!session?.user) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        // Build a session-like object from the token
        session = {
          user: {
            id: token.sub as string,
            role: token.role as string,
          }
        } as CustomSession;
      }
    }

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = resolvedParams;

    // Fetch the specific employee from the database
    let employee;
    try {
      employee = await prisma.employee.findUnique({
        where: {
          id: id,
        },
        include: {
          user: true, // Include user to get email and name
          bank: true, // Include bank information
        },
      });
    } catch (error: any) {
      console.error('Error fetching employee from database:', error);
      // Handle specific Prisma errors
      if (error.code === 'P2024') { // Timeout error
        return new Response(JSON.stringify({ error: 'Database timeout, please try again' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1001') { // Connection error
        return new Response(JSON.stringify({ error: 'Unable to connect to database' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1017') { // Connection closed
        return new Response(JSON.stringify({ error: 'Database connection closed, please try again' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the employee data to match what the frontend expects
    const formattedEmployee = {
      id: employee.id,
      name: employee.user?.name || employee.user?.email?.split('@')[0] || 'Unknown Employee',
      staffNo: employee.staffNo,
      position: employee.position,
      department: employee.department,
      email: employee.user?.email || '',
      phone: employee.phone || 'N/A',
      hireDate: employee.createdAt.toISOString(), // Using createdAt as hire date since there's no field for hire date
      salary: employee.salary,
      bank: employee.bank?.name || 'N/A',
      bankAccNo: employee.bankAccNo || 'N/A',
      nhifRate: employee.nhifRate || 0,
      nssfRate: employee.nssfRate || 0,
    };

    return new Response(JSON.stringify(formattedEmployee), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise as per Next.js requirement
    const resolvedParams = await params;

    // Try getting session via getServerSession first
    let session = await getServerSession(authOptions as any) as CustomSession;

    // If getServerSession doesn't work, try getting the token directly
    if (!session?.user) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        // Build a session-like object from the token
        session = {
          user: {
            id: token.sub as string,
            role: token.role as string,
          }
        } as CustomSession;
      }
    }

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = resolvedParams;

    // Parse the request body
    const body = await request.json();

    // Extract employee data from the request body
    const {
      name,
      email,
      staffNo,
      position,
      department,
      salary,
      phone,
      bankId,
      bankAccNo,
      nhifRate,
      nssfRate
    } = body;

    let formattedEmployee;

    try {
      // First find the employee to update outside the transaction
      const originalEmployee = await prisma.employee.findUnique({
        where: { id: id },
        include: {
          user: true,
        }
      });

      if (!originalEmployee) {
        return new Response(JSON.stringify({ error: 'Employee not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get the current admin's employee ID for activity logging outside the main transaction
      const currentAdmin = await prisma.employee.findFirst({
        where: { userId: session.user.id }
      });

      // Perform the updates in a transaction
      const updatedEmployee = await prisma.$transaction(async (tx) => {
        // Update the associated user record
        const updatedUser = await tx.user.update({
          where: { id: originalEmployee.userId },
          data: {
            name: name,
            email: email,
          },
        });

        // Validate bankId exists in the database if provided
        let validatedBankId = originalEmployee.bankId; // Default to existing bankId
        if (bankId && bankId !== 'null' && bankId !== 'undefined' && bankId !== '') {
          const bankExists = await tx.bank.count({
            where: { id: bankId }
          });
          if (bankExists > 0) {
            validatedBankId = bankId;
          }
          // If bankId doesn't exist, keep the original bankId (no change)
        } else if (bankId === null || bankId === '' || bankId === 'null' || bankId === 'undefined') {
          // Explicit null, empty, 'null', or 'undefined' means user wants to clear the bank
          validatedBankId = null;
        }

        // Update the employee record
        const result = await tx.employee.update({
          where: { id: id },
          data: {
            staffNo,
            position,
            department,
            salary: parseFloat(salary) || originalEmployee.salary,
            phone: phone || null,
            bankId: validatedBankId,
            bankAccNo: bankAccNo || originalEmployee.bankAccNo,
            nhifRate: parseFloat(nhifRate) || originalEmployee.nhifRate,
            nssfRate: parseFloat(nssfRate) || originalEmployee.nssfRate,
          },
          include: {
            user: true,
            bank: true,
          }
        });

        // Log the activity with detailed changes
        const changes: { field: string; oldValue: any; newValue: any }[] = [];

        if (originalEmployee.user.name !== updatedUser.name) {
          changes.push({ field: 'name', oldValue: originalEmployee.user.name, newValue: updatedUser.name });
        }
        if (originalEmployee.user.email !== updatedUser.email) {
          changes.push({ field: 'email', oldValue: originalEmployee.user.email, newValue: updatedUser.email });
        }
        if (originalEmployee.staffNo !== result.staffNo) {
          changes.push({ field: 'staffNo', oldValue: originalEmployee.staffNo, newValue: result.staffNo });
        }
        if (originalEmployee.position !== result.position) {
          changes.push({ field: 'position', oldValue: originalEmployee.position, newValue: result.position });
        }
        if (originalEmployee.department !== result.department) {
          changes.push({ field: 'department', oldValue: originalEmployee.department, newValue: result.department });
        }
        if (originalEmployee.salary !== result.salary) {
          changes.push({ field: 'salary', oldValue: originalEmployee.salary, newValue: result.salary });
        }
        if (originalEmployee.phone !== result.phone) {
          changes.push({ field: 'phone', oldValue: originalEmployee.phone, newValue: result.phone });
        }
        if (originalEmployee.bankId !== result.bankId) {
          changes.push({ field: 'bankId', oldValue: originalEmployee.bankId, newValue: result.bankId });
        }
        if (originalEmployee.bankAccNo !== result.bankAccNo) {
          changes.push({ field: 'bankAccNo', oldValue: originalEmployee.bankAccNo, newValue: result.bankAccNo });
        }
        if (originalEmployee.nhifRate !== result.nhifRate) {
          changes.push({ field: 'nhifRate', oldValue: originalEmployee.nhifRate, newValue: result.nhifRate });
        }
        if (originalEmployee.nssfRate !== result.nssfRate) {
          changes.push({ field: 'nssfRate', oldValue: originalEmployee.nssfRate, newValue: result.nssfRate });
        }

        // Log the activity
        await tx.activity.create({
          data: {
            employeeId: currentAdmin?.id,
            actionType: 'UPDATE',
            description: `Updated employee record for ${result.user.name}`,
            module: 'EMPLOYEE',
            details: {
              targetEmployeeId: result.id,
              targetEmployeeName: result.user.name,
              action: 'UPDATE_EMPLOYEE',
              changes: changes,
            }
          }
        });

        // Create a notification for the employee
        await tx.notification.create({
          data: {
            title: 'Profile Updated',
            message: 'Your employee profile has been updated by an administrator.',
            type: 'PROFILE_UPDATE',
            recipientId: originalEmployee.userId,
          },
        });

        return result;
      }, {
        maxWait: 10000, // Maximum time to wait for the transaction to start (default: 2000ms)
        timeout: 30000  // Maximum time for the entire transaction (default: 5000ms)
      });

      // Format the response
      formattedEmployee = {
        id: updatedEmployee.id,
        name: updatedEmployee.user?.name || 'Unknown Employee',
        staffNo: updatedEmployee.staffNo,
        position: updatedEmployee.position,
        department: updatedEmployee.department,
        email: updatedEmployee.user?.email || '',
        phone: updatedEmployee.phone || 'N/A',
        hireDate: updatedEmployee.createdAt.toISOString(), // Using createdAt as hire date
        salary: updatedEmployee.salary,
        bank: updatedEmployee.bank?.name || 'N/A',
        bankAccNo: updatedEmployee.bankAccNo || 'N/A',
        nhifRate: updatedEmployee.nhifRate,
        nssfRate: updatedEmployee.nssfRate,
      };
    } catch (error: any) {
      console.error('Database error in employee update transaction:', error);
      // Handle specific Prisma errors
      if (error.code === 'P2024') { // Timeout error
        return new Response(JSON.stringify({ error: 'Database timeout, please try again' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1001') { // Connection error
        return new Response(JSON.stringify({ error: 'Unable to connect to database' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1017') { // Connection closed
        return new Response(JSON.stringify({ error: 'Database connection closed, please try again' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify(formattedEmployee), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update employee';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise as per Next.js requirement
    const resolvedParams = await params;

    // Try getting session via getServerSession first
    let session = await getServerSession(authOptions as any) as CustomSession;

    // If getServerSession doesn't work, try getting the token directly
    if (!session?.user) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        // Build a session-like object from the token
        session = {
          user: {
            id: token.sub as string,
            role: token.role as string,
          }
        } as CustomSession;
      }
    }

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = resolvedParams;

    let employee;
    try {
      // Check if the employee exists
      employee = await prisma.employee.findUnique({
        where: { id: id },
        include: {
          user: true,
        }
      });
    } catch (error: any) {
      console.error('Error checking employee existence:', error);
      // Handle specific Prisma errors
      if (error.code === 'P2024') { // Timeout error
        return new Response(JSON.stringify({ error: 'Database timeout, please try again' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1001') { // Connection error
        return new Response(JSON.stringify({ error: 'Unable to connect to database' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1017') { // Connection closed
        return new Response(JSON.stringify({ error: 'Database connection closed, please try again' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Log the activity before deletion
      await prisma.activity.create({
        data: {
          employeeId: (await prisma.employee.findFirst({
            where: { userId: session.user.id }
          }))?.id,
          actionType: 'DELETE',
          description: `Deleted employee record for ${employee.user.name}`,
          module: 'EMPLOYEE',
          details: {
            targetEmployeeId: employee.id,
            targetEmployeeName: employee.user.name,
            action: 'DELETE_EMPLOYEE'
          }
        }
      });

      // Create a notification for the employee before deletion
      await prisma.notification.create({
        data: {
          title: 'Account Deletion',
          message: `Your account has been deleted by an administrator. Your user ID was ${employee.userId}.`,
          type: 'ACCOUNT_DELETED',
          recipientId: employee.userId,
        },
      });

      // Delete all notifications associated with this user first to avoid foreign key constraint
      await prisma.notification.deleteMany({
        where: {
          recipientId: employee.userId,
        }
      });

      // Delete the associated user (which will also delete the employee due to foreign key constraints)
      await prisma.user.delete({
        where: { id: employee.userId },
      });
    } catch (error: any) {
      console.error('Error during employee deletion:', error);
      // Handle specific Prisma errors
      if (error.code === 'P2024') { // Timeout error
        return new Response(JSON.stringify({ error: 'Database timeout, please try again' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1001') { // Connection error
        return new Response(JSON.stringify({ error: 'Unable to connect to database' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (error.code === 'P1017') { // Connection closed
        return new Response(JSON.stringify({ error: 'Database connection closed, please try again' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Employee deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}