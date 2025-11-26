import React, { useState } from 'react';
import Landing from './components/Landing';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import LiveTranslator from './components/LiveTranslator';
import { ConsultationRecord, DashboardStats, Patient, ChatMessage, UserRole } from './types';
import { playTextToSpeech, transcribeAudioNote } from './services/geminiService';
// Import jsPDF
import { jsPDF } from 'jspdf'; // <--- ADD THIS IMPORT

export default function App() {
  // App State
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'live' | 'record_detail'>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  // Removed mock patient data from initialization as requested:
  const [currentUser, setCurrentUser] = useState<Patient | null>(null);
  
  // Data State (Mock Database)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<ConsultationRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  // Stats - Derived dynamically in real app, but we keep state for simplicity
  const [stats, setStats] = useState<DashboardStats>({
    totalConsultations: 0,
    avgDurationMinutes: 0,
    languageDistribution: [
        { name: 'Telugu', value: 0 },
        { name: 'Hindi', value: 0 },
        { name: 'Odia', value: 0 }
    ],
    dailyActivity: []
  });

  // Feature State
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // --- MODIFIED HANDLER FOR PDF DOWNLOAD (Includes enhanced Vitals/Rx parsing) ---
  const handleDownloadPdf = (summary: string, recordId: string) => {
      
      // --- Dynamic Data ---
      const patientName = currentUser?.name || 'N/A';
      const patientDOB = currentUser?.dob || 'N/A';
      const patientAge = patientDOB !== 'N/A' ? (new Date().getFullYear() - new Date(patientDOB).getFullYear()).toString() : 'N/A';
      const patientGender = currentUser?.gender || 'N/A'; 
      const currentDate = new Date().toLocaleDateString('en-US');
      
      // Placeholder data (Doctor's Credentials)
      const prescriberName = currentUser ? (currentUser.id === 'DR-98765' ? 'Dr. Smith (Cardiologist)' : 'PRESCRIBER NAME') : 'N/A Doctor';
      const prescriberLicense = 'MD-A12345';
      
      // Conditional data setup
      const hasPrescription = true; 
      
      // *** START ENHANCED TEXT PARSING FOR VITALS AND MEDICATION ***
      const summaryLower = summary.toLowerCase();
      let clinicalSummaryText = summary;
      let medicationText = '';
      
      // 1. Vitals Extraction (using basic regex for common patterns)
      const getVital = (regex: RegExp, defaultVal: string) => {
          const match = summaryLower.match(regex);
          return match ? match[1].trim() : defaultVal;
      };

      const extractedVitals = {
        SpO2: getVital(/(spo2|saturation)\s*is\s*(\d{1,3}[\s%]*)|(spo2|saturation)\s*at\s*(\d{1,3}[\s%]*)/, '________%'),
        BP: getVital(/(blood\s*pressure|b\.p\.|bp)\s*is\s*(\d{2,3}\/\d{2,3})/, '________mmHg'),
        Pulse: getVital(/(pulse|heart\s*rate)\s*is\s*(\d{1,3})/, '________bpm'),
        Height: getVital(/(height)\s*is\s*([\d\.]+\s*(cm|in))/, '________ cm/in'),
        Weight: getVital(/(weight)\s*is\s*([\d\.]+\s*(kg|lb))/, '________ kg/lb'),
      };
      
      // Fix Pulse and SpO2 if units weren't captured correctly
      if (!extractedVitals.SpO2.includes('%') && extractedVitals.SpO2 !== '________%') extractedVitals.SpO2 += '%';
      if (!extractedVitals.Pulse.includes('bpm') && extractedVitals.Pulse !== '________bpm') extractedVitals.Pulse = extractedVitals.Pulse.replace(/[^\d\.]/g, '') + ' bpm';


      // 2. Medication Separation Logic (Prioritize common markers like RX, MEDS, etc.)
      const medKeywords = ['medication:', 'rx:', 'prescription:', 'take the following:'];
      let splitIndex = -1;
      
      for (const keyword of medKeywords) {
        const index = summaryLower.indexOf(keyword);
        if (index > -1 && (splitIndex === -1 || index < splitIndex)) {
          splitIndex = index;
          break; // Found the earliest point
        }
      }

      if (splitIndex > -1) {
        // Split the summary
        medicationText = summary.substring(splitIndex).trim();
        clinicalSummaryText = summary.substring(0, splitIndex).trim();

        // Remove the key marker from the medication text for cleaner printing
        medicationText = medicationText.replace(/^(Medication:|Rx:|Prescription:|Take the following:)/i, '').trim();
      }
      // *** END ENHANCED TEXT PARSING ***
      

      // Initialize jsPDF
      const doc = new jsPDF();
      let yPos = 10; // Starting Y position

      // 1. HOSPITAL HEADER BLANK SPACE (First 10 lines)
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("", 10, 15);
      doc.setTextColor(0);
      doc.setFontSize(10); 
      yPos += 80;
      
      // 2. DATE AND RECORD ID
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${currentDate}`, 150, yPos);
      doc.text(`Record ID: ${recordId}`, 150, yPos + 5);
      doc.line(10, yPos + 10, 200, yPos + 10); 
      yPos += 15;
      
      // 3. PATIENT DEMOGRAPHICS
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Demographics", 10, yPos);
      yPos += 7;
      
      doc.setFont("helvetica", "normal"); 
      doc.text(`Name: ${patientName}`, 10, yPos);
      doc.text(`Age: ${patientAge}`, 70, yPos);
      doc.text(`Gender: ${patientGender}`, 100, yPos);
      yPos += 7;

      // 4. VITAL SIGNS (AUTOMATICALLY FILLED FROM PARSED DATA)
      doc.setFont("helvetica", "bold");
      doc.text("Vitals:", 10, yPos);
      doc.setFont("helvetica", "normal"); 
      
      doc.text(`Height: ${extractedVitals.Height}`, 40, yPos);
      doc.text(`Weight: ${extractedVitals.Weight}`, 100, yPos);
      yPos += 7;

      doc.text(`SpO2: ${extractedVitals.SpO2}`, 40, yPos);
      doc.text(`BP: ${extractedVitals.BP}`, 80, yPos);
      doc.text(`Pulse: ${extractedVitals.Pulse}`, 130, yPos);
      yPos += 15; 

      // Draw a line separator
      doc.line(10, yPos, 200, yPos); 
      yPos += 10;

      // 5. CLINICAL DATA (Only the Clinical Summary, NO Medications)
      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis & Assessment:", 10, yPos);
      
      doc.setFont("helvetica", "normal"); 
      yPos += 7;
      
      const clinicalLines = doc.splitTextToSize(clinicalSummaryText, 180);
      doc.text(clinicalLines, 15, yPos);
      yPos += (clinicalLines.length * 5) + 10;
      
      doc.line(10, yPos - 5, 200, yPos - 5); 

      // 6. PRESCRIPTION (RX - Filled with Parsed Medication Text)
      if (hasPrescription) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.text("Rx", 10, yPos); 
          doc.setFontSize(10);
          yPos += 8;

          doc.setFont("helvetica", "normal"); 
          if (medicationText.length > 0) {
            // Print Parsed Medications
            const medicationLines = doc.splitTextToSize(medicationText, 180);
            doc.text(medicationLines, 15, yPos);
            yPos += (medicationLines.length * 5) + 5;
          } else {
            doc.setFont("helvetica", "italic");
            doc.text("Medications :", 15, yPos);
            yPos += 5;
            // Blank lines for handwritten prescription
            for (let i = 0; i < 4; i++) {
              doc.line(15, yPos + (i * 5), 180, yPos + (i * 5)); 
            }
            yPos += 25; 
          }
      }
      
      // 7. FOOTER/SIGNATURE & PRESCRIBER INFO
      doc.line(130, yPos, 200, yPos); 
      yPos += 5;
      
      doc.setFont("helvetica", "normal"); 
      doc.text(`Prescriber's Signature`, 140, yPos);
      yPos += 5;


      // Legal Footer Text
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`This document is generated by the MedConvo AI Medical Translation System.`, 10, doc.internal.pageSize.height - 10);
      doc.text(`THANK YOU`, 10, doc.internal.pageSize.height - 5);

      // Save the PDF
      doc.save(`PRESCRIPTION-${recordId}.pdf`); 
  };
  // ------------------------------------

  // Navigation Handlers (No change)
  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    setView('auth');
  };

  const handleLogin = (patient?: Patient) => {
    if (userRole === 'patient' && patient) {
      setCurrentUser(patient);
      // Add to local "DB" if not exists
      if (!patients.find(p => p.id === patient.id)) {
          setPatients(prev => [...prev, patient]);
      }
      setView('dashboard');
    } else if (userRole === 'doctor') {
      setCurrentUser({ id: 'DR-98765', name: 'Dr. Smith (Demo)', dob: '', gender: 'N/A', address: 'N/A', primaryLanguage: 'English' });
      setView('dashboard');
    }
  };

  const handleBackToLanding = () => {
      setView('landing');
      setUserRole(null);
      setCurrentUser(null);
  };

  const handleStartLiveSession = () => {
    setView('live');
  };

  const handleSessionEnd = (transcript: ChatMessage[], summary: string) => {
    if (!currentUser && userRole === 'patient') {
        setView('dashboard');
        return;
    }
    
    const patientId = currentUser ? currentUser.id : 'Unknown'; 
    
    const newRecord: ConsultationRecord = {
      id: `CONS-${Date.now()}`,
      patientId: patientId,
      date: new Date().toISOString(),
      summary,
      transcript,
      status: 'completed'
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Update Stats
    setStats(prev => ({
        ...prev,
        totalConsultations: prev.totalConsultations + 1,
        languageDistribution: prev.languageDistribution.map(l => 
            (currentUser && l.name === currentUser.primaryLanguage) 
            ? { ...l, value: l.value + 1 } 
            : l
        )
    }));
    
    setView('dashboard');
  };

  const handleViewConsultation = (id: string) => {
    setSelectedRecordId(id);
    setView('record_detail');
  };
  
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsTranscribing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          try {
              const text = await transcribeAudioNote(base64String, file.type);
              setTranscriptionResult(text);
          } catch (err) {
              alert("Failed to transcribe");
          } finally {
              setIsTranscribing(false);
          }
      }; // <-- The missing parenthesis was here
      reader.readAsDataURL(file);
  }; // <-- Removed an extra closing parenthesis here

  // Render Views (JSX structure cleaned)
  if (view === 'landing') {
    return <Landing onSelectRole={handleSelectRole} />;
  }

  if (view === 'auth' && userRole) {
    return <Auth role={userRole} onLogin={handleLogin} onBack={handleBackToLanding} />;
  }

  if (view === 'live' && currentUser) {
    return (
      // LiveTranslator Wrapper (The live view should be dark themed)
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <LiveTranslator 
          patient={currentUser} 
          onSessionEnd={handleSessionEnd}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'record_detail' && selectedRecordId) {
      const record = history.find(r => r.id === selectedRecordId);
      if (!record) return <div className="min-h-screen bg-slate-900 text-white p-8">Record not found</div>;
      
      return (
        // RECORD DETAIL VIEW (Dark Theme & PDF Button Added)
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="max-w-4xl mx-auto bg-slate-800 rounded-3xl p-10 relative border border-slate-700 animate-fade-in-up">
                <button onClick={() => setView('dashboard')} className="absolute top-8 right-8 p-2 bg-slate-700 rounded-full text-slate-400 hover:bg-slate-600 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="mb-8 border-b border-slate-700 pb-6">
                    <h2 className="text-3xl font-bold text-white">Consultation Report</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="bg-slate-700 px-3 py-1 rounded-full text-xs font-mono">ID: {record.id}</span>
                        <span>{new Date(record.date).toLocaleString()}</span>
                    </div>
                </div>
                
                {/* Clinical Summary Block - Indigo Accent */}
                <div className="bg-indigo-900/40 p-8 rounded-3xl border border-indigo-700 mb-8 shadow-inner shadow-indigo-900/50">
                    <h3 className="font-bold text-indigo-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Clinical Summary
                    </h3>
                    <p className="text-indigo-200 whitespace-pre-line leading-relaxed">{record.summary}</p>
                    
                    <div className="flex gap-4 mt-6">
                        {/* 1. Listen to Summary Button */}
                        <button 
                            onClick={() => playTextToSpeech(record.summary, 'Hindi')}
                            className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-500 transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                            Listen to Summary
                        </button>

                        {/* 2. Download PDF Button (New Feature) */}
                        <button 
                            onClick={() => handleDownloadPdf(record.summary, record.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-teal-400 bg-teal-900/50 px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:bg-teal-900/70 transition-all active:scale-95 border border-teal-700"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Prescription PDF
                        </button>
                    </div>
                </div>

                {/* Transcript Block */}
                <div>
                    <h3 className="font-bold text-white mb-6">Consultation Transcript</h3>
                    <div className="space-y-4">
                        {record.transcript.length > 0 ? record.transcript.map((t, i) => (
                            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                    t.role === 'user' 
                                    ? 'bg-slate-700 text-white rounded-tr-none' 
                                    : 'bg-slate-900 border border-slate-700 text-slate-300 rounded-tl-none'
                                }`}>
                                    <span className="font-bold block text-xs mb-1 opacity-70 tracking-wider text-teal-400">{t.role.toUpperCase()}</span>
                                    {t.text}
                                </div>
                            </div>
                        )) : <p className="text-slate-600 italic text-center py-8">No detailed transcript captured for this session.</p>}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Dashboard View
  return (
    // DASHBOARD WRAPPER (Dark Theme)
    <div className="min-h-screen bg-slate-900">
      {/* Navigation (No Change) */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
                {/* Logo/Icon - Indigo/Teal Accent */}
                <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/50">
                  <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div>
                    <span className="font-bold text-xl text-white tracking-tight block leading-none">MedConvo</span>
                    <span className="text-xs text-slate-400 font-medium">AI Medical Translator</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {userRole === 'patient' && currentUser && (
                    <button 
                        onClick={handleStartLiveSession}
                        className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg shadow-teal-900/50 hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Start Live Session
                    </button>
                )}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-white">{currentUser ? currentUser.name : 'Dr. Smith (Demo)'}</div>
                        <div className="text-xs text-slate-400">{userRole === 'patient' ? 'Patient' : 'Cardiologist'}</div>
                    </div>
                    <button onClick={handleBackToLanding} className="p-2 hover:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard 
            stats={stats} 
            history={history} 
            patients={patients}
            onViewConsultation={handleViewConsultation}
        />

        {/* Upload Audio Section */}
        {userRole === 'doctor' && (
            <div className="mt-10 bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3">
                        {/* Icon - Purple Accent */}
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-900/50 text-purple-400 rounded-2xl mb-4 border border-purple-800">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Audio Transcription</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Upload voice notes from consultations for instant, secure transcription using Gemini Flash 2.5.</p>
                        
                        <label className="mt-6 inline-block cursor-pointer">
                            <span className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-purple-900/50 transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Upload Audio File
                            </span>
                            <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
                        </label>
                    </div>
                    
                    <div className="md:w-2/3 bg-slate-900/50 rounded-2xl border border-slate-700 p-6 min-h-[200px] relative">
                        {isTranscribing ? (
                            // Loading State - Dark Theme
                            (
                              <div className="absolute inset-0 flex items-center justify-center text-purple-400 bg-slate-900/70 backdrop-blur-sm rounded-2xl">
                                <div className="flex items-center gap-3">
                                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  <span className="font-medium">Processing audio...</span>
                                </div>
                              </div>
                            )
                        ) : (
                            transcriptionResult ? (
                                // Result - High Contrast Text
                                (
                                    <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{transcriptionResult}</p>
                                )
                            ) : (
                                // Placeholder - Dark Theme
                                (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                        <p className="text-sm">Transcription results will appear here</p>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}