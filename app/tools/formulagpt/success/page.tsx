export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your FormulaGPT Pro is activated for 30 days.
        </p>

        <a
          href="/tools/formulagpt"
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold"
        >
          Go Back to FormulaGPT
        </a>
      </div>
    </div>
  );
}
