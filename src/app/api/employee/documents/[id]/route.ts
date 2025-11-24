import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';

// GET /api/employee/documents/[id] - Get specific document
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const document = await prisma.document.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id, // Ensure the employee can only access their own documents
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/employee/documents/[id] - Update a specific document
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    const document = await prisma.document.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id,
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const { filename, path } = await req.json();
    const updates: any = {};

    if (filename) updates.filename = filename;
    if (path) updates.path = path;

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: updates,
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'UPDATE',
        description: `Updated document: ${filename || document.filename}`,
        module: 'Documents',
      },
    });

    return NextResponse.json(updatedDocument, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/employee/documents/[id] - Delete a specific document
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    const document = await prisma.document.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id,
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: params.id },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'DELETE',
        description: `Deleted document: ${document.filename}`,
        module: 'Documents',
      },
    });

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}