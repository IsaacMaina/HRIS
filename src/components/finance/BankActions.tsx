'use client';

import { useState } from 'react';

interface BankActionsProps {
  bankName: string;
  bankId: string;
}

export default function BankActions({ bankName, bankId }: BankActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    alert('Edit bank functionality would go here');
    setIsEditing(false);
  };

  const handleConfigure = () => {
    setIsConfiguring(true);
    alert('Configure bank settings functionality would go here');
    setIsConfiguring(false);
  };

  return (
    <div className="flex justify-end space-x-3">
      <button
        onClick={handleEdit}
        disabled={isEditing}
        className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
          isEditing ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isEditing ? 'Editing...' : 'Edit Bank'}
      </button>
      <button
        onClick={handleConfigure}
        disabled={isConfiguring}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isConfiguring ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isConfiguring ? 'Configuring...' : 'Configure Bank Settings'}
      </button>
    </div>
  );
}