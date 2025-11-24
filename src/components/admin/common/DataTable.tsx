import React, { useState } from 'react';
 // This import is crucial for autoTable to be available
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectedRow?: string | null;
  onRowSelect?: (id: string) => void;
  rowIdKey?: keyof T;
  searchPlaceholder?: string;
  onSearchChange?: (term: string) => void;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  itemsPerPage?: {
    value: number;
    onChange: (value: number) => void;
  };
  actions?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  onDelete?: (id: string | number) => void;
  totalFilteredCount?: number;
  sortConfig?: {
    key: string | null;
    direction: 'asc' | 'desc';
  };
  onSort?: (key: string) => void;
}

const DataTable = <T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  selectedRow,
  onRowSelect,
  rowIdKey = 'id',
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters = [],
  pagination,
  itemsPerPage,
  actions,
  loading = false,
  emptyMessage = 'No data found',
  onDelete,
  totalFilteredCount,
  sortConfig,
  onSort
}: DataTableProps<T>) => {
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const exportToPdf = () => {
    const doc = new jsPDF();
    const tableColumn = columns.map(col => col.label);
    const tableRows = data.map(row => {
      return columns.map(col => {
        if (col.render) {
          // Render ReactNode to string for PDF export
          const renderedValue = col.render(row[col.key], row);
          if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
            return String(renderedValue);
          }
          // Fallback for complex ReactNodes, might need more sophisticated handling
          return ''; 
        }
        return String(row[col.key]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });

    doc.save('table.pdf');
    setIsExportDropdownOpen(false);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data.map(row => {
      const newRow: any = {};
      columns.forEach(col => {
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
            newRow[col.label] = renderedValue;
          } else {
            newRow[col.label] = ''; // Fallback
          }
        } else {
          newRow[col.label] = String(row[col.key]);
        }
      });
      return newRow;
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'table.xlsx');
    setIsExportDropdownOpen(false);
  };

  const exportToDoc = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
    const footer = "</body></html>";
    let html = header;
    html += '<table>';
    html += '<thead><tr>';
    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
            html += `<td>${renderedValue}</td>`;
          } else {
            html += `<td></td>`; // Fallback
          }
        } else {
          html += `<td>${String(row[col.key])}</td>`;
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += footer;

    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = 'table.doc';
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setIsExportDropdownOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    if (onDelete) {
      onDelete(id);
    } else {
      // Default delete behavior - make API call to delete
      try {
        // Assuming default endpoint is employees - this is a fallback
        // In most cases, onDelete prop should be provided for specific endpoints
        const response = await fetch(`/api/admin/employees/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // In a real implementation, we would refresh the data
          // For now, we'll just reload the page
          window.location.reload();
        } else {
          console.error('Failed to delete item');
          alert('Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            {onSearchChange && (
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 py-2 sm:text-sm border-gray-300 rounded-md"
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {actions}
          </div>
        </div>

        {/* Filters row - responsive layout */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <div key={filter.key} className="flex-shrink-0">
              <select
                className="block min-w-[150px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={`${filter.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {itemsPerPage && (
            <div className="flex-shrink-0">
              <select
                className="block min-w-[120px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={itemsPerPage.value}
                onChange={(e) => itemsPerPage.onChange(Number(e.target.value))}
              >
                <option key="5-rows" value={5}>5 rows</option>
                <option key="10-rows" value={10}>10 rows</option>
                <option key="20-rows" value={20}>20 rows</option>
                <option key="50-rows" value={50}>50 rows</option>
              </select>
            </div>
          )}
          <div className="relative inline-block text-left">
            <div>
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                id="menu-button"
                aria-expanded="true"
                aria-haspopup="true"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              >
                Export
                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {isExportDropdownOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
                tabIndex={-1}
              >
                <div className="py-1" role="none">
                  <button
                    onClick={exportToPdf}
                    className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="menu-item-0"
                  >
                    Export to PDF
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="menu-item-1"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={exportToDoc}
                    className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    id="menu-item-2"
                  >
                    Export to DOC
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table container with responsive design */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden rounded-lg border border-gray-200 max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px] max-w-[150px] sm:max-w-[200px] truncate"
                      onClick={() => onSort && onSort(String(column.key))}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {sortConfig && sortConfig.key === String(column.key) && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  {/* Only show the automatic Actions column if no custom actions column is provided */}
                  {!columns.some(col => col.key === 'actions') && (
                    <th scope="col" className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length > 0 ? (
                  data.map((row, rowIndex) => {
                    const isRowSelected = selectedRow === row[rowIdKey as keyof T];
                    return (
                      <tr
                        key={rowIndex}
                        className={`cursor-pointer hover:bg-gray-50 ${isRowSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          if (onRowClick) onRowClick(row);
                          if (onRowSelect) onRowSelect(String(row[rowIdKey]));
                        }}
                      >
                        {columns.map((column, colIndex) => (
                          <td key={colIndex} className="px-2 py-2 sm:px-4 sm:py-4 text-sm text-gray-500 max-w-[120px] sm:max-w-[180px] truncate" title={column.render ? '' : String(row[column.key])}>
                            {column.render
                              ? column.render(row[column.key], row)
                              : String(row[column.key])}
                          </td>
                        ))}
                        {/* Only show the automatic actions cell if no custom actions column is provided */}
                        {!columns.some(col => col.key === 'actions') && (
                          <td className="px-2 py-2 sm:px-4 sm:py-4 whitespace-nowrap text-sm text-gray-500 min-w-[100px]">
                            <div className="flex space-x-1 sm:space-x-2">
                              <button
                                className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRowClick) onRowClick(row);
                                }}
                              >
                                View
                              </button>
                              <button
                                className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to edit page using the row's id
                                  window.location.href = `/admin/employees/${row[rowIdKey as keyof T]}/edit`;
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this item?')) {
                                    if (onDelete) {
                                      onDelete(row[rowIdKey as keyof T]);
                                    } else {
                                      // Fallback to internal delete handler if onDelete is not provided
                                      handleDelete(row[rowIdKey as keyof T]);
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-2 py-2 sm:px-4 sm:py-4 text-center text-sm text-gray-500">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700 text-center sm:text-left">
            Showing <span className="font-medium">{(pagination.currentPage - 1) * (itemsPerPage?.value || 10) + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(
                pagination.currentPage * (itemsPerPage?.value || 10),
                totalFilteredCount ?? data.length
              )}
            </span>{' '}
            of <span className="font-medium">{totalFilteredCount ?? data.length}</span> results
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            <button
              className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                pagination.currentPage === 1
                  ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-default'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }

              return (
                <button
                  key={`page-${pageNum}`}
                  className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                    pagination.currentPage === pageNum
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            {(pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2) && (
              <>
                <span key="ellipsis" className="relative inline-flex items-center px-3 py-1.5 text-sm font-medium border-gray-300 text-gray-700 bg-white">...</span>
                <button
                  key={`page-${pagination.totalPages}`}
                  className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                    pagination.currentPage === pagination.totalPages
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => pagination.onPageChange(pagination.totalPages)}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            <button
              className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                pagination.currentPage === pagination.totalPages
                  ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-default'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Nxt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;