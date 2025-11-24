import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authconfig";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "University HRIS - Home",
  description: "University Human Resource Information System - Streamline your HR processes with our comprehensive solution",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Define content based on user role
  const getRoleSpecificContent = () => {
    if (!session?.user) {
      // No session - show general content
      return {
        title: "University HR Management System",
        subtitle: "Streamline your HR processes with our comprehensive solution designed for educational institutions.",
        ctaButtons: (
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
            >
              Register
            </Link>
          </div>
        ),
        features: [
          {
            title: "Employee Management",
            description: "Manage all employee data, personal information, and employment records in one place."
          },
          {
            title: "Payroll Processing",
            description: "Automate salary calculations with tax deductions, NHIF, and NSSF contributions."
          },
          {
            title: "Leave Management",
            description: "Handle leave requests efficiently with approval workflows and tracking."
          }
        ]
      };
    }

    // Role-based content
    switch (session.user.role) {
      case 'ADMIN':
        return {
          title: `Welcome, ${session.user.name || 'Admin'}!`,
          subtitle: "Access and manage all aspects of the HR system including employees, payroll, leaves, and reports.",
          ctaButtons: (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/admin/dashboard"
                className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Admin Dashboard
              </Link>
              <Link
                href="/admin/employees"
                className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                Manage Employees
              </Link>
            </div>
          ),
          features: [
            {
              title: "Employee Management",
              description: "View, create, update, and manage all employee records and profiles."
            },
            {
              title: "Payroll Administration",
              description: "Process payroll, generate payslips, and manage compensation."
            },
            {
              title: "System Administration",
              description: "Manage user roles, system settings, and audit logs."
            }
          ]
        };
      case 'HR':
        return {
          title: `Welcome, ${session.user.name || 'HR Personnel'}!`,
          subtitle: "Manage employee records, handle leave requests, and oversee organizational HR functions.",
          ctaButtons: (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/admin/employees"
                className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                View Employees
              </Link>
              <Link
                href="/admin/leaves"
                className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                Leave Requests
              </Link>
            </div>
          ),
          features: [
            {
              title: "Employee Relations",
              description: "Manage employee information, contracts, and personal details."
            },
            {
              title: "Leave Administration",
              description: "Process, approve, and track employee leave requests."
            },
            {
              title: "HR Documentation",
              description: "Handle employee documents and compliance requirements."
            }
          ]
        };
      case 'FINANCE':
        return {
          title: `Welcome, ${session.user.name || 'Finance User'}!`,
          subtitle: "Handle payroll processing, financial reports, and payment transactions.",
          ctaButtons: (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/finance/dashboard"
                className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Finance Dashboard
              </Link>
              <Link
                href="/finance/payments"
                className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                Payment Records
              </Link>
            </div>
          ),
          features: [
            {
              title: "Payroll Processing",
              description: "Calculate salaries, deductions, and generate payslips."
            },
            {
              title: "Payment Transactions",
              description: "Process and track all employee payments and deposits."
            },
            {
              title: "Financial Reports",
              description: "Access financial data and compensation reports."
            }
          ]
        };
      case 'REPORT':
        return {
          title: `Welcome, ${session.user.name || 'Report Viewer'}!`,
          subtitle: "Access analytics, reports, and data insights for organizational decision-making.",
          ctaButtons: (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/analytics/dashboard"
                className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                View Analytics
              </Link>
              <Link
                href="/admin/audit"
                className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                Audit Reports
              </Link>
            </div>
          ),
          features: [
            {
              title: "Data Analytics",
              description: "Generate and view comprehensive HR analytics and insights."
            },
            {
              title: "Performance Reports",
              description: "Access employee performance and organizational metrics."
            },
            {
              title: "Compliance Reports",
              description: "Review reports for regulatory compliance and standards."
            }
          ]
        };
      case 'EMPLOYEE':
      default:
        return {
          title: `Welcome, ${session.user.name || 'Employee'}!`,
          subtitle: "Access your personal information, payslips, leave requests, and HR resources.",
          ctaButtons: (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/employee/dashboard"
                className="px-8 py-3 bg-[#006837] text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                My Dashboard
              </Link>
              <Link
                href="/employee/payslips"
                className="px-8 py-3 bg-[#D4AF37] text-[#080808] border border-[#E5E5E5] rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                My Payslips
              </Link>
            </div>
          ),
          features: [
            {
              title: "Personal Profile",
              description: "Update and manage your personal and contact information."
            },
            {
              title: "Leave Requests",
              description: "Apply for leaves and track the status of your requests."
            },
            {
              title: "Payroll Information",
              description: "Access your payslips and compensation details."
            }
          ]
        };
    }
  };

  const content = getRoleSpecificContent();

  return (
    <div className="relative min-h-screen bg-[#FCF8E3]">
      {/* Foreground Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-[#004B2E] mb-6">
            {content.title}
          </h1>
          <p className="text-xl text-[#080808] mb-10 max-w-2xl mx-auto">
            {content.subtitle}
          </p>

          {content.ctaButtons}
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-[#E5E5E5]">
              <h3 className="text-xl font-semibold text-[#004B2E] mb-3">
                {feature.title}
              </h3>
              <p className="text-[#080808]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}