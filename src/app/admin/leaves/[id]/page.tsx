'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner'; // Add this import

interface LeaveRequest {
  id: string;
  employeeName: string;
  staffNo: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  appliedAt: string;
  reason: string;
}

export default function AdminLeaveDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // New state for status update loading

  useEffect(() => {
    const fetchLeaveRequest = async () => {
      if (!id) {
        setError('No leave request ID provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const toastId = toast.loading('Loading leave request details...');

      try {
        const res = await fetch(`/api/admin/leaves/${id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch leave request');
        }
        const data = await res.json();
        setLeaveRequest(data);
        toast.success('Leave request details loaded!', { id: toastId });
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching leave request.');
        toast.error(err.message || 'Failed to load leave request details.', { id: toastId });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequest();
  }, [id]);

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    if (!leaveRequest) return;

    setIsUpdatingStatus(true);
    const toastId = toast.loading(`Updating status to ${newStatus}...`);

    try {
      const res = await fetch(`/api/admin/leaves/${leaveRequest.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${newStatus} leave request`);
      }

      // Update local state instantly
      setLeaveRequest((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Leave request ${newStatus} successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || `Failed to ${newStatus} leave request.`, { id: toastId });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave request details...</p>
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

  if (!leaveRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-600">Leave request not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Leave Request Details</h1>
            <Link href="/admin/leaves" className="text-blue-600 hover:text-blue-900">
              Back to Leaves
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Employee Name</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{leaveRequest.employeeName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Staff Number</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{leaveRequest.staffNo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Leave Type</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{leaveRequest.type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{new Date(leaveRequest.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">End Date</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{new Date(leaveRequest.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                leaveRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                leaveRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
              </span>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Reason</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{leaveRequest.reason}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Applied At</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{new Date(leaveRequest.appliedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => handleUpdateStatus('pending')}
              disabled={isUpdatingStatus || leaveRequest.status === 'pending'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                leaveRequest.status === 'pending'
                  ? 'bg-yellow-600 cursor-default'
                  : 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && leaveRequest.status === 'pending' ? 'Setting...' : 'Set Pending'}
            </button>
            <button
              onClick={() => handleUpdateStatus('approved')}
              disabled={isUpdatingStatus || leaveRequest.status === 'approved'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                leaveRequest.status === 'approved'
                  ? 'bg-green-600 cursor-default'
                  : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && leaveRequest.status === 'approved' ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => handleUpdateStatus('rejected')}
              disabled={isUpdatingStatus || leaveRequest.status === 'rejected'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                leaveRequest.status === 'rejected'
                  ? 'bg-red-600 cursor-default'
                  : 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
              } ${isUpdatingStatus ? 'opacity-50' : ''}`}
            >
              {isUpdatingStatus && leaveRequest.status === 'rejected' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
