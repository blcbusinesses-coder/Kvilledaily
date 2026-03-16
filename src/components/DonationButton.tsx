'use client';

import { useState } from 'react';

export function DonationButton() {
  const [loading, setLoading] = useState(false);

  async function handleDonate() {
    setLoading(true);
    try {
      const res = await fetch('/api/create-donation-session', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Donation error:', err);
      alert('Unable to process donation. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDonate}
      disabled={loading}
      className="bg-white text-newsred font-bold font-sans py-2 px-6 rounded hover:bg-red-50 transition-colors disabled:opacity-60 text-sm uppercase tracking-widest whitespace-nowrap"
    >
      {loading ? 'Redirecting…' : '❤ Donate'}
    </button>
  );
}
