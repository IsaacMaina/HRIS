'use client';

import { useState } from 'react';

interface ReconciliationItem {
  payoutRef: string;
  reason?: string;
}

interface ReconciliationDetailsProps {
  items: ReconciliationItem[];
  type: 'issues' | 'pending' | 'discrepancies';
  onResolve?: (ref: string) => void;
}

export default function ReconciliationDetails({ 
  items, 
  type, 
  onResolve 
}: ReconciliationDetailsProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  
  const title = type === 'issues' ? 'Failed Payments' : 
                type === 'pending' ? 'Pending Payments' : 
                'Discrepancies';
                
  const color = type === 'issues' ? 'text-red-600' : 
                type === 'pending' ? 'text-yellow-600' : 
                'text-orange-600';

  const handleResolve = async (ref: string) => {
    if (!onResolve) return;
    
    setResolving(ref);
    try {
      await onResolve(ref);
    } catch (error) {
      console.error(`Error resolving ${type} for ref ${ref}:`, error);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className={`bg-gray-50 px-4 py-3 border-b border-gray-200 ${color}`}>
        <h3 className="text-lg font-medium">{title} ({items.length})</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.payoutRef}</p>
                {item.reason && (
                  <p className="text-sm text-gray-500">{item.reason}</p>
                )}
              </div>
              <div>
                {type !== 'pending' && (
                  <button
                    onClick={() => handleResolve(item.payoutRef)}
                    disabled={!!resolving}
                    className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      type === 'issues' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      resolving === item.payoutRef ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {resolving === item.payoutRef ? 'Resolving...' : 
                     type === 'issues' ? 'Retry Payment' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No {type} to show</p>
          </div>
        )}
      </div>
    </div>
  );
}