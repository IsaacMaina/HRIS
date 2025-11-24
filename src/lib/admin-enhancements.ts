// Common interfaces for admin pages
export interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  hireDate?: string;
  salary?: number;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  staffNo: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  appliedAt: string;
  reason?: string;
}

export interface PayrollEntry {
  id: string;
  employeeName: string;
  staffNo: string;
  grossSalary: number;
  deductions: any;
  netPay: number;
  status: string;
  month: string;
}

export interface PayoutTransaction {
  id: string;
  ref: string;
  date: string;
  amount: number;
  status: string;
  bank: string;
}

export interface Document {
  id: string;
  filename: string;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
  path: string;
}

export interface AuditLog {
  id: string;
  actionType: string;
  module: string;
  description: string;
  timestamp: string;
  employeeName: string;
  employeeId: string;
}

// Common hooks for admin pages
import { useState, useEffect } from 'react';

// Hook for managing paginated data
export const usePagination = (data: any[], itemsPerPage: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);
  
  const indexOfLastItem = currentPage * itemsPerPageState;
  const indexOfFirstItem = indexOfLastItem - itemsPerPageState;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPageState);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return {
    currentItems,
    totalPages,
    currentPage,
    paginate,
    nextPage,
    prevPage,
    itemsPerPage: itemsPerPageState,
    setItemsPerPage: setItemsPerPageState
  };
};

// Hook for managing searchable and filterable data
export const useTableFilter = (data: any[], searchFields: string[]) => {
  const [filteredData, setFilteredData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  useEffect(() => {
    let result = [...data];
    
    // Apply search term
    if (searchTerm) {
      result = result.filter(item => 
        searchFields.some(field => 
          String(item[field]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== 'All' && value !== '') {
        result = result.filter(item => String(item[key]) === value);
      }
    });
    
    setFilteredData(result);
  }, [data, searchTerm, filters, searchFields]);
  
  const updateFilter = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({});
  };
  
  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    resetFilters
  };
};

// Hook for managing selected rows
export const useRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id) 
        : [...prev, id]
    );
  };
  
  const selectAllRows = (ids: string[]) => {
    setSelectedRows(ids);
  };
  
  const deselectAllRows = () => {
    setSelectedRows([]);
  };
  
  const isSelected = (id: string) => selectedRows.includes(id);
  
  return {
    selectedRows,
    toggleSelectRow,
    selectAllRows,
    deselectAllRows,
    isSelected
  };
};

// Common table header with actions
export const TableHeader = ({ 
  title, 
  onAddNew,
  onExport,
  onImport
}: {
  title: string;
  onAddNew?: () => void;
  onExport?: () => void;
  onImport?: () => void;
}) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <div className="flex space-x-3">
      {onAddNew && (
        <button 
          onClick={onAddNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add New
        </button>
      )}
      {onExport && (
        <button 
          onClick={onExport}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Export
        </button>
      )}
      {onImport && (
        <button 
          onClick={onImport}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Import
        </button>
      )}
    </div>
  </div>
);

// Common search and filter controls
export const SearchAndFilterControls = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  filterOptions,
  onResetFilters,
  itemsPerPage,
  onItemsPerPageChange
}: {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: Record<string, string>;
  onFilterChange: (field: string, value: string) => void;
  filterOptions: { field: string; label: string; options: { value: string; label: string }[] }[];
  onResetFilters: () => void;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
    <div className="flex-1">
      <div className="max-w-lg flex rounded-md shadow-sm">
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md rounded-r-none border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Search
        </button>
      </div>
    </div>

    <div className="flex space-x-2">
      {filterOptions.map(({ field, label, options }) => (
        <select
          key={field}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={filters[field] || 'All'}
          onChange={(e) => onFilterChange(field, e.target.value)}
        >
          <option value="All">{label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ))}
      
      <select
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
      >
        <option value={5}>5 rows</option>
        <option value={10}>10 rows</option>
        <option value={20}>20 rows</option>
        <option value={50}>50 rows</option>
      </select>
      
      <button
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={onResetFilters}
      >
        Reset
      </button>
    </div>
  </div>
);

// Common pagination controls
export const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  onPrevious,
  onNext
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) => (
  <div className="mt-6 flex items-center justify-between">
    <div className="text-sm text-gray-700">
      Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
      <span className="font-medium">{Math.min(currentPage * 10, totalPages * 10)}</span> of{' '}
      <span className="font-medium">{totalPages * 10}</span> results
    </div>
    <div className="flex space-x-2">
      <button
        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
          currentPage === 1
            ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-default'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        }`}
        disabled={currentPage === 1}
        onClick={onPrevious}
      >
        Previous
      </button>
      
      {/* Page numbers */}
      {[...Array(Math.min(5, totalPages))].map((_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        
        return (
          <button
            key={pageNum}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              currentPage === pageNum
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </button>
        );
      })}
      
      {totalPages > 5 && currentPage < totalPages - 2 && (
        <>
          <span className="relative inline-flex items-center px-4 py-2 border text-sm font-medium border-gray-300 text-gray-700 bg-white">...</span>
          <button
            key={totalPages}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
          currentPage === totalPages
            ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-default'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        }`}
        disabled={currentPage === totalPages}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  </div>
);

// Common table row component with click handler
export const TableRow = ({
  children,
  onClick,
  isSelected,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}) => (
  <tr 
    className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

// Format date helper
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};