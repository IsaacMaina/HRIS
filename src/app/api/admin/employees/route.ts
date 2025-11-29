import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import bcrypt from 'bcryptjs';

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

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch employees from the database
    const employees = await prisma.employee.findMany({
      include: {
        user: true, // Include user to get email and name
        bank: true, // Include bank information
      },
    });

    // Format the employees to match what the frontend expects
    const formattedEmployees = employees.map(employee => ({
      id: employee.id,
      name: employee.user.name || 'Unknown Employee',
      staffNo: employee.staffNo || 'N/A',
      position: employee.position || 'N/A',
      department: employee.department || 'N/A',
      email: employee.user.email || 'N/A',
      salary: employee.salary,
      bank: employee.bank?.name || 'N/A',
      bankAccNo: employee.bankAccNo || 'N/A',
      phone: employee.phone || null,
    }));

    return new Response(JSON.stringify(formattedEmployees), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch employees' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    const body = await request.json();

    // Extract employee data from the request body
    const {
      name,
      email,
      password = '123456', // Default password if none provided
      staffNo,
      position,
      department,
      salary,
      phone,
      bankId,
      bankAccNo,
      nhifRate = 0,
      nssfRate = 0
    } = body;

    // Validate required fields
    if (!name || !email || !staffNo || !position || !department || !phone || !bankId || !bankAccNo || !nhifRate || !nssfRate) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: name, email, staffNo, position, department, phone, bankId, bankAccNo, nhifRate, nssfRate'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate phone number format (must start with 2547 followed by 8 digits)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^2547\d{8}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({
        error: 'Phone number must start with 2547 followed by 8 digits (e.g., 254712345678)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate deduction rates
    const nhifRateNum = parseFloat(nhifRate) || 0;
    const nssfRateNum = parseFloat(nssfRate) || 0;
    if (isNaN(nhifRateNum) || nhifRateNum < 0) {
      return new Response(JSON.stringify({
        error: 'NHIF rate must be a valid non-negative number'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isNaN(nssfRateNum) || nssfRateNum < 0) {
      return new Response(JSON.stringify({
        error: 'NSSF rate must be a valid non-negative number'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User with this email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if employee with this staffNo already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { staffNo },
    });

    if (existingEmployee) {
      return new Response(JSON.stringify({ error: 'Employee with this staff number already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and employee in a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create user in the database
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'EMPLOYEE', // Default role for employees
        },
      });

      // Create employee record associated with the user
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          staffNo,
          position,
          department,
          salary: parseFloat(salary) || 0,
          phone: phone || null,
          bankId: bankId || null,
          bankAccNo: bankAccNo || null,
          nhifRate: parseFloat(nhifRate) || 0,
          nssfRate: parseFloat(nssfRate) || 0,
        },
      });

      // Create a welcome notification for the new employee
      await tx.notification.create({
        data: {
          title: 'Welcome to the Company!',
          message: `Welcome aboard, ${name}! Your account has been created. Your default password is: ${password}`,
          type: 'ACCOUNT_CREATED',
          recipientId: user.id,
        },
      });

      return { user, employee };
    });

    const { user, employee } = result;

    // Log the activity
    const sessionEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    await prisma.activity.create({
      data: {
        employeeId: sessionEmployee?.id,
        actionType: 'CREATE',
        description: `Created new employee record for ${user.name}`,
        module: 'EMPLOYEE',
        details: {
          targetEmployeeId: employee.id,
          targetEmployeeName: user.name,
          action: 'CREATE_EMPLOYEE'
        }
      }
    });

    // Format the response
    const formattedEmployee = {
      id: employee.id,
      name: user.name,
      staffNo: employee.staffNo,
      position: employee.position,
      department: employee.department,
      email: user.email,
      phone: employee.phone || 'N/A',
      salary: employee.salary,
      bank: employee.bankId || 'N/A',
      bankAccNo: employee.bankAccNo || 'N/A',
      nhifRate: employee.nhifRate,
      nssfRate: employee.nssfRate,
    };

    return new Response(JSON.stringify(formattedEmployee), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return new Response(JSON.stringify({ error: 'Failed to create employee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}