'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner'; // Add this import

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  appliedAt: string;
}

interface FormData {
  type: string;
  startDate: string;
  endDate: string;
}

interface ValidationErrors {
  type?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: string | undefined;
}

export default function EmployeeLeaves() {
  const { data: session, status } = useSession();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveAllocation, setLeaveAllocation] = useState<any>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  // Remove: const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: 'appliedAt', // Sort by applied date by default
    direction: 'desc', // Newest first
  });

  useEffect(() => {
    if (status === 'authenticated') {
      const toastId = toast.loading('Loading leave requests...'); // Add loading toast
      fetch('/api/employee/leaves')
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.leaves)) {
            setLeaves(data.leaves);
            setLeaveAllocation(data.leaveAllocation);
            setCurrentYear(data.currentYear);
            toast.success('Leave requests loaded!', { id: toastId }); // Success toast
          } else {
            toast.error('Failed to load leave requests: Invalid data format.', { id: toastId });
          }
        })
        .catch((error) => {
          toast.error('Failed to load leave requests.', { id: toastId }); // Error toast
          console.error("Failed to fetch leave requests:", error);
        });
    }
  }, [status]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate type
    if (!formData.type) {
      newErrors.type = 'Leave type is required';
    }

    // Validate start date
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const start = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part for comparison
      
      if (start < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }

    // Validate end date
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filteredLeaves = useMemo(() => {
    let result = leaves.filter((leave) => {
      const matchesType = filterType === 'All' || leave.type === filterType;
      const matchesStatus = filterStatus === 'All' || leave.status === filterStatus;
      return matchesType && matchesStatus;
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Leave];
        let bValue = b[sortConfig.key as keyof Leave];

        if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate' || sortConfig.key === 'appliedAt') {
          // Handle date comparison
          aValue = new Date(aValue as string).getTime();
          bValue = new Date(bValue as string).getTime();

          const comparison = (aValue as number) - (bValue as number);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Handle string comparison
          const comparison = aValue.localeCompare(bValue as string);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else {
          // Handle other types
          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }
      });
    }

    return result;
  }, [leaves, filterType, filterStatus, sortConfig]);

  // Calculate number of leave days between start and end date (inclusive)
  const calculateLeaveDays = (startDate: string, endDate: string): number | null => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return null; // Invalid date range

    // Calculate the time difference in milliseconds
    const timeDiff = end.getTime() - start.getTime();
    // Convert to days and add 1 to include both start and end dates
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    return daysDiff;
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing or selecting
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Submitting leave request...'); // Add loading toast

    try {
      const res = await fetch('/api/employee/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to submit leave request.', { id: toastId }); // Error toast
        throw new Error(errorData.message || 'Failed to submit leave request');
      }

      const newLeave = await res.json();
      setLeaves([newLeave, ...leaves]);
      setShowForm(false);
      setFormData({ type: 'ANNUAL', startDate: '', endDate: '' });
      setErrors({}); // Clear any validation errors after successful submission
      toast.success('Leave request submitted successfully!', { id: toastId }); // Success toast
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave request. Please try again.', { id: toastId }); // Error toast
    } finally {
      setLoading(false);
    }
  };

  const handleSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  const leaveTypes = [
    { value: 'ANNUAL', label: 'Annual Leave' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'EMERGENCY', label: 'Emergency Leave' },
    { value: 'COMPASSIONATE', label: 'Compassionate Leave' },
    { value: 'STUDY', label: 'Study Leave' },
    { value: 'UNPAID', label: 'Unpaid Leave' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Leave Requests</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showForm ? 'Cancel' : 'Apply for Leave'}
            </button>
          </div>

          {/* Leave Allocation Summary */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-blue-900 mb-4">Leave Allocation for {currentYear || new Date().getFullYear()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Total Annual Leave</p>
                <p className="text-2xl font-bold text-blue-600">{leaveAllocation?.totalDays || 30} days</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Used Days</p>
                <p className="text-2xl font-bold text-yellow-600">{leaveAllocation?.usedDays || 0} days</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Remaining Days</p>
                <p className="text-2xl font-bold text-green-600">{leaveAllocation?.remainingDays || 30} days</p>
              </div>
            </div>
          </div>

          {showForm && (
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-blue-900 mb-4">Apply for Leave</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Leave Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleFormChange}
                      className={`mt-1 block w-full border ${
                        errors.type ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.type ? 'ring-red-500' : ''
                      }`}
                    >
                      {leaveTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.type && (
                      <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      className={`mt-1 block w-full border ${
                        errors.startDate ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.startDate ? 'ring-red-500' : ''
                      }`}
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleFormChange}
                      className={`mt-1 block w-full border ${
                        errors.endDate ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.endDate ? 'ring-red-500' : ''
                      }`}
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Display calculated leave days */}
                {formData.startDate && formData.endDate && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Leave Duration:</span> {calculateLeaveDays(formData.startDate, formData.endDate)} days
                      {formData.type === 'ANNUAL' && leaveAllocation && (
                        <>
                          <br />
                          <span className="font-medium">Remaining Leave Balance:</span> {Math.max(0, (leaveAllocation.remainingDays || 30) - (calculateLeaveDays(formData.startDate, formData.endDate) || 0))} days
                          {calculateLeaveDays(formData.startDate, formData.endDate)! > (leaveAllocation.remainingDays || 30) && (
                            <span className="text-red-600 block mt-1">⚠️ Warning: You don't have enough leave days available!</span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex items-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter Controls */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div>
              <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Type
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="All">All Types</option>
                <option value="ANNUAL">Annual</option>
                <option value="SICK">Sick</option>
                <option value="MATERNITY">Maternity</option>
                <option value="PATERNITY">Paternity</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="COMPASSIONATE">Compassionate</option>
                <option value="STUDY">Study</option>
                <option value="UNPAID">Unpaid</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('type')}
                    >
                      Type
                      {sortConfig.key === 'type' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('appliedAt')} // Sort by appliedAt for the dates column
                    >
                      Dates
                      {sortConfig.key === 'appliedAt' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('appliedAt')}
                    >
                      Applied At
                      {sortConfig.key === 'appliedAt' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {sortConfig.key === 'status' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaves.length > 0 ? (
                  filteredLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {leave.type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            leave.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : leave.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredLeaves.length === 0 && !showForm && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2v3m-2-3a2 2 0 002 2v3m-2-3v3" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by applying for a new leave.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply for Leave
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}