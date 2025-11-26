import React, { useState } from 'react';

// Define expected types locally since we don't have the types.ts file
type UserRole = 'patient' | 'doctor';
interface Patient {
    id: string;
    name: string;
    dob: string;
    gender: string; // <--- ADDED GENDER
    address: string;
    primaryLanguage: string;
}

interface AuthProps {
    role: UserRole;
    onLogin: (patient?: Patient) => void;
    onBack: () => void;
}

export default function Auth({ role, onLogin, onBack }: AuthProps) {
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    // --- ADDED STATE VARIABLES FOR PATIENT DETAILS ---
    const [patientDOB, setPatientDOB] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [patientLanguage, setPatientLanguage] = useState('');
    // ----------------------------------------------------
    const [error, setError] = useState('');

    const isPatient = role === 'patient';
    const title = isPatient ? 'Patient Login / Registration' : 'Doctor Login';
    const buttonText = isPatient ? 'Access Patient Dashboard' : 'Access Clinical Dashboard';

    const handleLoginAttempt = () => {
        setError('');
        if (isPatient) {
            // Check all required fields for patient registration/login
            if (!userId.trim() || !userName.trim() || !patientDOB.trim() || !patientGender.trim() || !patientLanguage.trim()) {
                setError('Please enter your ID, Name, Date of Birth, Gender, and Primary Language.');
                return;
            }
            
            // Mock successful login: Create a structured Patient object using the state data
            const mockPatient: Patient = {
                id: userId.trim(),
                name: userName.trim(),
                dob: patientDOB.trim(), // Actual DOB from input
                gender: patientGender.trim(), // Actual Gender from input
                address: '101 Health Lane, Metro City', // Mocked address (can be added later)
                primaryLanguage: patientLanguage.trim() // Actual Language from input
            };

            onLogin(mockPatient); // Pass patient object
        } else {
            // Doctor login logic 
            if (!userId.trim()) {
                setError('Please enter your Doctor ID.');
                return;
            }
            onLogin(); // Pass no patient object for doctor role
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 rounded-3xl p-10 shadow-2xl border border-slate-700">
                
                {/* Back Button */}
                <button 
                    onClick={onBack} 
                    className="flex items-center text-slate-400 hover:text-indigo-400 mb-6 transition"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Role Selection
                </button>

                <h1 className="text-3xl font-bold text-white mb-6 border-b border-indigo-700 pb-3">{title}</h1>

                <div className="space-y-4">
                    
                    {/* ID Field (Required for both) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            {isPatient ? 'Patient ID / Hospital File Number' : 'Doctor License / Staff ID'}
                        </label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder={isPatient ? '123456789' : 'DR-98765'}
                            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-xl border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Patient Details Fields (Only for Patient) */}
                    {isPatient && (
                        <>
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="ENTER PATIENT'S NAME"
                                    className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-xl border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={patientDOB}
                                    onChange={(e) => setPatientDOB(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-xl border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            </div>

                            {/* Gender (Select Dropdown) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Gender
                                </label>
                                <select
                                    value={patientGender}
                                    onChange={(e) => setPatientGender(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-xl border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition"
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Primary Language */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Primary Language
                                </label>
                                <select
                                    value={patientLanguage}
                                    onChange={(e) => setPatientLanguage(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-xl border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition"
                                >
                                    <option value="" disabled>Select Primary Language</option>
                                    <option value="Hindi">Hindi</option>
                                    <option value="Telugu">Telugu</option>
                                    <option value="Odia">Odia</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-400 p-3 bg-red-900/30 rounded-lg border border-red-800">
                        {error}
                    </p>
                )}

                {/* Login Button */}
                <button
                    onClick={handleLoginAttempt}
                    className="w-full mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-indigo-900/50 hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    {buttonText}
                </button>
            </div>
        </div>
    );
}