'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Payout {
  id: string;
  ref: string;
  employeeId: string;
  employee: {
    user: {
      name: string;
    };
    staffNo: string;
  };
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'PENDING';
  type: string;
  bank: string;
  createdAt: string;
  transactionId?: string;
}

export default function PaymentHistory() {
  const { data: session } = useSession();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedPayouts, setPaginatedPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);

  // Fetch payouts
  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/payouts/list?month=${selectedMonth}`);
        if (response.ok) {
          const data = await response.json();
          setPayouts(data);
        } else {
          toast.error('Failed to fetch payment history');
        }
      } catch (error) {
        console.error('Error fetching payouts:', error);
        toast.error('Error fetching payment history');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchPayouts();
    }
  }, [session, selectedMonth]);

  // Apply search filter when payouts or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPayouts(payouts);
    } else {
      const filtered = payouts.filter(payout => {
        const query = searchQuery.toLowerCase();
        return (
          payout.employee.user.name.toLowerCase().includes(query) ||
          payout.employee.staffNo.toLowerCase().includes(query) ||
          payout.ref.toLowerCase().includes(query) ||
          payout.bank.toLowerCase().includes(query) ||
          payout.status.toLowerCase().includes(query) ||
          formatCurrency(payout.amount).toLowerCase().includes(query)
        );
      });
      setFilteredPayouts(filtered);
    }

    // Reset to first page when search changes
    setCurrentPage(1);
  }, [payouts, searchQuery]);

  // Update pagination whenever filtered payouts, current page, or rows per page change
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentPayouts = filteredPayouts.slice(startIndex, endIndex);
    setPaginatedPayouts(currentPayouts);
    setTotalPages(Math.ceil(filteredPayouts.length / rowsPerPage));
  }, [filteredPayouts, currentPage, rowsPerPage]);

  // Pagination functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const changeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'destructive';
      case 'PROCESSING':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Payment History</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-md p-2 w-full sm:w-auto"
          />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded-md p-2 w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading payment history...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              All payroll payments processed in {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Responsive table container */}
            <div className="overflow-x-auto">
              {/* Desktop: Table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayouts.length > 0 ? (
                      paginatedPayouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            <div className="font-medium">{payout.employee.user.name}</div>
                            <div className="text-sm text-muted-foreground">{payout.employee.staffNo}</div>
                          </TableCell>
                          <TableCell className="font-mono">{payout.ref}</TableCell>
                          <TableCell>{formatCurrency(payout.amount)}</TableCell>
                          <TableCell>{payout.bank}</TableCell>
                          <TableCell>
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${payout.status === 'SUCCESS'
                                ? 'bg-green-100 text-green-800'
                                : payout.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'}
                            `}>
                              {payout.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          No payment records found for the selected month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Card view */}
              <div className="md:hidden space-y-4">
                {paginatedPayouts.length > 0 ? (
                  paginatedPayouts.map((payout) => (
                    <div key={payout.id} className="border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{payout.employee.user.name}</h3>
                          <p className="text-sm text-muted-foreground">{payout.employee.staffNo}</p>
                        </div>
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${payout.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800'
                            : payout.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'}
                        `}>
                          {payout.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reference:</span>
                          <span className="font-mono">{payout.ref}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span>{formatCurrency(payout.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method:</span>
                          <span>{payout.bank}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{new Date(payout.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment records found for the selected month
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {(payouts.length > 0 || searchQuery) && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="payoutsRowsPerPage" className="text-sm text-gray-700">Rows per page:</label>
                  <select
                    id="payoutsRowsPerPage"
                    value={rowsPerPage}
                    onChange={changeRowsPerPage}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * rowsPerPage, filteredPayouts.length)}
                  </span> of{' '}
                  <span className="font-medium">{filteredPayouts.length}</span> results
                </div>

                <div className="flex space-x-2">
                  <button
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                      currentPage === 1 || filteredPayouts.length === 0
                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                    disabled={currentPage === 1 || filteredPayouts.length === 0}
                    onClick={goToPrevPage}
                  >
                    Previous
                  </button>
                  <button
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                      currentPage === totalPages || filteredPayouts.length === 0
                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                    disabled={currentPage === totalPages || filteredPayouts.length === 0}
                    onClick={goToNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}