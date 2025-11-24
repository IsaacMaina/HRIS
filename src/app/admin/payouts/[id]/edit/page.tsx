'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
}

interface PayoutTransaction {
  id: string;
  ref: string;
  date: string;
  amount: number;
  status: string;
  bank: string;
  employeeName: string;
  employeeId: string;
}

export default function EditPayout() {
  const { id } = useParams();
  const router = useRouter();
  const [payout, setPayout] = useState<PayoutTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [bank, setBank] = useState('');
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
    const fetchPayout = async () => {
      if (!id) {
        setError('No payout ID provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const toastId = toast.loading('Loading payout details...');

      try {
        const res = await fetch(`/api/admin/payouts/${id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch payout');
        }
        const data = await res.json();
        setPayout(data);
        
        // Set form values
        setRef(data.ref);
        setAmount(data.amount.toString());
        setStatus(data.status);
        setBank(data.bank);
        
        toast.success('Payout details loaded!', { id: toastId });
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching payout.');
        toast.error(err.message || 'Failed to load payout details.', { id: toastId });
      } finally {
        setLoading(false);
      }
    };

    fetchPayout();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ref || !amount || !status || !bank) {
      toast.error('Please fill in all required fields');
      return;
    }

    const toastId = toast.loading('Updating payout...');

    try {
      const response = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref,
          amount: parseFloat(amount),
          status,
          bank,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Payout updated successfully!', { id: toastId });
        router.push('/admin/payouts');
      } else {
        const errorData = await response.json();
        console.error('Failed to update payout:', errorData);
        toast.error(`Failed to update payout: ${errorData.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error(`Error updating payout: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payout details...</p>
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

  if (!payout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-600">Payout not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Payout Transaction</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="ref" className="block text-sm font-medium text-gray-700">
              Reference
            </label>
            <input
              type="text"
              id="ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (KSH)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              required
            >
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
              Bank
            </label>
            <input
              type="text"
              id="bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}