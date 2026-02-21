import { useState } from 'react';
import { Heart, X } from 'lucide-react';

const METHODS = [
  {
    key: 'gcash',
    label: 'GCash',
    color: 'bg-green-500 hover:bg-green-600',
    qr: '/gcash-qr.png',
  },
  {
    key: 'paymaya',
    label: 'PayMaya',
    color: 'bg-blue-500 hover:bg-blue-600',
    qr: '/paymaya-qr.png',
  },
  {
    key: 'paypal',
    label: 'PayPal',
    color: 'bg-yellow-500 hover:bg-yellow-600',
    url: 'https://paypal.me/mlparaiso',
  },
];

export default function DonateSection() {
  const [openQr, setOpenQr] = useState(null); // 'gcash' | 'paymaya' | null

  const active = METHODS.find(m => m.key === openQr);

  return (
    <>
      {/* QR Modal */}
      {openQr && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpenQr(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 max-w-xs w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800">{active.label} QR Code</p>
              <button onClick={() => setOpenQr(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <img src={active.qr} alt={`${active.label} QR`} className="w-full rounded-lg border border-gray-100" />
            <p className="text-xs text-gray-400 mt-3">Screenshot this QR and scan with {active.label} app</p>
          </div>
        </div>
      )}

      {/* Donate Section */}
      <div className="border-t border-gray-200 pt-5 mt-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1.5 text-rose-500">
            <Heart size={15} className="fill-rose-500" />
            <span className="text-sm font-bold">Support Our Ministry</span>
          </div>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            All donations go to{' '}
            <a
              href="https://www.facebook.com/JalajalaBibleBaptistChurch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              Jalajala Bible Baptist Church
            </a>
            . Thank you for your generosity! 🙏
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {METHODS.map(method => (
              <button
                key={method.key}
                onClick={() => {
                  if (method.url) {
                    window.open(method.url, '_blank', 'noopener,noreferrer');
                  } else {
                    setOpenQr(method.key);
                  }
                }}
                className={`${method.color} text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
