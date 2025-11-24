'use client';

import { useState, useEffect } from 'react';

interface PaymentTransaction {
  id: string;
  payoutRef: string;
  date: Date;
  amount: number;
  bank: string;
  status: string;
  employees: number;
}

interface FilterControlsProps {
  payments: PaymentTransaction[];
  onFilterChange: (filteredPayments: PaymentTransaction[]) => void;
}

export default function FilterControls({ payments, onFilterChange }: FilterControlsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');
  const [filteredPayments, setFilteredPayments] = useState<PaymentTransaction[]>(payments);

  useEffect(() => {
    let result = payments;

    // Apply search filter
    if (searchTerm) {
      result = result.filter(payment => 
        payment.payoutRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(payment => payment.status === statusFilter);
    }

    // Apply bank filter
    if (bankFilter !== 'All') {
      result = result.filter(payment => payment.bank === bankFilter);
    }

    setFilteredPayments(result);
    onFilterChange(result);
  }, [searchTerm, statusFilter, bankFilter, payments, onFilterChange]);

  const uniqueBanks = Array.from(new Set(payments.map(p => p.bank)));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
      <div className="flex-1">
        <div className="max-w-lg flex rounded-md shadow-sm">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md rounded-r-none border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            type="button"
          >
            Search
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
          <option value="All">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <select 
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
          <option value="All">All Banks</option>
          {uniqueBanks.map(bank => (
            <option key={bank} value={bank}>{bank}</option>
          ))}
        </select>
      </div>
    </div>
  );
}