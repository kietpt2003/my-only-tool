import React from 'react';

import momoImg from '@/assets/momo_qr.jpg';
import bankQrImg from '@/assets/bank_qr.jpg';

const DonationModal: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<'momo' | 'bank'>('momo');
  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    const today = new Date().toDateString();
    const lastPopupDate = localStorage.getItem('lastDonationPopupDate');

    if (lastPopupDate !== today) {
      setIsOpen(true);
      localStorage.setItem('lastDonationPopupDate', today);
    }

    const handleManualOpen = () => setIsOpen(true);
    window.addEventListener('open-donation-modal', handleManualOpen);

    return () => {
      window.removeEventListener('open-donation-modal', handleManualOpen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const copySTK = () => {
    navigator.clipboard.writeText("05667788001").then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl relative p-6 md:p-8 animate-[scaleIn_0.2s_ease-out] font-sans">

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 font-bold text-2xl leading-none cursor-pointer transition-colors"
        >
          &times;
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 mb-2">☕ Buy me a coffee</h3>
          <p className="text-sm text-slate-500 leading-relaxed px-2">
            If you find this tool a time-saving tool, please treat me to a cup of coffee!
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('momo')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'momo'
              ? 'bg-white text-[#d82d8b] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            MoMo Wallet
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'bank'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Bank Transfer
          </button>
        </div>

        {activeTab === 'momo' && (
          <div className="text-center animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white p-2 inline-block rounded-2xl border border-slate-200 shadow-sm mb-3">
              <img src={momoImg} alt="Momo QR" className="w-[200px] h-auto rounded-xl object-contain" />
            </div>
            <p className="text-[13px] text-slate-500">
              Scan the code via the <strong className="text-[#d82d8b]">MoMo app</strong> or your bank's app.
            </p>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center">
              <div className="bg-white p-2 inline-block rounded-2xl border border-slate-200 shadow-sm mb-4">
                <img src={bankQrImg} alt="Bank QR" className="w-[180px] h-auto rounded-xl object-contain" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-[13px]">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">Bank branch:</span>
                <strong className="text-slate-800 uppercase">TPBank Binh Thanh</strong>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">Account holder:</span>
                <strong className="text-slate-800 uppercase">Phạm Tuấn Kiệt</strong>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Account number:</span>
                <div className="flex items-center gap-2">
                  <strong className="text-teal-600 text-[15px]">05667788001</strong>
                  <button
                    onClick={copySTK}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${isCopied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                  >
                    {isCopied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default DonationModal;
