'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface PayrollEntry {
  id: string;
  employeeName: string;
  staffNo: string;
  grossSalary: number;
  deductions: any;
  netPay: number;
  month: string;
  status: string;
}

export default function AdminPayrollDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [payrollEntry, setPayrollEntry] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleUpdateStatus = async (newStatus: 'paid' | 'pending' | 'failed') => {
    if (!payrollEntry) return;

    setIsUpdatingStatus(true);
    const toastId = toast.loading(`Updating status to ${newStatus}...`);

    try {
      const res = await fetch(`/api/admin/payroll/${payrollEntry.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to update payroll status to ${newStatus}`);
      }

      // Update local state instantly
      setPayrollEntry((prev) => prev ? { ...prev, status: newStatus.toUpperCase() } : null);
      toast.success(`Payroll status updated to ${newStatus} successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || `Failed to update payroll status.`, { id: toastId });
    } finally {
      setIsUpdatingStatus(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payroll Details</h1>
            <Link href="/admin/payroll" className="text-blue-600 hover:text-blue-900">
              Back to Payroll
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Employee Name</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payrollEntry.employeeName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Staff Number</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payrollEntry.staffNo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Gross Salary</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">KSH {payrollEntry.grossSalary.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Deductions</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                KSH {typeof payrollEntry.deductions === 'object' && payrollEntry.deductions 
                  ? Object.values(payrollEntry.deductions).reduce((sum: number, curr: any) => sum + Number(curr), 0).toLocaleString() 
                  : 0}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Net Pay</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">KSH {payrollEntry.netPay.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Month</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{new Date(payrollEntry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                payrollEntry.status === 'PAID' ? 'bg-green-100 text-green-800' :
                payrollEntry.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {payrollEntry.status}
              </span>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => handleUpdateStatus('pending')}
              disabled={isUpdatingStatus || payrollEntry.status === 'PENDING'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payrollEntry.status === 'PENDING'
                  ? 'bg-yellow-600 cursor-default'
                  : 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payrollEntry.status === 'PENDING' ? 'Setting...' : 'Set Pending'}
            </button>
            <button
              onClick={() => handleUpdateStatus('paid')}
              disabled={isUpdatingStatus || payrollEntry.status === 'PAID'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payrollEntry.status === 'PAID'
                  ? 'bg-green-600 cursor-default'
                  : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payrollEntry.status === 'PAID' ? 'Setting...' : 'Mark as Paid'}
            </button>
            <button
              onClick={() => handleUpdateStatus('failed')}
              disabled={isUpdatingStatus || payrollEntry.status === 'FAILED'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payrollEntry.status === 'FAILED'
                  ? 'bg-red-600 cursor-default'
                  : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payrollEntry.status === 'FAILED' ? 'Setting...' : 'Mark as Failed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}