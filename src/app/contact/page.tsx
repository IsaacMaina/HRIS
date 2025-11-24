'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setStatus('error');
        console.error('Contact form submission error:', data.message);
      }
    } catch (error) {
      setStatus('error');
      console.error('Contact form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF8E3] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#004B2E] mb-4">Contact Us</h1>
          <p className="text-xl text-[#080808]">
            Get in touch with our team for support or inquiries
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold text-[#004B2E] mb-6">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[#004B2E]">University HRIS Team</h3>
                <p className="text-[#080808]">Kaimosi Friends University</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#777777] uppercase tracking-wider">Email</h3>
                <p className="text-[#080808]">mainaisaacwachira2000@gmail.com</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#777777] uppercase tracking-wider">Phone</h3>
                <p className="text-[#080808]">+254758302725</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#777777] uppercase tracking-wider">Address</h3>
                <p className="text-[#080808]">
                  Kaimosi Friends University<br />
                  P.O. Box 1234-5678<br />
                  Kaimosi, Kenya
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-[#004B2E] mb-6">Send us a message</h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status === 'success' && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Success!</strong>
                  <span className="block sm:inline"> Your message has been sent.</span>
                </div>
              )}
              {status === 'error' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> There was an issue sending your message.</span>
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#080808] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 border border-[#E5E5E5] rounded-md focus:ring-[#006837] focus:border-[#006837] text-[#080808]"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#080808] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 border border-[#E5E5E5] rounded-md focus:ring-[#006837] focus:border-[#006837] text-[#080808]"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[#080808] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  className="w-full px-4 py-2 border border-[#E5E5E5] rounded-md focus:ring-[#006837] focus:border-[#006837] text-[#080808]"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#080808] mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 border border-[#E5E5E5] rounded-md focus:ring-[#006837] focus:border-[#006837] text-[#080808]"
                  placeholder="Your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#006837] hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006837] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}