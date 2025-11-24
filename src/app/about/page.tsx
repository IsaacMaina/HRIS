import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us - University HRIS",
  description: "Learn more about our University Human Resource Information System and how we streamline HR processes for educational institutions",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FCF8E3] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-[#004B2E] mb-6">About Our HRIS</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              Our University Human Resource Information System is a comprehensive solution designed specifically for 
              educational institutions to streamline HR processes and improve efficiency.
            </p>
            
            <h2 className="text-2xl font-semibold text-[#006837] mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-6">
              To provide educational institutions with an efficient, user-friendly HR management solution that 
              enhances employee experience while reducing administrative burden on HR staff.
            </p>
            
            <h2 className="text-2xl font-semibold text-[#006837] mt-8 mb-4">Features</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
              <li>Employee self-service portal</li>
              <li>Automated payroll processing</li>
              <li>Leave management with approval workflows</li>
              <li>Document management system</li>
              <li>Financial reporting and reconciliation</li>
              <li>Notification and audit systems</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-[#006837] mt-8 mb-4">Our Team</h2>
            <p className="text-gray-700 mb-6">
              We are a team of dedicated professionals committed to improving HR processes in educational institutions 
              through technology and innovative solutions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}