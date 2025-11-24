import nodemailer from 'nodemailer';

// Configure your email transporter
// You'll need to replace these with your actual SMTP details or an ESP's configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true', // Use 'true' for 465, 'false' for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM, // Your verified sender email
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return { success: false, message: 'Failed to send email' };
  }
}
