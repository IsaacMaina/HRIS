import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

// POST /api/employee/settings/send-test-notification - Send test notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        emailNotifications: true,
        smsNotifications: true,
        employee: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const results: { email?: any; sms?: any } = {};

    // Send email notification if enabled and email exists
    if (user.emailNotifications && user.email) {
      const emailSubject = 'Test Email Notification from University HRIS';
      const emailText = `Hello ${user.name || 'User'},

This is a test email notification from your University HRIS account.`;
      results.email = await sendEmail(user.email, emailSubject, emailText);
    }

    // Send SMS notification if enabled and phone number exists
    if (user.smsNotifications && user.employee?.phone) {
      const smsMessage = `Hello ${user.name || 'User'}, This is a test SMS notification from your University HRIS account.`;
      results.sms = await sendSms(user.employee.phone, smsMessage);
    }

    if (!results.email && !results.sms) {
      return NextResponse.json({ message: 'No notifications sent. Check preferences or contact info.' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Test notifications sent (check console for SMS simulation)', results }, { status: 200 });
  } catch (error) {
    console.error('Error sending test notifications:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
