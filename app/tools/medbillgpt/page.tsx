// app/tools/medbillgpt/page.tsx
"use client";

import { useState } from "react";

export default function MedBillGPT() {
  const [billText, setBillText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  async function analyzeBill() {
    if (!billText.trim() && !uploadedFile) {
      alert("Please enter bill details or upload a bill image");
      return;
    }

    setLoading(true);
    setExplanation("");

    const formData = new FormData();
    formData.append("billText", billText);
    if (uploadedFile) {
      formData.append("file", uploadedFile);
    }

    const res = await fetch("/api/medbillgpt", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setExplanation(data.explanation || "");
    setLoading(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setUploadedFile(file);
      } else {
        alert("Please upload an image file (PNG, JPG, etc.)");
        e.target.value = "";
      }
    }
  }

  function copyExplanation() {
    navigator.clipboard.writeText(explanation);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
            MedBillGPT
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Understand your US medical bills in simple language
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-blue-900 text-sm sm:text-base mb-1">
                How it works
              </h3>
              <p className="text-blue-800 text-xs sm:text-sm">
                Upload a photo of your medical bill or paste the text below. I'll explain each charge in simple terms and suggest questions to ask your provider.
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
            Upload Bill Image (Optional)
          </label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          {uploadedFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <span>✓</span>
              <span>{uploadedFile.name}</span>
              <button
                onClick={() => setUploadedFile(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-gray-500 text-sm my-3">OR</div>

        {/* Text Input */}
        <div className="mb-4">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
            Paste Bill Text
          </label>
          <textarea
            value={billText}
            onChange={(e) => setBillText(e.target.value)}
            placeholder="Paste your medical bill details here...&#10;&#10;Example:&#10;Emergency Room Visit - $1,500&#10;Blood Test - $250&#10;CT Scan - $2,800&#10;..."
            className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            rows={8}
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyzeBill}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing Bill...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl sm:text-2xl">🏥</span>
              <span>Analyze My Bill</span>
            </span>
          )}
        </button>

        {/* Results */}
        {explanation && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Bill Explanation
              </h2>
              <button
                onClick={copyExplanation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
              >
                📋 Copy
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-4 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="prose prose-sm sm:prose-base max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm sm:text-base">
                  {explanation}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setExplanation("");
                setBillText("");
                setUploadedFile(null);
              }}
              className="w-full mt-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all active:scale-95"
            >
              🔄 Analyze New Bill
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-bold text-yellow-900 text-xs sm:text-sm mb-1">
                Important Disclaimer
              </h4>
              <p className="text-yellow-800 text-xs sm:text-sm">
                This tool provides general explanations only. It is NOT medical or legal advice. Always verify charges with your healthcare provider and insurance company.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        @media (min-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}