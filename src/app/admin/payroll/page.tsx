'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PaymentHistory from './PaymentHistory';

interface PayrollReport {
  id: string;
  month: Date;
  totalEmployees: number;
  grossPayroll: number;
  deductions: number;
  netPayroll: number;
  status: string;
}

export default function PayrollPage() {
  const { data: session } = useSession();
  const [payrollReports, setPayrollReports] = useState<PayrollReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<PayrollReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedReports, setPaginatedReports] = useState<PayrollReport[]>([]);

  // Fetch payroll reports for admin overview
  useEffect(() => {
    const fetchPayrollReports = async () => {
      try {
        const response = await fetch('/api/admin/payroll/reports');
        if (response.ok) {
          const data = await response.json();
          setPayrollReports(data);
        } else {
          toast.error('Failed to fetch payroll reports');
        }
      } catch (error) {
        console.error('Error fetching payroll reports:', error);
        toast.error('Error fetching payroll reports');
      }
    };

    if (session) {
      fetchPayrollReports();
    }
  }, [session]);

  // Apply search filter and pagination when reports or search query changes
  useEffect(() => {
    const filtered = payrollReports.filter(report => {
      const matchesSearch = report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(report.month).toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    setFilteredReports(filtered);

    // Reset to first page when search changes
    setCurrentPage(1);
  }, [payrollReports, searchQuery]);

  // Update pagination whenever filtered reports, current page, or rows per page change
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentReports = filteredReports.slice(startIndex, endIndex);
    setPaginatedReports(currentReports);
    setTotalPages(Math.ceil(filteredReports.length / rowsPerPage));
  }, [filteredReports, currentPage, rowsPerPage]);

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

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Payroll Overview</CardTitle>
          <CardDescription>Administrative view for payroll oversight and reporting. Payroll processing is handled by Finance Department.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="flex border-b mb-4">
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Payroll Overview
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('history')}
              >
                Payment History
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h2 className="text-lg font-medium text-blue-900 mb-2">Administrative Payroll Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Processed Months</p>
                      <p className="text-2xl font-bold">
                        {payrollReports.length}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Avg. Employees/Month</p>
                      <p className="text-2xl font-bold">
                        {payrollReports.length > 0
                          ? Math.round(payrollReports.reduce((sum, report) => sum + report.totalEmployees, 0) / payrollReports.length)
                          : 0}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Avg. Monthly Payroll</p>
                      <p className="text-2xl font-bold">
                        KSH {payrollReports.length > 0
                          ? Math.round(payrollReports.reduce((sum, report) => sum + report.netPayroll, 0) / payrollReports.length).toLocaleString()
                          : '0'}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Latest Processed</p>
                      <p className="text-2xl font-bold">
                        {payrollReports.length > 0
                          ? new Date(payrollReports[0].month).toLocaleString('default', { month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Panel - Filters */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Select Month</Label>
                      <Input
                        type="month"
                        id="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        min="2020-01"
                        max={new Date().toISOString().slice(0, 7)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="search">Search Reports</Label>
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search by month or status"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-800 mb-2">Role Information</h3>
                      <p className="text-sm text-yellow-700">
                        Payroll processing is restricted to Finance Department only.
                        Admin users have oversight capabilities but cannot process payments.
                      </p>
                    </div>
                  </div>

                  {/* Right Panel - Payroll Reports */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium mb-4">Payroll Reports</h3>
                    {/* Responsive table container */}
                    <div className="border rounded-md overflow-x-auto">
                      {/* Desktop: Table view */}
                      <div className="hidden md:block">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Month</th>
                              <th className="p-2 text-left">Employees</th>
                              <th className="p-2 text-left">Gross Payroll</th>
                              <th className="p-2 text-left">Deductions</th>
                              <th className="p-2 text-left">Net Payroll</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedReports.length > 0 ? (
                              paginatedReports.map((report) => (
                                <tr
                                  key={report.id}
                                  className="border-t hover:bg-muted/50"
                                >
                                  <td className="p-2">
                                    <div className="font-medium">
                                      {new Date(report.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </div>
                                  </td>
                                  <td className="p-2">{report.totalEmployees}</td>
                                  <td className="p-2">KSH {report.grossPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2">KSH {report.deductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2">KSH {report.netPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                      report.status === 'processed' ? 'bg-green-100 text-green-800' :
                                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                  No payroll reports available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Card view */}
                      <div className="md:hidden">
                        {paginatedReports.length > 0 ? (
                          paginatedReports.map((report) => (
                            <div
                              key={report.id}
                              className="border-b border-t p-4 last:border-b-0 hover:bg-muted/30"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">
                                    {new Date(report.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {report.totalEmployees} employees
                                  </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  report.status === 'processed' ? 'bg-green-100 text-green-800' :
                                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                </span>
                              </div>

                              <div className="mt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Gross Payroll:</span>
                                  <span>KSH {report.grossPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Net Payroll:</span>
                                  <span>KSH {report.netPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Deductions:</span>
                                  <span>KSH {report.deductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            No payroll reports available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-2">
                        <label htmlFor="rowsPerPage" className="text-sm text-gray-700">Rows per page:</label>
                        <select
                          id="rowsPerPage"
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
                          {Math.min(currentPage * rowsPerPage, filteredReports.length)}
                        </span> of{' '}
                        <span className="font-medium">{filteredReports.length}</span> results
                      </div>

                      <div className="flex space-x-2">
                        <button
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                            currentPage === 1
                              ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                          disabled={currentPage === 1}
                          onClick={goToPrevPage}
                        >
                          Previous
                        </button>
                        <button
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                            currentPage === totalPages || totalPages === 0
                              ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                          disabled={currentPage === totalPages || totalPages === 0}
                          onClick={goToNextPage}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <PaymentHistory />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}