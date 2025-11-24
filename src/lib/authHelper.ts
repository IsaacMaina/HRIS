import { auth } from '@/auth';

export async function getCurrentSession() {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}