'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bank } from '@prisma/client';

interface BankOption {
  id: string;
  name: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  staffNo?: string;
  position?: string;
  department?: string;
  salary?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '123456', // Default password
    staffNo: '',
    position: '',
    department: '',
    salary: '',
    phone: '',
    bankId: '',
    bankAccNo: '',
    nhifRate: '0',
    nssfRate: '0',
  });

  // Validation errors
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Fetch banks for the dropdown
  const [banks, setBanks] = useState<BankOption[]>([]);

  // Load banks on component mount
  useState(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/banks');
        if (response.ok) {
          const data = await response.json();
          setBanks(data);
        }
      } catch (err) {
        console.error('Error fetching banks:', err);
      }
    };

    fetchBanks();
  });

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name should be at least 3 characters long';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate staff number
    if (!formData.staffNo.trim()) {
      newErrors.staffNo = 'Staff number is required';
    } else if (formData.staffNo.length < 3) {
      newErrors.staffNo = 'Staff number should be at least 3 characters long';
    }

    // Validate position
    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    } else if (formData.position.length < 2) {
      newErrors.position = 'Position should be at least 2 characters long';
    }

    // Validate department
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    } else if (formData.department.length < 2) {
      newErrors.department = 'Department should be at least 2 characters long';
    }

    // Validate salary
    if (!formData.salary.trim()) {
      newErrors.salary = 'Salary is required';
    } else if (isNaN(parseFloat(formData.salary)) || parseFloat(formData.salary) < 0) {
      newErrors.salary = 'Please enter a valid salary amount';
    }

    // Validate phone if provided
    if (formData.phone && formData.phone.trim() && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when user starts typing
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
    setError(null);

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          salary: parseFloat(formData.salary) || 0,
          nhifRate: parseFloat(formData.nhifRate) || 0,
          nssfRate: parseFloat(formData.nssfRate) || 0,
        }),
      });

      if (response.ok) {
        router.push('/admin/employees');
        router.refresh();
      } else {
        const errorData = await response.json();
        if (errorData.error.includes('email already exists')) {
          setErrors(prev => ({ ...prev, email: 'Email already exists' }));
        } else if (errorData.error.includes('staff number already exists')) {
          setErrors(prev => ({ ...prev, staffNo: 'Staff number already exists' }));
        } else {
          setError(errorData.error || 'Failed to create employee');
        }
      }
    } catch (err) {
      setError('An error occurred while creating the employee');
      console.error('Error creating employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/employees');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Employee</h1>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.email ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Default: 123456 (can be changed later)</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.phone ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Employment Information</h2>

                <div>
                  <label htmlFor="staffNo" className="block text-sm font-medium text-gray-700">
                    Staff Number
                  </label>
                  <input
                    type="text"
                    name="staffNo"
                    id="staffNo"
                    value={formData.staffNo}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.staffNo ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter staff number"
                  />
                  {errors.staffNo && (
                    <p className="mt-1 text-sm text-red-600">{errors.staffNo}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    id="position"
                    value={formData.position}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.position ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter position"
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
                    name="department"
                    id="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.department ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter department"
                  />
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                    Salary
                  </label>
                  <input
                    type="number"
                    name="salary"
                    id="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className={`mt-1 block w-full border ${
                      errors.salary ? 'border-red-300 ring-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter salary amount"
                  />
                  {errors.salary && (
                    <p className="mt-1 text-sm text-red-600">{errors.salary}</p>
                  )}
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-medium text-gray-900">Financial Information</h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label htmlFor="bankId" className="block text-sm font-medium text-gray-700">
                      Bank
                    </label>
                    <select
                      name="bankId"
                      id="bankId"
                      value={formData.bankId}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a bank</option>
                      {banks.map(bank => (
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
                      name="bankAccNo"
                      id="bankAccNo"
                      value={formData.bankAccNo}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter account number"
                    />
                  </div>

                  <div>
                    <label htmlFor="nhifRate" className="block text-sm font-medium text-gray-700">
                      NHIF Rate (%)
                    </label>
                    <input
                      type="number"
                      name="nhifRate"
                      id="nhifRate"
                      value={formData.nhifRate}
                      onChange={handleChange}
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter NHIF rate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label htmlFor="nssfRate" className="block text-sm font-medium text-gray-700">
                      NSSF Rate (%)
                    </label>
                    <input
                      type="number"
                      name="nssfRate"
                      id="nssfRate"
                      value={formData.nssfRate}
                      onChange={handleChange}
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter NSSF rate"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}