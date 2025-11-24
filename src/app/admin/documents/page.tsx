'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import DataTable from '@/components/admin/common/DataTable';
import { toast } from 'sonner';
import { getUserInitials, getInitialsColor } from '@/lib/utils';

interface Document {
  id: string;
  filename: string;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
  path: string;
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // For immediate UI updates
  const [searchInput, setSearchInput] = useState(''); // For debounced search
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [docsPerPage, setDocsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/admin/documents');
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        } else {
          console.error('Failed to fetch documents');
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Apply filters and sorting
  const filteredAndSortedDocuments = useMemo(() => {
    return [...documents].filter(doc => {
      const matchesSearch =
        doc.filename.toLowerCase().includes(searchInput.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchInput.toLowerCase()) ||
        doc.uploadedBy.toLowerCase().includes(searchInput.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (!sortConfig.key) return 0;

      const aValue = a[sortConfig.key as keyof Document];
      const bValue = b[sortConfig.key as keyof Document];

      // Handle date comparison
      if (sortConfig.key === 'uploadedAt') {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        const comparison = dateA - dateB;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue as string);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Handle other types
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [documents, searchInput, categoryFilter, sortConfig]);

  // Get unique categories for filter
  const categories = Array.from(new Set(documents.map(doc => doc.category)));

  // Pagination
  const indexOfLastDoc = currentPage * docsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - docsPerPage;
  const currentDocs = filteredAndSortedDocuments.slice(indexOfFirstDoc, indexOfLastDoc);
  const totalPages = Math.ceil(filteredAndSortedDocuments.length / docsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);


  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`/api/admin/documents/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Delete response:', result);
          // Remove the deleted document from the local state
          setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
          toast.success(result.message || 'Document deleted successfully!');
        } else {
          const errorData = await response.json();
          console.error('Failed to delete document:', errorData);
          toast.error(`Failed to delete document: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error(`Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Documents & Reports</h1>
            <div className="flex space-x-3">
              <Link href="/admin/documents/upload">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Upload Document
                </button>
              </Link>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'filename',
                label: 'Filename',
                render: (value, row) => (
                  <div key={`filename-${row.id}`} className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getInitialsColor(row.uploadedBy)}`}
                      >
                        {getUserInitials(row.uploadedBy)}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{value}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                label: 'Category',
                render: (value, row) => (
                  <span key={`category-${row.id}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                  </span>
                )
              },
              {
                key: 'uploadedBy',
                label: 'Uploaded By',
                render: (value, row) => (
                  <div key={`uploadedby-${row.id}`}>
                    <div className="text-sm font-medium text-gray-900">{value}</div>
                    <div className="text-sm text-gray-500">{new Date(row.uploadedAt).toLocaleDateString()}</div>
                  </div>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => (
                  <div key={`actions-${row.id}`} className="flex space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDocument(row.path);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Document
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                )
              },
            ]}
            data={currentDocs} // Use paginated data instead of all filtered data
            onRowClick={(doc) => exportDocument(doc.path)}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            rowIdKey="id"
            searchPlaceholder="Search documents..."
            onSearchChange={setSearchInput}
            filters={[
              {
                key: 'category',
                label: 'Category',
                options: [
                  { value: 'All', label: 'All Categories', key: 'all-cat' },
                  ...categories.map((cat, index) => ({ value: cat, label: cat, key: `cat-${index}-${cat}` })),
                ],
                value: categoryFilter,
                onChange: setCategoryFilter,
              }
            ]}
            onDelete={handleDelete}
            totalFilteredCount={filteredAndSortedDocuments.length}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: handlePageChange,
            }}
            itemsPerPage={{
              value: docsPerPage,
              onChange: setDocsPerPage,
            }}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage="No documents found"
          />

          {/* Pagination Info */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
            <div>
              Showing <span className="font-medium">{indexOfFirstDoc + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastDoc, filteredAndSortedDocuments.length)}
              </span>{' '}
              of <span className="font-medium">{filteredAndSortedDocuments.length}</span> results
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}