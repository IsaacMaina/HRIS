interface SampleUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function CredentialsPage() {
  // Sample users for demonstration
  const users: SampleUser[] = [
    {
      id: 'sample_admin_id',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    },
    {
      id: 'sample_hr_id',
      name: 'HR User',
      email: 'hr@example.com',
      role: 'HR'
    },
    {
      id: 'sample_finance_id',
      name: 'Finance User',
      email: 'finance@example.com',
      role: 'FINANCE'
    },
    {
      id: 'sample_employee_id',
      name: 'Employee User',
      email: 'employee@example.com',
      role: 'EMPLOYEE'
    },
    {
      id: 'sample_report_id',
      name: 'Report User',
      email: 'report@example.com',
      role: 'REPORT'
    }
  ];

  // Group users by role
  const usersByRole: Record<string, SampleUser[]> = {};
  users.forEach(user => {
    if (!usersByRole[user.role]) {
      usersByRole[user.role] = [];
    }
    usersByRole[user.role].push(user);
  });

  // Define role-specific default passwords
  const defaultPasswords: Record<string, string> = {
    ADMIN: '123456',
    HR: '123456',
    FINANCE: '123456',
    EMPLOYEE: '123456',
    REPORT: '123456'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">User Credentials</h1>
            <p className="text-gray-600">Default login credentials for all user roles</p>
          </div>

          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-medium text-yellow-800 mb-2">Note</h2>
            <p className="text-yellow-700">
              These are default credentials for testing purposes. In production, passwords should be properly secured.
            </p>
          </div>

          {Object.entries(usersByRole).map(([role, roleUsers]) => (
            <div key={role} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">{role} Users</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Default Password
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roleUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{defaultPasswords[role as keyof typeof defaultPasswords] || 'user123'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Default Passwords by Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(defaultPasswords).map(([role, password]) => (
                <div key={role} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 capitalize">{role}</div>
                  <div className="mt-1 text-sm font-mono bg-white p-2 rounded border">
                    {password}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8">
            <a 
              href="/auth/login" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}