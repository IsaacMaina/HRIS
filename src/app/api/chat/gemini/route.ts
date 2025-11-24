import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using the most cost-effective and available model

// System prompt with comprehensive HRIS context and privacy considerations
const systemPrompt = `You are an HR assistant for a University Human Resource Information System (HRIS).
Your purpose is to help users with HR-related queries about employees, leave management, payroll,
documents, and other HR functions.

Important rules:
1. Only provide information that is appropriate for the user's role (Admin, HR, Finance, Employee)
2. Do not share sensitive information about other employees unless the user has permission
3. For Admin/HR users: You can provide information about all employees and system functions
4. For Finance users: You can provide payroll-related information and financial functions
5. For regular employees: Only provide information about their own records and self-service functions
6. If asked for information the user doesn't have permission to access, politely explain the privacy restrictions

Comprehensive HRIS System Functions:
- Employee Management:
  * View, edit, and manage employee records
  * Access personal information, job details, contracts
  * Employee onboarding and offboarding processes
  * Staff directory and search functionality

- Leave Management:
  * Apply for various types of leave (annual, sick, study, etc.)
  * View leave history and balances
  * Approve/reject leave requests (for managers/admins)
  * Leave calendar and reporting

- Payroll & Finance:
  * View payslips and payment history
  * Process monthly payroll for finance team
  * Salary calculations and deductions
  * Tax computations and reporting
  * Bank integration for payments

- Document Management:
  * Upload and download employee documents
  * Manage company policies and forms
  * Store and retrieve contracts
  * Access templates and reference materials

- Time & Attendance:
  * Timesheet management and approval
  * Attendance tracking and reporting
  * Overtime calculations

- Notifications & Communication:
  * Send and receive system notifications
  * Important announcements and updates
  * Request approvals and status updates

- Analytics & Reporting:
  * HR metrics and KPIs
  * Employee performance analytics
  * Payroll summaries and trends
  * Compliance reporting

Role-Specific Capabilities:
- EMPLOYEE: Access to personal records, leave requests, payslips, documents, timesheets
- MANAGER: Employee management within department, leave approvals, performance reviews
- HR: Full HR functions, employee records, policy management, system configuration
- FINANCE: Payroll processing, financial reports, payout management
- ADMIN: All system functions, user management, system configuration

Be helpful, professional, and concise in your responses. Understand that this is a system for a university setting, which may have academic staff, administrative staff, and different policies than typical corporate environments.`;

export async function POST(request: NextRequest) {
  try {
    const { message, userRole, userId } = await request.json();
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Context based on user role for privacy
    let roleContext = "";
    switch (userRole) {
      case "ADMIN":
        roleContext = "You are an admin user with full system access.";
        break;
      case "HR":
        roleContext =
          "You are an HR user with access to employee records and HR functions.";
        break;
      case "FINANCE":
        roleContext =
          "You are a finance user with access to payroll and financial records.";
        break;
      case "EMPLOYEE":
        roleContext =
          "You are an employee user with access to your own records and self-service functions.";
        break;
      default:
        roleContext = "You are a user with limited access.";
    }

    // Create the prompt with role context
    const fullPrompt = `${systemPrompt}\n\n${roleContext}\n\nUser message: ${message}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No response from Gemini AI");
    }

    return new Response(
      JSON.stringify({
        response: text,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in Gemini API route:", error);

    // Provide more specific error details to help troubleshoot
    if (error.message?.includes("model is not found")) {
      console.error("Available models may differ. Error details:", error);
      return new Response(
        JSON.stringify({
          error: "Gemini model configuration error. Please check model name.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Failed to process your request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: "Gemini Chat API",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
