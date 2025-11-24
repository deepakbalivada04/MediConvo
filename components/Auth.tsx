import React, { useState } from 'react';
import { Language, Patient, UserRole } from '../types';

interface AuthProps {
  role: UserRole;
  onLogin: (patient?: Patient) => void;
  onBack: () => void;
}

const Auth: React.FC<AuthProps> = ({ role, onLogin, onBack }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [patientId, setPatientId] = useState('');
  
  // Registration State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [language, setLanguage] = useState<Language>(Language.TELUGU);

  // Mock doctor login
  const [docCode, setDocCode] = useState('');

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
        if(patientId.trim().length < 3) {
            alert("Please enter a valid Patient ID");
            return;
        }
        // Mock fetching existing patient
        const mockPatient: Patient = {
            id: patientId,
            name: 'Existing Patient', // In real app, fetch from DB
            age: 45,
            primaryLanguage: Language.TELUGU,
            registeredAt: new Date().toISOString()
        };
        onLogin(mockPatient);
    } else {
        // Register
        if (!name || !age) return;
        const newId = 'PID-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const newPatient: Patient = {
            id: newId,
            name: name,
            age: parseInt(age),
            primaryLanguage: language,
            registeredAt: new Date().toISOString()
        };
        // In a real app, save this to DB
        alert(`Registration Successful! Your Patient ID is: ${newId}. Please save this.`);
        onLogin(newPatient);
    }
  };

  const handleDoctorSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Simple mock auth
      onLogin();
  };

  // --- DOCTOR LOGIN VIEW (Premium Cream Theme) ---
  if (role === 'doctor') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] p-6 relative overflow-hidden font-sans">
            
             {/* Subtle Background Texture */}
             <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2D2D2D 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-[#C5A059]/10 w-full max-w-2xl relative z-10 border border-white">
                 <button onClick={onBack} className="absolute top-8 left-8 text-[#888] hover:text-[#2D2D2D] p-2 rounded-full transition flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center group-hover:border-[#2D2D2D]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </button>
                
                <div className="text-center mb-10 mt-6">
                    <div className="w-16 h-16 bg-[#2D2D2D] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#2D2D2D]/20">
                        <svg className="w-8 h-8 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <h2 className="text-4xl font-serif font-bold text-[#2D2D2D] mb-2">MedConvo</h2>
                    <p className="text-[#666] font-medium text-sm uppercase tracking-wide">Physician Access Portal</p>
                </div>

                <form onSubmit={handleDoctorSubmit} className="space-y-8 max-w-sm mx-auto">
                    <div>
                        <label className="block text-xs font-bold text-[#444] uppercase tracking-wide mb-3">Access Code</label>
                        <input 
                            type="password" 
                            value={docCode}
                            onChange={e => setDocCode(e.target.value)}
                            placeholder="Enter secure code"
                            className="w-full px-6 py-4 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] focus:border-[#C5A059] focus:ring-0 text-[#2D2D2D] outline-none transition placeholder-[#999]"
                        />
                    </div>
                    <button type="submit" className="w-full bg-[#2D2D2D] hover:bg-black text-[#F9F7F2] font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 tracking-wide">
                        Enter Dashboard
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // --- PATIENT/TRANSCRIPTION PORTAL VIEW (Premium Cream Theme) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] p-6 relative overflow-hidden font-sans">
      
      {/* Subtle Background Texture */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2D2D2D 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-[#C5A059]/10 w-full max-w-2xl relative z-10 border border-white">
        <button onClick={onBack} className="absolute top-8 left-8 text-[#888] hover:text-[#2D2D2D] p-2 rounded-full transition flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center group-hover:border-[#2D2D2D]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </button>
        
        <div className="text-center mb-10 mt-6">
            <div className="w-16 h-16 bg-[#2D2D2D] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#2D2D2D]/20">
                <svg className="w-8 h-8 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h2 className="text-4xl font-serif font-bold text-[#2D2D2D] mb-2">MedConvo</h2>
            <p className="text-[#666] font-medium text-sm uppercase tracking-wide">Patient Transcription Portal</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-[#F5F5F5] rounded-xl mb-8 w-full max-w-md mx-auto">
            <button 
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all shadow-sm ${authMode === 'login' ? 'bg-white text-[#2D2D2D]' : 'text-[#888] hover:text-[#555]'}`}
            >
                Existing Patient
            </button>
            <button 
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all shadow-sm ${authMode === 'register' ? 'bg-white text-[#2D2D2D]' : 'text-[#888] hover:text-[#555]'}`}
            >
                New Registration
            </button>
        </div>

        <form onSubmit={handlePatientSubmit} className="space-y-6 max-w-md mx-auto">
            {authMode === 'login' ? (
                <div>
                    <label className="block text-xs font-bold text-[#444] uppercase tracking-wide mb-3">Patient ID</label>
                    <input 
                        type="text" 
                        value={patientId}
                        onChange={e => setPatientId(e.target.value)}
                        placeholder="e.g. PID-X9Y2"
                        className="w-full px-6 py-4 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] focus:border-[#C5A059] focus:ring-0 text-[#2D2D2D] outline-none transition placeholder-[#999]"
                        required
                    />
                    <p className="text-xs text-[#888] mt-3 pl-1 font-medium">Enter the ID provided during your first visit.</p>
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-xs font-bold text-[#444] uppercase tracking-wide mb-3">Full Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter patient name"
                            className="w-full px-6 py-4 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] focus:border-[#C5A059] focus:ring-0 text-[#2D2D2D] outline-none transition placeholder-[#999]"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-[#444] uppercase tracking-wide mb-3">Age</label>
                            <input 
                                type="number" 
                                value={age}
                                onChange={e => setAge(e.target.value)}
                                placeholder="Age"
                                className="w-full px-6 py-4 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] focus:border-[#C5A059] focus:ring-0 text-[#2D2D2D] outline-none transition placeholder-[#999]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#444] uppercase tracking-wide mb-3">Language</label>
                            <div className="relative">
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as Language)}
                                    className="w-full px-6 py-4 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] focus:border-[#C5A059] focus:ring-0 text-[#2D2D2D] outline-none transition appearance-none"
                                >
                                    {Object.values(Language).filter(l => l !== Language.ENGLISH).map((lang) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#888]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <button type="submit" className="w-full bg-[#2D2D2D] hover:bg-black text-[#F9F7F2] font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 tracking-wide mt-2">
                {authMode === 'login' ? 'Start Consultation' : 'Register & Start'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;