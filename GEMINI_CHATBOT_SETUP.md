# Gemini AI Chatbot Setup

## Configuration

To use the Gemini AI chatbot, you need to set up your API key:

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Create a `.env.local` file in your project root (if it doesn't exist)
3. Add the following environment variable:

```env
GEMINI_API_KEY=your_api_key_here
```

## HRIS Context Information

The chatbot has been trained with context about the University HRIS system including:

### User Roles and Permissions:
- **Admin/HR**: Full access to employee records, leave approvals, payroll, etc.
- **Finance**: Access to payroll, financial records, and related functions
- **Employee**: Access to own records, leave requests, payslips, etc.

### Available Functions:
- Employee management
- Leave management 
- Payroll processing
- Document management
- Notification system
- Timesheet management
- Payout management

### Privacy Considerations:
- The chatbot respects user role-based access controls
- Sensitive information about other employees is not shared without permission
- Responses are tailored based on the user's role and permissions

## Running the Application

After setting up the API key, run the application normally:

```bash
npm run dev
```

The chatbot will be available as a floating button on all pages.