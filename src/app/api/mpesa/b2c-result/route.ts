import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log('B2C Result URL hit');
  const body = await req.json();
  console.log(body);

  const result = body.Result;
  const conversationID = result.ConversationID;
  const transactionID = result.TransactionID;

  if (result.ResultCode === 0) {
    // Payment was successful
    await prisma.payout.updateMany({
      where: {
        transactionId: conversationID,
      },
      data: {
        status: 'SUCCESS',
        ref: transactionID,
      },
    });
  } else {
    // Payment failed
    await prisma.payout.updateMany({
      where: {
        transactionId: conversationID,
      },
      data: {
        status: 'FAILED',
      },
    });
  }

  return NextResponse.json({ message: 'B2C result received' });
}
