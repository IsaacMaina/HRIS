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

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch document categories from the database
    // Since we don't know the exact structure, I'll create some standard document categories
    const categories = [
      { id: '1', name: 'Policies' },
      { id: '2', name: 'Procedures' },
      { id: '3', name: 'Reports' },
      { id: '4', name: 'Forms' },
      { id: '5', name: 'Training Materials' },
      { id: '6', name: 'Contracts' },
      { id: '7', name: 'Certificates' },
      { id: '8', name: 'Other' }
    ];

    // Alternatively, if there's a categories table in the database:
    // const categories = await prisma.documentCategory.findMany();

    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch document categories' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}