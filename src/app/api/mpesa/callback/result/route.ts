// src/app/api/mpesa/callback/result/route.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('M-Pesa Result Callback received:', JSON.stringify(payload, null, 2));

    // Handle STK Push callbacks (C2B or Paybill)
    if (payload && payload.Body && payload.Body.stkCallback) {
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = payload.Body.stkCallback;

      console.log(`STK Callback received - Request ID: ${MerchantRequestID}, Code: ${ResultCode}, Desc: ${ResultDesc}`);

      // Update payout status in database
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: MerchantRequestID },
            { transactionId: CheckoutRequestID }
          ]
        }
      });

      if (payout) {
        const status = ResultCode === 0 ? 'SUCCESS' : 'FAILED';

        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status,
            transactionId: MerchantRequestID || CheckoutRequestID,
          }
        });

        console.log(`STK Payout status updated to: ${status}`);
      }
    }
    // Handle B2C payment callbacks
    else if (payload && payload.Result) {
      const {
        ConversationID,
        OriginatorConversationID,
        ResultCode,
        ResultDesc,
        TransactionID
      } = payload.Result;

      console.log(`B2C Callback received - Conversation ID: ${ConversationID || OriginatorConversationID}, Code: ${ResultCode}, Desc: ${ResultDesc}`);

      // Update payout status in database
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: ConversationID },
            { transactionId: OriginatorConversationID },
            { transactionId: TransactionID }
          ]
        }
      });

      if (payout) {
        const status = ResultCode === 0 ? 'SUCCESS' : 'FAILED';

        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status,
            transactionId: ConversationID || OriginatorConversationID || TransactionID,
          }
        });

        console.log(`B2C Payout status updated to: ${status}`);
      }
    }
    // Handle general transaction status query responses
    else if (payload && payload.TransactionID) {
      const {
        TransactionID,
        ResultCode,
        ResultDesc,
        ConversationID
      } = payload;

      console.log(`Transaction Status Callback received - Transaction ID: ${TransactionID}, Code: ${ResultCode}, Desc: ${ResultDesc}`);

      // Update payout status in database
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: TransactionID },
            { transactionId: ConversationID }
          ]
        }
      });

      if (payout) {
        const status = ResultCode === 0 ? 'SUCCESS' : 'FAILED';

        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status,
            transactionId: TransactionID,
          }
        });

        console.log(`Transaction Status Payout status updated to: ${status}`);
      }
    }

    // Return success response to Safaricom
    return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing result callback:', error);
    // Still return success to Safaricom to avoid retry attempts
    return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}