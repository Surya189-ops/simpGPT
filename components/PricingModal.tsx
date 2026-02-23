"use client";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onUpgradeClick: () => void;
}

export default function PricingModal({
  isOpen,
  onClose,
  isLoggedIn,
  onUpgradeClick,
}: PricingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upgrade to Pro
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Pro Plan */}
        <div className="border-2 border-indigo-500 dark:border-indigo-400 rounded-xl p-6">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pro</h3>
            <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">
              ₹49
            </div>
            <span className="text-lg text-gray-600 dark:text-gray-300">/month</span>
          </div>

          <ul className="space-y-3 mb-6 text-gray-700 dark:text-gray-200">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Unlimited formula generation</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Premium "When to Use" rules</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Full decision insights</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Memory tricks for all subjects</span>
            </li>
          </ul>

          <button
            onClick={() => {
              onClose();
              onUpgradeClick();
            }}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all"
          >
            Upgrade Now
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          {isLoggedIn
            ? "Upgrade instantly and unlock premium insights."
            : "Login to unlock Pro features."}
        </p>
      </div>
    </div>
  );
}