'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

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

export default function PayoutDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [payout, setPayout] = useState<PayoutTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleUpdateStatus = async (newStatus: 'PENDING' | 'COMPLETED' | 'FAILED') => {
    if (!payout) return;

    setIsUpdatingStatus(true);
    const toastId = toast.loading(`Updating status to ${newStatus}...`);

    try {
      const res = await fetch(`/api/admin/payouts/${payout.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to update payout status to ${newStatus}`);
      }

      // Update local state instantly
      setPayout((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Payout status updated to ${newStatus} successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || `Failed to update payout status.`, { id: toastId });
    } finally {
      setIsUpdatingStatus(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payout Details</h1>
            <Link href="/admin/payouts" className="text-blue-600 hover:text-blue-900">
              Back to Payouts
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Reference</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payout.ref}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Employee</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payout.employeeName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Employee ID</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payout.employeeId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Amount</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">KSH {payout.amount.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{new Date(payout.date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Bank</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{payout.bank}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                payout.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {payout.status}
              </span>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => handleUpdateStatus('PENDING')}
              disabled={isUpdatingStatus || payout.status === 'PENDING'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payout.status === 'PENDING'
                  ? 'bg-yellow-600 cursor-default'
                  : 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payout.status === 'PENDING' ? 'Setting...' : 'Set Pending'}
            </button>
            <button
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={isUpdatingStatus || payout.status === 'COMPLETED'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payout.status === 'COMPLETED'
                  ? 'bg-green-600 cursor-default'
                  : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payout.status === 'COMPLETED' ? 'Setting...' : 'Mark Complete'}
            </button>
            <button
              onClick={() => handleUpdateStatus('FAILED')}
              disabled={isUpdatingStatus || payout.status === 'FAILED'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                payout.status === 'FAILED'
                  ? 'bg-red-600 cursor-default'
                  : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && payout.status === 'FAILED' ? 'Setting...' : 'Mark Failed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}