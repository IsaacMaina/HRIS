'use client';

import { useState } from 'react';

interface ExportDropdownProps {
  exportToPdfUrl: string;
  exportToExcelUrl: string;
  exportToDocUrl: string;
}

export default function ExportDropdown({ 
  exportToPdfUrl, 
  exportToExcelUrl, 
  exportToDocUrl 
}: ExportDropdownProps) {
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          id="export-menu-button"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
        >
          Export Report
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {isExportDropdownOpen && (
          <div
            className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="export-menu-button"
            tabIndex={-1}
          >
            <div className="py-1" role="none">
              <a
                href={exportToPdfUrl}
                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                role="menuitem"
                tabIndex={-1}
                onClick={() => setIsExportDropdownOpen(false)}
              >
                Export to PDF
              </a>
              <a
                href={exportToExcelUrl}
                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                role="menuitem"
                tabIndex={-1}
                onClick={() => setIsExportDropdownOpen(false)}
              >
                Export to Excel
              </a>
              <a
                href={exportToDocUrl}
                className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                role="menuitem"
                tabIndex={-1}
                onClick={() => setIsExportDropdownOpen(false)}
              >
                Export to DOC
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}