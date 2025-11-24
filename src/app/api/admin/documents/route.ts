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

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any);

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For file upload, we need to process the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const employeeId = formData.get('employeeId') as string | null;

    if (!file || !category || !employeeId) {
      return new Response(JSON.stringify({ error: 'File, category, and employee are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the employee ID of the uploading user
    const uploadingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!uploadingEmployee) {
      return new Response(JSON.stringify({ error: 'Uploading employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!targetEmployee) {
      return new Response(JSON.stringify({ error: 'Target employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let documentId;

    await prisma.$transaction(async (tx) => {
      // Here you would typically save the file to storage (e.g., AWS S3, local storage, etc.)
      // For this example, I'll just create a record in the database
      // In a real implementation, you'd save the file and store the path

      // Create the document record in the database
      const document = await tx.document.create({
        data: {
          filename: file.name,
          path: `/uploads/${file.name}`, // This would be the actual path where you save the file
          employeeId: employeeId,
        },
      });

      documentId = document.id;

      // Log the activity
      await tx.activity.create({
        data: {
          employeeId: uploadingEmployee.id,
          actionType: 'CREATE',
          description: `Uploaded document: ${file.name} for ${targetEmployee.user.name}`,
          module: 'DOCUMENT',
          details: {
            targetDocumentId: document.id,
            targetDocumentName: file.name,
            targetEmployeeId: employeeId,
            action: 'UPLOAD_DOCUMENT'
          }
        }
      });

      // Create a notification for the employee
      await tx.notification.create({
        data: {
          title: 'New Document Uploaded',
          message: `A new document, "${file.name}", has been uploaded to your profile.`,
          type: 'DOCUMENT_UPLOAD',
          recipientId: targetEmployee.userId,
        },
      });
    });

    return new Response(JSON.stringify({
      message: 'Document uploaded successfully',
      documentId: documentId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch documents from the database
    const documents = await prisma.document.findMany({
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
    });

    // Format the documents to match what the frontend expects
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      path: doc.path,
      uploadedAt: doc.createdAt.toISOString(),
      uploadedBy: doc.employee.user.name || 'Unknown Employee',
    }));

    return new Response(JSON.stringify(formattedDocuments), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}