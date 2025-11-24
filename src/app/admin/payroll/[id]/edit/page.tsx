'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
}

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  staffNo: string;
  grossSalary: number;
  deductions: any;
  netPay: number;
  month: string;
  status: string;
  paid: boolean;
}

export default function EditPayroll() {
  const { id } = useParams();
  const router = useRouter();
  const [payrollEntry, setPayrollEntry] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [deductions, setDeductions] = useState('');
  const [netPay, setNetPay] = useState('');
  const [paid, setPaid] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  useEffect(() => {
    const fetchPayrollEntry = async () => {
      if (!id) {
        setError('No payroll entry ID provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const toastId = toast.loading('Loading payroll details...');

      try {
        const res = await fetch(`/api/admin/payroll/${id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch payroll entry');
        }
        const data = await res.json();
        setPayrollEntry(data);
        
        // Set form values
        setEmployeeId(data.employeeId);
        setMonth(data.month.substring(0, 7)); // Format as YYYY-MM
        setGrossSalary(data.grossSalary.toString());
        setDeductions(JSON.stringify(data.deductions));
        setNetPay(data.netPay.toString());
        setPaid(data.paid);
        
        toast.success('Payroll details loaded!', { id: toastId });
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching payroll entry.');
        toast.error(err.message || 'Failed to load payroll details.', { id: toastId });
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollEntry();
  }, [id]);

  const calculateNetPay = () => {
    const gross = parseFloat(grossSalary) || 0;
    let totalDeductions = 0;
    
    if (deductions) {
      try {
        const dedObj = JSON.parse(deductions);
        totalDeductions = Object.values(dedObj).reduce((sum: number, curr: any) => sum + Number(curr), 0);
      } catch (e) {
        console.error('Error parsing deductions:', e);
      }
    }
    
    const calculatedNetPay = gross - totalDeductions;
    setNetPay(calculatedNetPay.toFixed(2));
  };

  useEffect(() => {
    if (grossSalary && deductions) {
      calculateNetPay();
    }
  }, [grossSalary, deductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !month || !grossSalary || !netPay) {
      toast.error('Please fill in all required fields');
      return;
    }

    const toastId = toast.loading('Updating payroll...');

    try {
      const response = await fetch(`/api/admin/payroll/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          month,
          grossSalary: parseFloat(grossSalary),
          deductions: deductions ? JSON.parse(deductions) : {},
          netPay: parseFloat(netPay),
          paid,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Payroll entry updated successfully!', { id: toastId });
        router.push('/admin/payroll');
      } else {
        const errorData = await response.json();
        console.error('Failed to update payroll:', errorData);
        toast.error(`Failed to update payroll: ${errorData.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`Error updating payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payroll details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!payrollEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-600">Payroll entry not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Payroll Entry</h1>
        
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
              required
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
              Net Pay (KSH) - Calculated automatically
            </label>
            <input
              type="number"
              id="netPay"
              value={netPay}
              readOnly
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="paid"
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="paid" className="font-medium text-gray-700">
                Mark as Paid
              </label>
            </div>
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Payroll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}