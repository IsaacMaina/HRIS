import { prisma } from '../../../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

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

interface ReceiptPageProps {
  params: {
    payoutRef: string;
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
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
  const payoutDate = paymentDetails[0]?.date.toLocaleDateString() || '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          {/* Receipt header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Receipt</h1>
            <p className="text-gray-600">Payout Reference: {payoutRef}</p>
            <p className="text-gray-500 text-sm">Date: {payoutDate}</p>
          </div>

          {/* Company details */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="grid grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">From:</h2>
                <p className="text-gray-700">University HRIS</p>
                <p className="text-gray-600">Payroll Department</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Bank:</h2>
                <p className="text-gray-700">{bankName}</p>
              </div>
            </div>
          </div>

          {/* Summary section */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">KSH {(totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Employees</p>
                <p className="text-xl font-bold text-gray-900">{paymentDetails.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Basic Pay</p>
                <p className="text-xl font-bold text-gray-900">KSH {(totalBasicPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Net Pay</p>
                <p className="text-xl font-bold text-gray-900">KSH {(totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          {/* Payment details table */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Pay
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allowances
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentDetails.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detail.employeeName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {detail.employeeId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        KSH {(detail.basicPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        KSH {(detail.allowances || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        KSH {
                          typeof detail.deductions === 'number'
                            ? (detail.deductions || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
                            : typeof detail.deductions === 'object' && detail.deductions !== null
                              ? Object.values(detail.deductions).reduce((sum, value) =>
                                  typeof value === 'number' ? sum + value : sum, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : '0'
                        }
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        KSH {(detail.netPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment summary */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-2 ml-auto w-1/2">
              <div className="text-right pr-4">
                <p className="text-gray-600">Basic Pay:</p>
                <p className="text-gray-600">Allowances:</p>
                <p className="text-gray-600">Deductions:</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">Total:</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">KSH {(totalBasicPay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-gray-600">KSH {(totalAllowances || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-gray-600">KSH {(totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">KSH {(totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex justify-between">
            <Link
              href={`/finance/payments/${payoutRef}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Details
            </Link>
            <PrintButton
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}