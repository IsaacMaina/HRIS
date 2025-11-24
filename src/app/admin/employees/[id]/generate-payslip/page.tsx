'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
  bank: string;
  bankAccNo: string;
  nhifRate: number;
  nssfRate: number;
}

interface ValidationErrors {
  month?: string;
  year?: string;
  additionalEarnings?: string;
  additionalDeductions?: string;
  [key: string]: string | undefined;
}

export default function GeneratePayslip() {
  const { id } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payslipData, setPayslipData] = useState({
    month: new Date().getMonth() + 1 + '', // Current month (1-12)
    year: new Date().getFullYear() + '',
    additionalEarnings: '0',
    additionalDeductions: '0',
  });
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/admin/employees/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch employee details');
        }
        const data = await response.json();
        setEmployee(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching employee details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate month
    if (!payslipData.month) {
      newErrors.month = 'Month is required';
    }
    
    // Validate year
    if (!payslipData.year) {
      newErrors.year = 'Year is required';
    } else if (isNaN(parseInt(payslipData.year)) || parseInt(payslipData.year) < 1900 || parseInt(payslipData.year) > 2100) {
      newErrors.year = 'Please enter a valid year';
    }
    
    // Validate additional earnings if provided
    if (payslipData.additionalEarnings && isNaN(parseFloat(payslipData.additionalEarnings))) {
      newErrors.additionalEarnings = 'Please enter a valid amount';
    } else if (parseFloat(payslipData.additionalEarnings) < 0) {
      newErrors.additionalEarnings = 'Amount cannot be negative';
    }
    
    // Validate additional deductions if provided
    if (payslipData.additionalDeductions && isNaN(parseFloat(payslipData.additionalDeductions))) {
      newErrors.additionalDeductions = 'Please enter a valid amount';
    } else if (parseFloat(payslipData.additionalDeductions) < 0) {
      newErrors.additionalDeductions = 'Amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPayslipData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing or selects an option
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/employees/${id}/generate-payslip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payslipData,
          month: parseInt(payslipData.month),
          year: parseInt(payslipData.year),
          additionalEarnings: parseFloat(payslipData.additionalEarnings) || 0,
          additionalDeductions: parseFloat(payslipData.additionalDeductions) || 0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Payslip generated successfully!');
        router.push(`/admin/employees/${id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate payslip');
      }
    } catch (err) {
      setError('An error occurred while generating the payslip');
      console.error('Error generating payslip:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/employees/${id}`);
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
          <p className="text-gray-600 mb-4">Failed to load employee details: {error || 'Employee not found'}</p>
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

  // Calculate expected values based on employee data
  const salary = employee.salary;
  const nhifAmount = salary * employee.nhifRate;
  const nssfAmount = salary * employee.nssfRate;
  const taxRate = 0.3; // Example tax rate (30%)
  const taxAmount = salary * taxRate;
  const additionalEarnings = parseFloat(payslipData.additionalEarnings) || 0;
  const additionalDeductions = parseFloat(payslipData.additionalDeductions) || 0;
  
  const grossSalary = salary + additionalEarnings;
  const totalDeductions = nhifAmount + nssfAmount + taxAmount + additionalDeductions;
  const netPay = grossSalary - totalDeductions;

  // Function to export payslip as PDF using jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Payslip for ${employee.name}`, 14, 20);

    // Employee details
    doc.setFontSize(12);
    doc.text(`Name: ${employee.name}`, 14, 30);
    doc.text(`Staff No: ${employee.staffNo}`, 14, 35);
    doc.text(`Position: ${employee.position}`, 14, 40);
    doc.text(`Department: ${employee.department}`, 14, 45);

    const period = new Date(0, parseInt(payslipData.month) - 1).toLocaleString('default', { month: 'long' }) + ' ' + payslipData.year;
    doc.text(`Period: ${period}`, 14, 50);

    // Add horizontal line
    doc.line(14, 55, 200, 55);

    // Earnings section
    const earningsY = 60;
    doc.setFontSize(14);
    doc.text('Earnings', 14, earningsY);

    const earningsData = [
      ['Base Salary', `KSH ${salary.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
    ];

    if (additionalEarnings > 0) {
      earningsData.push(['Additional Earnings', `KSH ${additionalEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`]);
    }

    earningsData.push([
      'Gross Salary',
      `KSH ${grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: earningsY + 5,
      head: [['Description', 'Amount']],
      body: earningsData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }, // Blue header
      margin: { left: 14 }
    });

    // Deductions section
    const deductionsStartY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Deductions', 14, deductionsStartY);

    const deductionsData = [
      [`NHIF (${(employee.nhifRate * 100).toFixed(2)}%)`, `KSH ${nhifAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      [`NSSF (${(employee.nssfRate * 100).toFixed(2)}%)`, `KSH ${nssfAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      ['Tax (30%)', `KSH ${taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
    ];

    if (additionalDeductions > 0) {
      deductionsData.push(['Additional Deductions', `KSH ${additionalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}`]);
    }

    deductionsData.push([
      'Total Deductions',
      `KSH ${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: deductionsStartY + 5,
      head: [['Description', 'Amount']],
      body: deductionsData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }, // Blue header
      margin: { left: 14 }
    });

    // Net pay section
    const netPayStartY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Net Pay', 14, netPayStartY);

    const netPayData = [
      ['Net Pay', `KSH ${netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}`]
    ];

    autoTable(doc, {
      startY: netPayStartY + 5,
      head: [['Description', 'Amount']],
      body: netPayData,
      theme: 'grid',
      styles: { fontSize: 12, fontStyle: 'bold' },
      headStyles: { fillColor: [76, 175, 80] }, // Green header for net pay
      margin: { left: 14 }
    });

    // Generated date
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, finalY);

    // Save the PDF
    doc.save(`payslip_${employee.staffNo}_${period.replace(/\s+/g, '_')}.pdf`);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Generate Payslip</h1>
            <p className="mt-1 text-sm text-gray-600">For {employee.name}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Employee Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Employee Information</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{employee.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Staff Number</label>
                      <p className="text-sm text-gray-900">{employee.staffNo}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <p className="text-sm text-gray-900">{employee.position}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <p className="text-sm text-gray-900">{employee.department}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Monthly Salary</label>
                      <p className="text-sm font-medium text-gray-900">KSH {salary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payslip Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Payslip Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                      Month
                    </label>
                    <select
                      id="month"
                      name="month"
                      value={payslipData.month}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full border ${
                        errors.month ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    >
                      <option value="">Select a month</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    {errors.month && (
                      <p className="mt-1 text-sm text-red-600">{errors.month}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                      Year
                    </label>
                    <select
                      id="year"
                      name="year"
                      value={payslipData.year}
                      onChange={handleChange}
                      required
                      className={`mt-1 block w-full border ${
                        errors.year ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    >
                      <option value="">Select a year</option>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {errors.year && (
                      <p className="mt-1 text-sm text-red-600">{errors.year}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="additionalEarnings" className="block text-sm font-medium text-gray-700">
                      Additional Earnings (KSH)
                    </label>
                    <input
                      type="number"
                      name="additionalEarnings"
                      id="additionalEarnings"
                      value={payslipData.additionalEarnings}
                      onChange={handleChange}
                      className={`mt-1 block w-full border ${
                        errors.additionalEarnings ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    {errors.additionalEarnings && (
                      <p className="mt-1 text-sm text-red-600">{errors.additionalEarnings}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="additionalDeductions" className="block text-sm font-medium text-gray-700">
                      Additional Deductions (KSH)
                    </label>
                    <input
                      type="number"
                      name="additionalDeductions"
                      id="additionalDeductions"
                      value={payslipData.additionalDeductions}
                      onChange={handleChange}
                      className={`mt-1 block w-full border ${
                        errors.additionalDeductions ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                    {errors.additionalDeductions && (
                      <p className="mt-1 text-sm text-red-600">{errors.additionalDeductions}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payslip Calculation</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Base Salary:</span>
                    <span className="text-sm font-medium">KSH {salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">NHIF ({(employee.nhifRate * 100)}%):</span>
                    <span className="text-sm font-medium">KSH {nhifAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">NSSF ({(employee.nssfRate * 100)}%):</span>
                    <span className="text-sm font-medium">KSH {nssfAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax (30%):</span>
                    <span className="text-sm font-medium">KSH {taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Additional Earnings:</span>
                    <span className="text-sm font-medium">KSH {additionalEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Additional Deductions:</span>
                    <span className="text-sm font-medium">KSH {additionalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-900">Gross Salary:</span>
                    <span className="text-sm text-gray-900">KSH {grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-900">Total Deductions:</span>
                    <span className="text-sm text-gray-900">KSH {totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                    <span className="text-gray-900">Net Pay:</span>
                    <span className="text-gray-900">KSH {netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export buttons */}
            <div className="pt-4">
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Export as PDF
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}