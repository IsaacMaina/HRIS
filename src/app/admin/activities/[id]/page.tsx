'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Activity {
  id: string;
  actionType: string;
  description: string;
  module: string;
  timestamp: string;
  employeeName: string;
  employeeId: string;
  details?: any;
}

export default function ActivityDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && (session.user.role === 'ADMIN' || session.user.role === 'HR')) {
      // Fetch the specific activity
      fetch(`/api/activities/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setActivity(data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch activity:", error);
          setError("Failed to fetch activity details");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (status !== 'loading') {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }
  }, [id, status, session, router]);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    return "Just now";
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006837] mx-auto"></div>
          <p className="mt-4 text-[#080808]">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR')) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login');
    }
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FCF8E3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6 border border-[#E5E5E5]">
            <h1 className="text-2xl font-bold text-[#004B2E] mb-6">Activity Details</h1>
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Link 
                href="/admin/dashboard" 
                className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#FCF8E3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6 border border-[#E5E5E5]">
            <h1 className="text-2xl font-bold text-[#004B2E] mb-6">Activity Details</h1>
            <div className="text-center py-8">
              <p className="text-[#777777] mb-4">Activity not found</p>
              <Link 
                href="/admin/dashboard" 
                className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF8E3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 border border-[#E5E5E5]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#004B2E]">Activity Details</h1>
            <Link 
              href="/admin/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-[#004B2E]">Module</h3>
              <p className="text-[#080808] mt-2">{activity.module}</p>
            </div>
            
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-[#004B2E]">Action Type</h3>
              <p className="text-[#080808] mt-2">{activity.actionType}</p>
            </div>
            
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-[#004B2E]">Time</h3>
              <p className="text-[#080808] mt-2">{timeAgo(activity.timestamp)}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#004B2E] mb-4">Description</h2>
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6">
              <p className="text-[#080808]">{activity.description}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#004B2E] mb-4">Employee</h2>
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6">
              <p className="text-[#080808]">{activity.employeeName}</p>
            </div>
          </div>

          {activity.details && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-[#004B2E] mb-4">Additional Details</h2>
              <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6 overflow-x-auto">
                <pre className="text-sm text-[#080808] whitespace-pre-wrap">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#004B2E] mb-4">Timestamp</h2>
            <div className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6">
              <p className="text-[#080808]">{new Date(activity.timestamp).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Link 
              href="/admin/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}