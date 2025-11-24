// src/components/admin/common/AdminLayout.tsx
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AdminLayout = ({ 
  children, 
  title, 
  description,
  actions
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) => {
  const pathname = usePathname();

  // Navigation items
  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: '📊' },
    { name: 'Employees', href: '/admin/employees', icon: '👥' },
    { name: 'Leaves', href: '/admin/leaves', icon: '🏖️' },
    { name: 'Payroll', href: '/admin/payroll', icon: '💰' },
    { name: 'Payouts', href: '/admin/payouts', icon: '💳' },
    { name: 'Documents', href: '/admin/documents', icon: '📄' },
    { name: 'Audit', href: '/admin/audit', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-green-700">Admin Portal</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'border-green-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">Admin User</span>
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between mb-6">
            <div className="lg:min-w-0 lg:flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h2>
              {description && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-5 flex lg:mt-0 lg:ml-4 space-x-3">
                {actions}
              </div>
            )}
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;