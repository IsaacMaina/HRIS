import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';

// GET /api/employee/profile - Get employee profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        bank: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/employee/profile - Update employee profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, position, department, bankId, bankAccNo } = body;

    console.log('Updating profile for user ID:', session.user.id);
    console.log('Received name for update:', name);

    // Fetch original employee data before updating for activity logging
    const originalEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true, // Get the original user data as well
      },
    });

    if (!originalEmployee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    // Update user name
    let updatedUser = null;
    if (name) {
      updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      });
      console.log('User name updated in DB.');
    }

    // Update employee details
    const updatedEmployee = await prisma.employee.update({
      where: { userId: session.user.id },
      data: {
        phone,
        position,
        department,
        bankId: bankId || null,
        bankAccNo,
      },
    });

    // Log the activity with detailed changes in natural English
    const updatedFields = [];
    const changes = [];
    const previousData = {};
    const updatedData = {};

    if (name && originalEmployee.user.name !== name) {
      changes.push(`Name changed from "${originalEmployee.user.name}" to "${name}"`);
      updatedFields.push('name');
      previousData['name'] = originalEmployee.user.name;
      updatedData['name'] = name;
    }
    if (phone && originalEmployee.phone !== phone) {
      changes.push(`Phone changed from "${originalEmployee.phone}" to "${phone}"`);
      updatedFields.push('phone');
      previousData['phone'] = originalEmployee.phone;
      updatedData['phone'] = phone;
    }
    if (position && originalEmployee.position !== position) {
      changes.push(`Position changed from "${originalEmployee.position}" to "${position}"`);
      updatedFields.push('position');
      previousData['position'] = originalEmployee.position;
      updatedData['position'] = position;
    }
    if (department && originalEmployee.department !== department) {
      changes.push(`Department changed from "${originalEmployee.department}" to "${department}"`);
      updatedFields.push('department');
      previousData['department'] = originalEmployee.department;
      updatedData['department'] = department;
    }
    if (bankId && originalEmployee.bankId !== bankId) {
      // Get bank names instead of ID for readability
      const [oldBank, newBank] = await Promise.all([
        originalEmployee.bankId ? prisma.bank.findUnique({ where: { id: originalEmployee.bankId } }) : null,
        prisma.bank.findUnique({ where: { id: bankId } })
      ]);

      const oldBankName = oldBank?.name || originalEmployee.bankId || 'Not set';
      const newBankName = newBank?.name || bankId;

      changes.push(`Bank changed from "${oldBankName}" to "${newBankName}"`);
      updatedFields.push('bankId');
      previousData['bankId'] = originalEmployee.bankId;
      updatedData['bankId'] = bankId;
    }
    if (bankAccNo && originalEmployee.bankAccNo !== bankAccNo) {
      changes.push(`Bank Account Number changed from "${originalEmployee.bankAccNo}" to "${bankAccNo}"`);
      updatedFields.push('bankAccNo');
      previousData['bankAccNo'] = originalEmployee.bankAccNo;
      updatedData['bankAccNo'] = bankAccNo;
    }

    // Create a more descriptive description
    let description = 'Updated profile information';
    if (changes.length > 0) {
      description = `Updated profile: ${changes.join('; ')}`;
    }

    await prisma.activity.create({
      data: {
        employeeId: updatedEmployee.id,
        actionType: 'UPDATE',
        description: description,
        module: 'Profile',
        details: {
          updatedFields: updatedFields,
          changes: changes,
          previousData: previousData,
          updatedData: updatedData
        },
      },
    });

    // Return updated employee data along with the updated user name from the database
    return NextResponse.json({
      ...updatedEmployee,
      name: updatedUser?.name || name // Include the updated name from the database
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating employee profile:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
