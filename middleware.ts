import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const routePermissions = {
  '/admin/dashboard': ['ADMIN', 'HR'],
  '/admin/employees': ['ADMIN', 'HR'],
  '/admin/payroll': ['ADMIN'], // Admin can view payroll reports/overview only (no processing)
  '/admin/leaves': ['ADMIN', 'HR'],
  '/admin/documents': ['ADMIN'],
  '/admin/audit': ['ADMIN'],
  '/admin/settings': ['ADMIN'],
  '/finance/dashboard': ['FINANCE'],
  '/finance/payroll': ['FINANCE'], // Only Finance can process payroll
  '/finance/payroll/new': ['FINANCE'], // Only Finance can process new payroll
  '/finance/reconciliation': ['FINANCE'],
  '/finance/payments': ['FINANCE'],
  '/finance/banks': ['FINANCE'],
  '/analytics/dashboard': ['REPORT', 'ADMIN'],
  '/analytics/tax': ['REPORT', 'ADMIN'],
  '/employee/dashboard': ['EMPLOYEE'],
  '/employee/payslips': ['EMPLOYEE'],
  '/employee/leaves': ['EMPLOYEE'],
  '/employee/documents': ['EMPLOYEE'],
  '/employee/profile': ['EMPLOYEE'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude API routes from middleware
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Redirect to login if no token and trying to access a protected route
  const isProtectedRoute = Object.keys(routePermissions).some(route => pathname.startsWith(route));
  if (isProtectedRoute && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = `callbackUrl=${encodeURIComponent(request.url)}`;
    return NextResponse.redirect(url);
  }

  // Check permissions for protected routes
  if (isProtectedRoute && token) {
    const userRole = token.role as keyof typeof routePermissions;
    const allowedRoles = Object.entries(routePermissions)
      .filter(([route]) => pathname.startsWith(route))
      .flatMap(([, roles]) => roles);

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Redirect to home or an unauthorized page
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/finance/:path*',
    '/analytics/:path*',
    '/employee/:path*',
  ],
};