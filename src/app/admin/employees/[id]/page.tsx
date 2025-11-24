"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  hireDate: string;
  salary: number;
  bank: string;
  bankAccNo: string;
  nhifRate: number;
  nssfRate: number;
}

interface Payslip {
  id: string;
  month: string;
  grossSalary: number;
  netPay: number;
  paid: boolean;
  fileUrl: string;
}

// Helper function to get initials
const getInitials = (name: string): string => {
  if (!name) return "";
  const nameParts = name.split(" ").filter((part) => part.length > 0);
  if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase();
  }
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  return "";
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  // Handle cases where id might be an array (Next.js behavior)
  const employeeId = Array.isArray(id) ? id[0] : id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<
    string | null
  >(null); // State to manage dropdown visibility for each row

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      try {
        // Fetch employee details
        const response = await fetch(`/api/admin/employees/${employeeId}`, {
          headers: {
            "Content-Type": "application/json",
            // Include cookie header if available
          },
          credentials: "include", // This ensures cookies are sent with the request
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Unauthorized: Please log in to view employee details",
            );
          } else if (response.status === 404) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Employee not found");
          } else {
            throw new Error("Failed to fetch employee details");
          }
        }
        const data = await response.json();
        setEmployee(data);

        // Also fetch related payslips
        try {
          const payslipsResponse = await fetch(
            `/api/admin/employees/${employeeId}/payslips`,
            {
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            },
          );
          if (payslipsResponse.ok) {
            const payslipData = await payslipsResponse.json();
            setPayslips(payslipData);
          }
        } catch (payslipsErr) {
          console.error("Error fetching payslips:", payslipsErr);
          // Don't throw error for payslips since it's not critical to the employee details page
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching employee details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployeeDetails();
    }
  }, [employeeId]);

  const exportPayslipPdf = (payslip: Payslip) => {
    const doc = new jsPDF();
    const monthName = new Date(payslip.month).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    doc.setFontSize(18);
    doc.text(`Payslip for ${employee?.name}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Month: ${monthName}`, 14, 30);
    doc.text(`Staff No: ${employee?.staffNo}`, 14, 38);

    const tableColumn = ["Description", "Amount (KSH)"];
    const tableRows = [
      [
        "Gross Salary",
        payslip.grossSalary.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }),
      ],
      [
        "Net Pay",
        payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      ],
      ["Status", payslip.paid ? "Paid" : "Pending"],
    ];

    autoTable(doc, {
      startY: 45,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save(`payslip_${employee?.staffNo}_${monthName}.pdf`);
    setIsExportDropdownOpen(null);
  };

  const exportPayslipExcel = (payslip: Payslip) => {
    const monthName = new Date(payslip.month).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    const dataToExport = [
      ["Employee Name", employee?.name],
      ["Staff No", employee?.staffNo],
      ["Month", monthName],
      ["Gross Salary", payslip.grossSalary],
      ["Net Pay", payslip.netPay],
      ["Status", payslip.paid ? "Paid" : "Pending"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payslip");
    XLSX.writeFile(workbook, `payslip_${employee?.staffNo}_${monthName}.xlsx`);
    setIsExportDropdownOpen(null);
  };

  const exportPayslipDoc = (payslip: Payslip) => {
    const monthName = new Date(payslip.month).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Payslip</title></head><body>";
    const footer = "</body></html>";
    let html = header;
    html += `<h1>Payslip for ${employee?.name}</h1>`;
    html += `<p><strong>Month:</strong> ${monthName}</p>`;
    html += `<p><strong>Staff No:</strong> ${employee?.staffNo}</p>`;
    html += `<table>`;
    html += `<thead><tr><th>Description</th><th>Amount (KSH)</th></tr></thead>`;
    html += `<tbody>`;
    html += `<tr><td>Gross Salary</td><td>${payslip.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>`;
    html += `<tr><td>Net Pay</td><td>${payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>`;
    html += `<tr><td>Status</td><td>${payslip.paid ? "Paid" : "Pending"}</td></tr>`;
    html += `</tbody></table>`;
    html += footer;

    const url =
      "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(html);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = `payslip_${employee?.staffNo}_${monthName}.doc`;
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setIsExportDropdownOpen(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">
            Failed to load employee details: {error || "Employee not found"}
          </p>
          <Link
            href="/admin/employees"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Employee Details
            </h1>
            <div className="flex space-x-3">
              <Link href={`/admin/employees/${employee?.id}/edit`}>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Edit
                </button>
              </Link>
              <Link href={`/admin/employees/${employee?.id}/generate-payslip`}>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Generate Payslip
                </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1">
              <div className="relative w-32 h-32 mx-auto rounded-full flex items-center justify-center bg-blue-500 text-white text-4xl font-bold">
                {employee && getInitials(employee.name)}
              </div>
              <h2 className="text-xl font-semibold text-center mt-4">
                {employee.name}
              </h2>
              <p className="text-gray-600 text-center">{employee.position}</p>
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Staff Number
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {employee.staffNo}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Department
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {employee.department}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-sm text-gray-900">{employee.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1 text-sm text-gray-900">{employee.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Hire Date
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(employee.hireDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Monthly Salary
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    KSH {employee.salary.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Bank</h3>
                  <p className="mt-1 text-sm text-gray-900">{employee.bank}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Bank Account
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {employee.bankAccNo}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Deductions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">NHIF</h3>
                <p className="mt-1 text-sm text-gray-900">
                  KSH {employee.nhifRate.toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">NSSF</h3>
                <p className="mt-1 text-sm text-gray-900">
                  KSH {employee.nssfRate.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Payslips
              </h2>
              <Link
                href={`/admin/employees/${employee?.id}/payslips`}
                className="text-sm text-blue-600 hover:text-blue-900"
              >
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Month
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Gross Salary
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Net Pay
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payslips.length > 0 ? (
                    payslips.map((payslip) => (
                      <tr key={payslip.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(payslip.month).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {payslip.grossSalary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {payslip.netPay.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payslip.paid
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {payslip.paid ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payslip.fileUrl ? (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                id={`export-menu-button-${payslip.id}`}
                                aria-expanded="true"
                                aria-haspopup="true"
                                onClick={() =>
                                  setIsExportDropdownOpen(
                                    isExportDropdownOpen === payslip.id
                                      ? null
                                      : payslip.id,
                                  )
                                }
                              >
                                Export
                                <svg
                                  className="-mr-1 ml-2 h-5 w-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>

                              {isExportDropdownOpen === payslip.id && (
                                <div
                                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                                  role="menu"
                                  aria-orientation="vertical"
                                  aria-labelledby={`export-menu-button-${payslip.id}`}
                                  tabIndex={-1}
                                >
                                  <div className="py-1" role="none">
                                    <button
                                      onClick={() => exportPayslipPdf(payslip)}
                                      className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      Export as PDF
                                    </button>
                                    <button
                                      onClick={() =>
                                        exportPayslipExcel(payslip)
                                      }
                                      className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      Export as Excel
                                    </button>
                                    <button
                                      onClick={() => exportPayslipDoc(payslip)}
                                      className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      Export as DOC
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not available</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No payslips available for this employee
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
