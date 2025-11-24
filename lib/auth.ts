// Client-side helper functions for getting user data
import { useSession } from 'next-auth/react';

export const useCurrentUser = () => {
  const { data: session } = useSession();
  return session?.user;
};

export const useCurrentRole = () => {
  const { data: session } = useSession();
  return session?.user?.role;
};

// Server-side helper functions would go here if needed
// but for Next.js 14 App Router, we typically use cookies/headers directly
// or rely on client-side session in client components