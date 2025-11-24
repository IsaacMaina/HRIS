import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/banks - Get all banks
export async function GET(req: NextRequest) {
  try {
    const banks = await prisma.bank.findMany();
    return NextResponse.json(banks, { status: 200 });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
