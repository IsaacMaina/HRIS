'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataTable from '@/components/admin/common/DataTable';
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

export default function AdminPayouts() {
  const [payoutTransactions, setPayoutTransactions] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage, setTransactionsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/admin/payouts');
        if (response.ok) {
          const data = await response.json();
          setPayoutTransactions(data);
        } else {
          console.error('Failed to fetch payout transactions');
        }
      } catch (error) {
        console.error('Error fetching payouts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Apply filters
  const filteredTransactions = payoutTransactions.filter(transaction => {
    const matchesSearch = 
      transaction.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.bank.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || transaction.status === statusFilter;
    const matchesBank = bankFilter === 'All' || transaction.bank === bankFilter;
    
    return matchesSearch && matchesStatus && matchesBank;
  });

  // Get unique banks for filter
  const banks = Array.from(new Set(payoutTransactions.map(tx => tx.bank)));

  // Pagination
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewTransaction = (id: string) => {
    window.location.href = `/admin/payouts/${id}`;
  };

  const handleDeletePayout = async (id: string) => {
    if (confirm('Are you sure you want to delete this payout transaction?')) {
      try {
        const response = await fetch(`/api/admin/payouts/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setPayoutTransactions(prevTransactions => prevTransactions.filter(tx => tx.id !== id));
          toast.success(result.message || 'Payout transaction deleted successfully!');
        } else {
          const errorData = await response.json();
          toast.error(`Failed to delete payout transaction: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        toast.error(`Error deleting payout transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payout transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payouts & Payments</h1>
            <Link href="/admin/payouts/new">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Initiate Bulk Payout
              </button>
            </Link>
          </div>

          <DataTable
            columns={[
              { key: 'ref', label: 'Reference' },
              {
                key: 'employeeName',
                label: 'Employee',
                render: (value, row) => (
                  <div>
                    <div className="text-sm font-medium text-gray-900">{row.employeeName}</div>
                    <div className="text-sm text-gray-500">{row.employeeId}</div>
                  </div>
                ),
              },
              {
                key: 'date',
                label: 'Date',
                render: (value) => new Date(value).toLocaleDateString(),
              },
              {
                key: 'amount',
                label: 'Amount',
                render: (value) => `KSH ${Number(value).toLocaleString()}`,
              },
              { key: 'bank', label: 'Bank' },
              {
                key: 'status',
                label: 'Status',
                render: (value) => (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    value === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    value === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    value === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {value}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => (
                  <div key={`actions-${row.id}`} className="flex space-x-3">
                    <Link href={`/admin/payouts/${row.id}`}>
                      <button
                        onClick={(e) => e.stopPropagation()} // Prevent row click from firing
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </Link>
                    <Link href={`/admin/payouts/${row.id}/edit`}>
                      <button
                        onClick={(e) => e.stopPropagation()} // Prevent row click from firing
                        className="text-green-600 hover:text-green-900"
                      >
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePayout(row.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                )
              },
            ]}
            data={filteredTransactions}
            onRowClick={(transaction) => handleViewTransaction(transaction.id)}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            rowIdKey="id"
            searchPlaceholder="Search transactions..."
            onSearchChange={setSearchTerm}
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'All', label: 'All Statuses' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'FAILED', label: 'Failed' },
                ],
                value: statusFilter,
                onChange: setStatusFilter,
              },
              {
                key: 'bank',
                label: 'Bank',
                options: [
                  { value: 'All', label: 'All Banks' },
                  ...banks.map(bank => ({ value: bank, label: bank })),
                ],
                value: bankFilter,
                onChange: setBankFilter,
              }
            ]}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: handlePageChange,
            }}
            itemsPerPage={{
              value: transactionsPerPage,
              onChange: setTransactionsPerPage,
            }}
            onDelete={handleDeletePayout}
            totalFilteredCount={filteredTransactions.length}
            emptyMessage="No payout transactions found"
          />
        </div>
      </div>
    </div>
  );
}