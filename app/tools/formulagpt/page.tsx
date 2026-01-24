// app/tools/formulagpt/page.tsx
"use client";

import { useState } from "react";

const subjects = [
  { 
    id: "physics", 
    name: "Physics", 
    icon: "⚛️", 
    gradient: "from-blue-500 to-cyan-500"
  },
  { 
    id: "chemistry", 
    name: "Chemistry", 
    icon: "🧪", 
    gradient: "from-green-500 to-emerald-500"
  },
  { 
    id: "mathematics", 
    name: "Mathematics", 
    icon: "📐", 
    gradient: "from-purple-500 to-pink-500"
  },
  { 
    id: "biology", 
    name: "Biology", 
    icon: "🧬", 
    gradient: "from-emerald-500 to-teal-500"
  },
];

const examTypes = [
  { id: "jee", name: "JEE Main/Advanced", icon: "🎯" },
  { id: "neet", name: "NEET", icon: "🏥" },
  { id: "boards", name: "Class 11/12 Boards", icon: "📚" },
  { id: "general", name: "General", icon: "✨" },
];

export default function FormulaGPT() {
  const [topic, setTopic] = useState("");
  const [formulas, setFormulas] = useState<Array<{formula: string, trick: string}>>([]);
  const [allFormulas, setAllFormulas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("physics");
  const [selectedExam, setSelectedExam] = useState("jee");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAllIndex, setCopiedAllIndex] = useState<number | null>(null);
  const [showSubjects, setShowSubjects] = useState(true);
  const [activeTab, setActiveTab] = useState<"important" | "all">("important");

  async function generateFormulas() {
    if (!topic.trim()) {
      alert("Please enter a topic or chapter name");
      return;
    }

    setLoading(true);
    setFormulas([]);
    setAllFormulas([]);

    const subject = subjects.find(s => s.id === selectedSubject);
    const exam = examTypes.find(e => e.id === selectedExam);

    const res = await fetch("/api/formulagpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        topic,
        subject: selectedSubject,
        exam: selectedExam,
        subjectName: subject?.name,
        examName: exam?.name
      }),
    });

    const data = await res.json();
    setFormulas(data.formulas || []);
    setAllFormulas(data.allFormulas || []);
    setLoading(false);
    setShowSubjects(false);
  }

  function copyFormula(formula: string, index: number) {
    navigator.clipboard.writeText(formula);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function copyAllFormula(formula: string, index: number) {
    navigator.clipboard.writeText(formula);
    setCopiedAllIndex(index);
    setTimeout(() => setCopiedAllIndex(null), 2000);
  }

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            FormulaGPT
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Get accurate formulas for JEE, NEET, and Board Exams
          </p>
        </div>

        {/* Subject Selection */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs sm:text-sm font-semibold text-gray-700">
              Select Subject
            </label>
            {!showSubjects && formulas.length > 0 && (
              <button
                onClick={() => setShowSubjects(!showSubjects)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95"
              >
                Change
              </button>
            )}
          </div>
          
          {showSubjects && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`relative group overflow-hidden rounded-xl p-3 sm:p-4 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    selectedSubject === subject.id
                      ? 'ring-4 ring-indigo-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} opacity-90`}></div>
                  <div className="relative">
                    <div className="text-3xl sm:text-4xl mb-1">{subject.icon}</div>
                    <div className="text-white text-[10px] sm:text-xs font-semibold leading-tight">
                      {subject.name}
                    </div>
                  </div>
                  {selectedSubject === subject.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedSubjectData && (
            <div className={`bg-gradient-to-r ${selectedSubjectData.gradient} p-3 sm:p-4 rounded-xl text-white text-xs sm:text-sm mb-4`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">{selectedSubjectData.icon}</span>
                <div>
                  <div className="font-bold">{selectedSubjectData.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exam Type Selection */}
        <div className="mb-4">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
            Exam Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {examTypes.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam.id)}
                className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                  selectedExam === exam.id
                    ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-200 scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                }`}
              >
                <div className="text-lg mb-1">{exam.icon}</div>
                <div className="text-[10px] sm:text-xs leading-tight">{exam.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Topic Input */}
        <div className="mb-4">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
            Enter Topic or Chapter Name
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Kinematics, Thermodynamics, Quadratic Equations..."
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            onKeyPress={(e) => e.key === 'Enter' && generateFormulas()}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateFormulas}
          disabled={loading}
          className={`w-full bg-gradient-to-r ${selectedSubjectData?.gradient} text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Formulas...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl sm:text-2xl">{selectedSubjectData?.icon}</span>
              <span>Generate Formulas</span>
            </span>
          )}
        </button>

        {/* Results */}
        {formulas.length > 0 && (
          <div className="mt-6 sm:mt-8">
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("important")}
                className={`flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                  activeTab === "important"
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📌 Important Formulas
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                  activeTab === "all"
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📚 All Formulas
              </button>
            </div>

            {/* Important Formulas Tab */}
            {activeTab === "important" && (
              <div className="space-y-3 max-h-[50vh] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                  Important Formulas for {topic}
                </h2>
                {formulas.map((item, i) => (
                  <div
                    key={i}
                    className="group bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 border border-gray-200 rounded-xl p-3 sm:p-4 transition-all duration-300 hover:shadow-md hover:border-indigo-300"
                  >
                    <div className="flex items-start gap-2 sm:gap-3 mb-3">
                      <span className="text-indigo-600 font-bold text-sm sm:text-base flex-shrink-0 mt-1">
                        {i + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900 font-semibold text-sm sm:text-base mb-3">
                          {item.formula}
                        </p>
                        
                        {/* Trick to remember section */}
                        {item.trick && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 rounded">
                            <p className="text-yellow-900 font-semibold text-xs sm:text-sm mb-1">
                              💡 Trick to remember:
                            </p>
                            <p className="text-yellow-800 text-xs sm:text-sm leading-relaxed">
                              {item.trick}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyFormula(item.formula, i)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                        copiedIndex === i
                          ? 'bg-green-500 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 sm:opacity-0 sm:group-hover:opacity-100'
                      }`}
                    >
                      {copiedIndex === i ? '✓ Copied!' : 'Copy Formula'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* All Formulas Tab */}
            {activeTab === "all" && (
              <div className="space-y-2 max-h-[50vh] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                  All Formulas for {topic}
                </h2>
                {allFormulas.map((formula, i) => (
                  <div
                    key={i}
                    className="group flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 hover:shadow-md hover:border-indigo-300"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="text-indigo-600 font-bold text-xs sm:text-sm flex-shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-gray-800 font-semibold text-sm sm:text-base truncate">
                        {formula}
                      </span>
                    </div>
                    <button
                      onClick={() => copyAllFormula(formula, i)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex-shrink-0 ml-2 ${
                        copiedAllIndex === i
                          ? 'bg-green-500 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 sm:opacity-0 sm:group-hover:opacity-100'
                      }`}
                    >
                      {copiedAllIndex === i ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setFormulas([]);
                setAllFormulas([]);
                setShowSubjects(true);
                setTopic("");
                setActiveTab("important");
              }}
              className="w-full mt-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all active:scale-95"
            >
              🔄 Generate New
            </button>
          </div>
        )}
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
          background: #6366f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
      `}</style>
    </div>
  );
}