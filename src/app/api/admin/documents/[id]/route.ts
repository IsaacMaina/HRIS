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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = await context.params; // Await the params promise
    console.log('Params:', params); // Log the params for debugging
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Document ID:', id); // Log the ID for debugging

    // Fetch the document to get the file path before deletion
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the activity before deletion
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    await prisma.activity.create({
      data: {
        employeeId: employee?.id,
        actionType: 'DELETE',
        description: `Deleted document: ${document.filename}`,
        module: 'DOCUMENT',
        details: {
          targetDocumentId: document.id,
          targetDocumentName: document.filename,
          action: 'DELETE_DOCUMENT'
        }
      }
    });

    // Delete the document from the database
    await prisma.document.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: 'Document deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}