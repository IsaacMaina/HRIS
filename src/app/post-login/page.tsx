'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PostLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      switch (session?.user?.role) {
        case 'ADMIN':
        case 'HR':
          router.push('/admin/dashboard');
          break;
        case 'FINANCE':
          router.push('/finance/dashboard');
          break;
        case 'REPORT':
          router.push('/analytics/dashboard');
          break;
        case 'EMPLOYEE':
        default:
          router.push('/employee/dashboard');
          break;
      }
    } else if (status === 'unauthenticated') {
      // If for some reason an unauthenticated user lands here, redirect to login
      router.push('/auth/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <p className="text-xl text-[#004B2E]">Loading user data...</p>
      </div>
    );
  }

  return null; // Will redirect before rendering anything
}
