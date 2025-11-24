'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
}

interface Payslip {
  id: string;
  month: string; // ISO string
  grossSalary: number;
  netPay: number;
  paid: boolean;
  fileUrl: string;
}

export default function EmployeePayslips() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<string | null>(null); // State to manage dropdown visibility for each row

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employee details
        const employeeResponse = await fetch(`/api/admin/employees/${id}`);
        if (!employeeResponse.ok) {
          throw new Error('Failed to fetch employee details');
        }
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);

        // Fetch payslips
        const payslipsResponse = await fetch(`/api/admin/employees/${id}/payslips`);
        if (!payslipsResponse.ok) {
          throw new Error('Failed to fetch payslips');
        }
        const payslipsData = await payslipsResponse.json();
        setPayslips(payslipsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const exportPayslipPdf = (payslip: Payslip) => {
    const doc = new jsPDF();
    const monthName = new Date(payslip.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    doc.setFontSize(18);
    doc.text(`Payslip for ${employee?.name}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Month: ${monthName}`, 14, 30);
    doc.text(`Staff No: ${employee?.staffNo}`, 14, 38);

    const tableColumn = ["Description", "Amount (KSH)"];
    const tableRows = [
      ["Gross Salary", payslip.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })],
      ["Net Pay", payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })],
      ["Status", payslip.paid ? "Paid" : "Pending"]
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
    const monthName = new Date(payslip.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const dataToExport = [
      ["Employee Name", employee?.name],
      ["Staff No", employee?.staffNo],
      ["Month", monthName],
      ["Gross Salary", payslip.grossSalary],
      ["Net Pay", payslip.netPay],
      ["Status", payslip.paid ? "Paid" : "Pending"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payslip');
    XLSX.writeFile(workbook, `payslip_${employee?.staffNo}_${monthName}.xlsx`);
    setIsExportDropdownOpen(null);
  };

  const exportPayslipDoc = (payslip: Payslip) => {
    const monthName = new Date(payslip.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
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

    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
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
          <p className="mt-4 text-gray-600">Loading payslips...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">Failed to load data: {error || 'Employee not found'}</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payslips for {employee.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Staff No: {employee.staffNo} | Position: {employee.position}</p>
            </div>
            <div>
              <Link href={`/admin/employees/${id}`}>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2">
                  Back to Profile
                </button>
              </Link>
              <Link href={`/admin/employees/${id}/generate-payslip`}>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Generate New Payslip
                </button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Salary
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Pay
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payslips.length > 0 ? (
                  payslips.map((payslip) => (
                    <tr key={payslip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(payslip.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {payslip.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payslip.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payslip.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            id={`export-menu-button-${payslip.id}`}
                            aria-expanded="true"
                            aria-haspopup="true"
                            onClick={() => setIsExportDropdownOpen(isExportDropdownOpen === payslip.id ? null : payslip.id)}
                          >
                            Export
                            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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
                                  onClick={() => exportPayslipExcel(payslip)}
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
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No payslips available for this employee
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {payslips.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payslips</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by generating a payslip for this employee.</p>
              <div className="mt-6">
                <Link href={`/admin/employees/${id}/generate-payslip`}>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Generate Payslip
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}