'use client';

import { usePathname } from 'next/navigation';
import { useState, ReactNode } from 'react';
import Header from './Header';
import SocialFooter from './SocialFooter';
import RightSidebar from './RightSidebar';

// Pages where the header and related elements should not be displayed
const HIDDEN_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/reset',
  '/post-login',
  '/error',
  '/not-found',
  '/404'
];

interface ConditionalLayoutProps {
  children: ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if the current path is in the list of hidden paths
  const shouldHideLayoutElements = HIDDEN_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  if (shouldHideLayoutElements) {
    // Return children without header, sidebar, and other layout elements
    return (
      <div className="min-h-screen bg-[#FCF8E3]">
        {children}
      </div>
    );
  }

  // Return full layout with all elements
  return (
    <div className="min-h-screen bg-[#FCF8E3]">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main>
        {children}
      </main>
      <SocialFooter />
      <RightSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}