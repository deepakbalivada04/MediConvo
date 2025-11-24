
import React, { useState } from 'react';
import { Language, Patient } from '../types';

interface LoginProps {
  onLogin: (patient: Patient) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [patientId, setPatientId] = useState('');
  const [language, setLanguage] = useState<Language>(Language.TELUGU);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  // Support both standard process.env (Cloud/Node) and Vite's import.meta.env (Local Dev)
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
        setIsApiKeyModalOpen(true);
        return;
    }
    if (!patientId.trim()) return;

    // Mock patient data generation
    const mockPatient: Patient = {
      id: patientId,
      name: `Patient ${patientId}`,
      age: Math.floor(Math.random() * 60) + 20,
      primaryLanguage: language,
      registeredAt: new Date().toISOString()
    };

    onLogin(mockPatient);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MedConvo</h1>
            <p className="text-slate-500 mt-2">Doctor's Access Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Patient ID</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g., P-1024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Primary Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
            >
              {Object.values(Language).filter(l => l !== Language.ENGLISH).map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-colors"
          >
            Start Session
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by OkayLabs
        </p>
      </div>

      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
                <h3 className="text-lg font-bold text-red-600 mb-2">Missing API Key</h3>
                <p className="text-slate-600 mb-4">
                    The application requires an API Key to function. 
                    Please ensure the environment is configured correctly (or add <code>VITE_API_KEY</code> to your .env file locally).
                </p>
                <button 
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="w-full bg-slate-200 text-slate-800 py-2 rounded hover:bg-slate-300"
                >
                    Close
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Login;
