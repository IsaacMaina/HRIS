'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
}

export default function NewPayroll() {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [deductions, setDeductions] = useState('');
  const [netPay, setNetPay] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/admin/employees');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        } else {
          console.error('Failed to fetch employees');
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Calculate net pay automatically when grossSalary or deductions change
  useEffect(() => {
    const gross = parseFloat(grossSalary) || 0;
    let totalDeductions = 0;

    if (deductions) {
      try {
        const dedObj = JSON.parse(deductions);
        totalDeductions = Object.values(dedObj).reduce((sum: number, curr: any) => sum + Number(curr), 0);
      } catch (e) {
        console.error('Error parsing deductions:', e);
        // If there's an error parsing, set totalDeductions to 0
        totalDeductions = 0;
      }
    }

    const calculatedNetPay = gross - totalDeductions;
    setNetPay(calculatedNetPay.toString());
  }, [grossSalary, deductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !month || !grossSalary || !netPay) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          month,
          grossSalary: parseFloat(grossSalary),
          deductions: deductions ? JSON.parse(deductions) : {},
          netPay: parseFloat(netPay),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Payroll created:', result);
        toast.success('Payroll entry created successfully!');
        router.push('/admin/payroll');
      } else {
        const errorData = await response.json();
        console.error('Failed to create payroll:', errorData);
        toast.error(`Failed to create payroll: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating payroll:', error);
      toast.error(`Error creating payroll: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Process New Payroll</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700">
              Employee
            </label>
            <select
              id="employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.staffNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700">
              Month
            </label>
            <input
              type="month"
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="grossSalary" className="block text-sm font-medium text-gray-700">
              Gross Salary (KSH)
            </label>
            <input
              type="number"
              id="grossSalary"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="deductions" className="block text-sm font-medium text-gray-700">
              Deductions (JSON format, e.g., {"{"}"nhif": 500, "nssf": 400{"}"})
            </label>
            <textarea
              id="deductions"
              rows={3}
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder='{"nhif": 500, "nssf": 400}'
            />
          </div>

          <div>
            <label htmlFor="netPay" className="block text-sm font-medium text-gray-700">
              Net Pay (KSH)
            </label>
            <input
              type="number"
              id="netPay"
              value={netPay}
              onChange={(e) => setNetPay(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Process Payroll'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}