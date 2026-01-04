
import React from 'react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  customUrl?: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, propertyName, customUrl }) => {
  if (!isOpen) return null;

  const targetUrl = customUrl || window.location.href; 
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(targetUrl)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${propertyName.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code', error);
      alert('Could not download image. Please try right-clicking the QR code.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in duration-300 text-center border border-slate-100">
          <div className="mb-6">
            <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">Guest Access</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">{propertyName}</p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-center border border-slate-100 mb-6 group relative">
            <img src={qrUrl} alt="QR Code" className="w-full aspect-square mix-blend-multiply" />
            <button 
              onClick={handleDownload}
              className="absolute bottom-2 right-2 p-2 bg-white rounded-xl shadow-md text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Download PNG"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handlePrint}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Poster
            </button>
            <button 
              onClick={onClose}
              className="w-full text-slate-400 py-2 text-sm font-bold hover:text-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print-only fixed inset-0 bg-white p-20 flex-col items-center justify-center text-center">
        <div className="mb-12">
          <h1 className="text-6xl font-black text-slate-900 mb-4">{propertyName}</h1>
          <p className="text-3xl text-slate-500 font-bold uppercase tracking-[0.2em]">Guest Welcome Guide</p>
        </div>
        
        <div className="w-[500px] h-[500px] border-[20px] border-slate-900 rounded-[60px] p-12 mb-12 flex items-center justify-center">
          <img src={qrUrl} alt="QR Code" className="w-full h-full" />
        </div>

        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-6 italic">Scan for everything you need</h2>
          <div className="grid grid-cols-2 gap-8 text-left text-2xl font-bold text-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-rose-500 rounded-full" />
              WiFi Details
            </div>
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-rose-500 rounded-full" />
              House Manual
            </div>
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-rose-500 rounded-full" />
              Local Hotspots
            </div>
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-rose-500 rounded-full" />
              Checkout Info
            </div>
          </div>
        </div>

        <div className="mt-auto pt-20 border-t border-slate-100 w-full flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-xl">
          <span>Created with GuestGuide AI</span>
          <span>Digital Concierge Assistant</span>
        </div>
      </div>
    </>
  );
};
