'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner'; // Add this import

interface Bank {
  id: string;
  name: string;
}

interface ProfileFormData {
  name: string;
  phone: string;
  position: string;
  department: string;
  bankId: string;
  bankAccNo: string;
}

interface ValidationErrors {
  name?: string;
  phone?: string;
  position?: string;
  department?: string;
  bankAccNo?: string;
  [key: string]: string | undefined;
}

export default function EmployeeProfile() {
  const { data: session, status, update } = useSession();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    phone: '',
    position: '',
    department: '',
    bankId: '',
    bankAccNo: '',
  });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [initialFormData, setInitialFormData] = useState<ProfileFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/employee/profile')
        .then((res) => res.json())
        .then((data) => {
          const initialData = {
            name: session?.user?.name || '',
            phone: data.phone || '',
            position: data.position || '',
            department: data.department || '',
            bankId: data.bankId || '',
            bankAccNo: data.bankAccNo || '',
          };
          setFormData(initialData);
          setInitialFormData(initialData);
        });

      fetch('/api/banks')
        .then((res) => res.json())
        .then((data) => setBanks(data));
    }
  }, [status, session]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name should be at least 3 characters long';
    }

    // Validate phone if provided
    if (formData.phone.trim() && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate position
    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    } else if (formData.position.trim().length < 2) {
      newErrors.position = 'Position should be at least 2 characters long';
    }

    // Validate department
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    } else if (formData.department.trim().length < 2) {
      newErrors.department = 'Department should be at least 2 characters long';
    }

    // Validate bank account number if provided
    if (formData.bankAccNo.trim() && formData.bankAccNo.length < 4) {
      newErrors.bankAccNo = 'Bank account number should be at least 4 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    
    // Clear error when user starts typing
    if (errors[id as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Updating profile...'); // Use toast.loading

    try {
      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        toast.error('Failed to update profile.', { id: toastId }); // Use toast.error
        throw new Error('Failed to update profile');
      }

      const updatedData = await res.json();

      // Update the session to trigger a JWT refresh from the database
      // Passing an empty object will trigger a refresh from the server
      await update({});

      const newInitialData = {
        name: updatedData.name || formData.name, // Use the updated name from the API response
        phone: updatedData.phone || '',
        position: updatedData.position || '',
        department: updatedData.department || '',
        bankId: updatedData.bankId || '',
        bankAccNo: updatedData.bankAccNo || '',
      };
      setInitialFormData(newInitialData);
      setFormData(newInitialData);

      toast.success('Profile updated successfully!', { id: toastId }); // Use toast success
      // REMOVE: window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile. Please try again.', { id: toastId }); // Use toast.error
    } finally {
      setLoading(false);
    }
  };

  const isFormChanged = () => {
    if (!initialFormData) return false;
    
    return Object.entries(initialFormData).some(
      ([key, value]) => formData[key as keyof ProfileFormData] !== value
    );
  };

  const handleReset = () => {
    if (initialFormData) {
      setFormData(initialFormData);
      setErrors({}); // Clear any validation errors when resetting
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.phone ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={formData.position}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.position ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your position"
                  />
                  {errors.position && (
                    <p className="mt-1 text-sm text-red-600">{errors.position}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.department ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your department"
                  />
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-medium text-gray-900">Financial Information</h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="bankId" className="block text-sm font-medium text-gray-700">
                      Bank
                    </label>
                    <select
                      id="bankId"
                      value={formData.bankId}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a bank</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bankAccNo" className="block text-sm font-medium text-gray-700">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      id="bankAccNo"
                      value={formData.bankAccNo}
                      onChange={handleChange}
                      className={`mt-1 block w-full border ${
                        errors.bankAccNo ? 'border-red-300 ring-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Enter your bank account number"
                    />
                    {errors.bankAccNo && (
                      <p className="mt-1 text-sm text-red-600">{errors.bankAccNo}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={!isFormChanged() || loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!isFormChanged() || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}