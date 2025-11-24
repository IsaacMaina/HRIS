import { prisma } from '../../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PaymentDetail {
  id: string;
  payoutRef: string;
  date: Date;
  amount: number;
  bank: string;
  netPay: number;
  basicPay: number;
  allowances: number;
  deductions: number | Record<string, any>;
  employeeName: string;
  employeeId: string;
}

async function getPaymentDetails(payoutRef: string): Promise<PaymentDetail[]> {
  // Get payslips associated with the payout reference
  const payslips = await prisma.payslip.findMany({
    where: {
      payoutRef: payoutRef
    },
    include: {
      employee: {
        include: {
          user: true,
          bank: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (payslips.length === 0) {
    return [];
  }

  // Map payslips to payment details
  return payslips.map(payslip => ({
    id: payslip.id,
    payoutRef: payslip.payoutRef || '',
    date: payslip.createdAt,
    amount: payslip.netPay,
    bank: payslip.employee?.bank?.name || 'Unknown',
    netPay: payslip.netPay,
    basicPay: payslip.basicPay,
    allowances: payslip.allowances,
    deductions: payslip.deductions,
    employeeName: payslip.employee?.user?.name || 'Unknown Employee',
    employeeId: payslip.employeeId
  }));
}

interface PaymentDetailsPageProps {
  params: {
    payoutRef: string;
  };
}

export default async function PaymentDetailsPage({ params }: PaymentDetailsPageProps) {
  const payoutRef = params.payoutRef;
  const paymentDetails = await getPaymentDetails(payoutRef);

  if (paymentDetails.length === 0) {
    notFound();
  }

  // Calculate totals
  const totalAmount = paymentDetails.reduce((sum, detail) => sum + detail.amount, 0);
  const totalBasicPay = paymentDetails.reduce((sum, detail) => sum + detail.basicPay, 0);
  const totalAllowances = paymentDetails.reduce((sum, detail) => sum + detail.allowances, 0);

  // Calculate total deductions properly whether it's a number or an object
  const totalDeductions = paymentDetails.reduce((sum, detail) => {
    if (typeof detail.deductions === 'number') {
      return sum + detail.deductions;
    } else if (typeof detail.deductions === 'object' && detail.deductions !== null) {
      // Sum all values in the deductions object
      return sum + Object.values(detail.deductions).reduce((objSum, value) =>
        typeof value === 'number' ? objSum + value : objSum, 0);
    }
    return sum;
  }, 0);

  const bankName = paymentDetails[0]?.bank || 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
              <p className="text-gray-600">Payout Reference: {payoutRef}</p>
            </div>
            <Link 
              href="/finance/payments" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Payments
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Total Amount</p>
              <p className="text-xl font-bold text-blue-900">KSH {(totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800">Employees</p>
              <p className="text-xl font-bold text-green-900">{paymentDetails.length}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">Bank</p>
              <p className="text-lg font-bold text-yellow-900">{bankName}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Date</p>
              <p className="text-lg font-bold text-purple-900">{paymentDetails[0]?.date.toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Basic Pay</p>
                  <p className="font-medium">KSH {(totalBasicPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Allowances</p>
                  <p className="font-medium">KSH {(totalAllowances || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deductions</p>
                  <p className="font-medium">KSH {(totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Pay</p>
                  <p className="font-medium font-bold">KSH {(totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Employees Paid</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Pay
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allowances
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentDetails.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detail.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {detail.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {(detail.basicPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {(detail.allowances || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {
                          typeof detail.deductions === 'number'
                            ? (detail.deductions || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
                            : typeof detail.deductions === 'object' && detail.deductions !== null
                              ? Object.values(detail.deductions).reduce((sum, value) =>
                                  typeof value === 'number' ? sum + value : sum, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : '0'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        KSH {(detail.netPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href={`/finance/payments/${encodeURIComponent(payoutRef)}/receipt`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Download Receipt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}