'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataTable from '@/components/admin/common/DataTable';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditLog {
  id: string;
  actionType: string;
  module: string;
  description: string;
  timestamp: string;
  employeeName: string;
  employeeId: string;
  details?: any;
}

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch('/api/admin/activities');
        if (response.ok) {
          const data = await response.json();
          setAuditLogs(data);
        } else {
          console.error('Failed to fetch audit logs');
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const exportToPdf = () => {
    const doc = new jsPDF();
    const tableColumn = columns.map(col => col.label);
    const tableRows = filteredLogs.map(row => {
      return columns.map(col => {
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
            return String(renderedValue);
          }
          return '';
        }
        return String(row[col.key]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });

    doc.save('audit-logs.pdf');
    setIsExportDropdownOpen(false);
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/export-audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            searchTerm,
            actionFilter,
            moduleFilter,
          }
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('Failed to export logs:', errorData);
        alert(`Failed to export audit logs: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Error exporting audit logs');
    } finally {
      setIsExporting(false);
      setIsExportDropdownOpen(false);
    }
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
    filteredLogs.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
            html += `<td>${renderedValue}</td>`;
          } else {
            html += `<td></td>`;
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
    downloadLink.download = 'audit-logs.doc';
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setIsExportDropdownOpen(false);
  };

  // Apply filters
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'All' || log.actionType === actionFilter;
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    
    return matchesSearch && matchesAction && matchesModule;
  });

  // Get unique actions and modules for filters
  const actions = Array.from(new Set(auditLogs.map(log => log.actionType)));
  const modules = Array.from(new Set(auditLogs.map(log => log.module)));

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewLog = (id: string) => {
    window.location.href = `/admin/activities/${id}`;
  };

  const columns = [
    { key: 'actionType', label: 'Action' },
    {
      key: 'employeeName',
      label: 'User',
      render: (value: any, row: AuditLog) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.employeeId}</div>
        </div>
      ),
    },
    { key: 'module', label: 'Module' },
    { key: 'description', label: 'Description' },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (value: any) => new Date(value).toLocaleString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: AuditLog) => (
        <div className="flex space-x-3">
          <Link href={`/admin/activities/${row.id}`}>
            <button
              onClick={(e) => e.stopPropagation()} // Prevent row click from firing
              className="text-blue-600 hover:text-blue-900"
            >
              View
            </button>
          </Link>
        </div>
      )
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          </div>

          <DataTable
            columns={columns}
            data={currentLogs} // Pass only the current page data
            onRowClick={(log) => handleViewLog(log.id)}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            rowIdKey="id"
            searchPlaceholder="Search audit logs..."
            onSearchChange={setSearchTerm}
            filters={[
              {
                key: 'actionType',
                label: 'Action',
                options: [
                  { value: 'All', label: 'All Actions' },
                  ...actions.map(action => ({ value: action, label: action })),
                ],
                value: actionFilter,
                onChange: setActionFilter,
              },
              {
                key: 'module',
                label: 'Module',
                options: [
                  { value: 'All', label: 'All Modules' },
                  ...modules.map(module => ({ value: module, label: module })),
                ],
                value: moduleFilter,
                onChange: setModuleFilter,
              }
            ]}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: handlePageChange,
            }}
            itemsPerPage={{
              value: logsPerPage,
              onChange: setLogsPerPage,
            }}
            totalFilteredCount={filteredLogs.length} // Pass the total filtered count for accurate pagination
            emptyMessage="No audit logs found"
          />
        </div>
      </div>
    </div>
  );
}