'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

interface Document {
  id: string;
  filename: string;
  createdAt: string;
  path: string;
}

export default function EmployeeDocuments() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filterFilename, setFilterFilename] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/employee/documents')
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          return [];
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setDocuments(data);
          }
        });
    }
  }, [status]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDropdownId && !target.closest(`#export-menu-button-${openDropdownId}`) && !target.closest('[role="menu"]')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesFilename = doc.filename.toLowerCase().includes(filterFilename.toLowerCase());
      const docDate = new Date(doc.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const matchesDate = filterDate === '' || docDate === filterDate;
      return matchesFilename && matchesDate;
    });
  }, [documents, filterFilename, filterDate]);

  const exportDocument = (path: string) => {
    window.open(path, '_blank');
  };

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <button 
              disabled 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Upload Document
            </button>
          </div>

          <div className="flex space-x-4 mb-6">
            <input
              type="text"
              placeholder="Filter by filename..."
              value={filterFilename}
              onChange={(e) => setFilterFilename(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{doc.filename}</h3>
                    <p className="text-xs text-gray-400 mt-2">
                      Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-4 flex space-x-3">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          id={`export-menu-button-${doc.id}`}
                          aria-expanded={openDropdownId === doc.id}
                          aria-haspopup="true"
                          onClick={() => {
                            setOpenDropdownId(openDropdownId === doc.id ? null : doc.id);
                          }}
                        >
                          Export
                          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {openDropdownId === doc.id && (
                          <div
                            className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby={`export-menu-button-${doc.id}`}
                            tabIndex={-1}
                          >
                            <div className="py-1" role="none">
                              <button
                                onClick={() => exportDocument(doc.path)}
                                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                role="menuitem"
                                tabIndex={-1}
                              >
                                Export as PDF
                              </button>
                              <button
                                onClick={() => exportDocument(doc.path)}
                                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                role="menuitem"
                                tabIndex={-1}
                              >
                                Export as DOC
                              </button>
                              <button
                                onClick={() => exportDocument(doc.path)}
                                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                role="menuitem"
                                tabIndex={-1}
                              >
                                Export as Excel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't uploaded any documents yet.</p>
              <div className="mt-6">
                <button 
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Upload Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}