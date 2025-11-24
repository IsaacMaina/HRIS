import { prisma } from '../../../../lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BankActions from '../../../../components/finance/BankActions';

interface BankDetails {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  employees: {
    id: string;
    staffNo: string;
    user: {
      name: string;
    };
  }[];
}

async function getBankDetails(bankId: string): Promise<BankDetails | null> {
  // Get the bank from the database
  const bank = await prisma.bank.findUnique({
    where: {
      id: bankId
    },
    select: {
      id: true,
      name: true,
      code: true,
      accounts: {
        select: {
          id: true
        }
      }
    }
  });

  if (!bank) {
    return null;
  }

  // Get employees linked to this bank
  const employees = await prisma.employee.findMany({
    where: {
      bankId: bankId
    },
    select: {
      id: true,
      staffNo: true,
      user: {
        select: {
          name: true
        }
      }
    },
    orderBy: { user: { name: 'asc' } }
  });

  // Calculate employee count
  const employeeCount = employees.length;

  return {
    id: bank.id,
    name: bank.name,
    code: bank.code,
    employeeCount,
    employees
  };
}

interface BankDetailsPageProps {
  params: Promise<{
    bankId: string;
  }>;
}

export default async function BankDetailsPage({ params }: BankDetailsPageProps) {
  const { bankId } = await params;
  const bank = await getBankDetails(bankId);

  if (!bank) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{bank.name} Details</h1>
              <p className="text-gray-600">Bank Code: {bank.code}</p>
            </div>
            <Link
              href="/finance/banks"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Banks
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Bank Name</p>
              <p className="font-medium">{bank.name}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800">Code</p>
              <p className="font-medium">{bank.code}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">Employees</p>
              <p className="font-medium">{bank.employeeCount}</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Employees Using This Bank</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {bank.employeeCount} employees
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Number
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bank.employees.length > 0 ? (
                    bank.employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.staffNo}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                        No employees configured with this bank.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <BankActions bankName={bank.name} bankId={bank.id} />
        </div>
      </div>
    </div>
  );
}