import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    console.log('Transaction Status Timeout URL hit');
    const body = await req.json();
    console.log(body);

    const conversationID = body.ConversationID;

    await prisma.payout.updateMany({
        where: {
            transactionId: conversationID,
        },
        data: {
            status: 'TIMED_OUT',
        },
    });

    return NextResponse.json({ message: 'Transaction status timeout received' });
}
