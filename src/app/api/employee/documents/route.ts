import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';

// GET /api/employee/documents - Get employee documents
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: { employeeId: employee.id },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/employee/documents - Create/upload a new document
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    // In a real application, you would handle file upload here
    // For now, I'll handle JSON data that would represent the document metadata
    const body = await req.json();
    const { filename, path } = body;

    if (!filename || !path) {
      return NextResponse.json({ message: 'Missing filename or path' }, { status: 400 });
    }

    const newDocument = await prisma.document.create({
      data: {
        employeeId: employee.id,
        filename,
        path,
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'CREATE',
        description: `Uploaded document: ${filename}`,
        module: 'Documents',
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating employee document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
