import React from 'react';
import { UserRole } from '../types';

interface LandingProps {
  onSelectRole: (role: UserRole) => void;
}

const Landing: React.FC<LandingProps> = ({ onSelectRole }) => {
  return (
    // Setting height to full screen and using flex centering
    <div className="h-screen flex flex-col items-center justify-center bg-[#F9F7F2] text-[#2D2D2D] relative overflow-hidden font-sans">
      
      {/* Background Glow Effect (Adjusted for Cream Theme) */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-[#EBE4D8] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob-slow"></div>
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-[#F2E8D5] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob-slow animation-delay-4000"></div>

      {/* --- WATERMARK IMAGE --- */}
      <img
          src="/mb_hospitals.jpg" 
          alt="MedConvo Watermark"
          // Watermark opacity slightly reduced to avoid clashing with light bg
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none select-none z-0 mix-blend-multiply" 
      />
      
      {/* Main Content Card (Premium Cream Look) */}
      <div className="relative z-10 w-full max-w-6xl p-20 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-[#D4AF37]/10 border border-[#E5E0D8] animate-fade-in-up">
        
        <div className="text-center mb-12">
          {/* Logo/Icon - Charcoal/Gold Theme */}
          <div className="inline-flex items-center justify-center w-40 h-40 bg-[#2D2D2D] rounded-[3rem] shadow-2xl shadow-[#2D2D2D]/50 mb-8 transition-transform duration-500 hover:scale-105">
            <svg className="w-20 h-20 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
          
          <h1 className="text-7xl font-extrabold text-[#2D2D2D] tracking-tight font-serif">MedConvo</h1>
          
          <p className="text-2xl text-[#666] mt-4 max-w-2xl mx-auto border-t border-[#E5E0D8] pt-4">Real-time cognitive communication platform for seamless doctor-patient dialogue in Indian languages.</p>
        </div>

        {/* Role Selection Grid - Transcription Portal Button */}
        <div className="grid grid-cols-1 w-full mx-auto"> 
          
          <button 
            onClick={() => onSelectRole('patient')} 
            className="group relative bg-[#FFFEFA] hover:bg-[#F2E8D5] p-12 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-[#EAEAEA] text-left overflow-hidden mx-auto max-w-2xl w-full"
          >
            <div className="absolute top-0 right-0 w-10 h-10 bg-[#C5A059] rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-lg"></div>

            <div className="relative z-10 flex items-center gap-8">
              <div className="w-16 h-16 bg-[#2D2D2D] rounded-xl flex items-center justify-center transition-colors duration-300 shadow-xl shadow-[#2D2D2D]/20 flex-shrink-0">
                <svg className="w-10 h-10 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              
              <div>
                <h2 className="text-4xl font-extrabold text-[#2D2D2D] group-hover:text-[#C5A059] mb-1 tracking-wide font-serif">Transcription Portal</h2>
                <p className="text-lg text-[#666] group-hover:text-[#444]">Start consultation and utilize instant translation service.</p>
              </div>
            </div>
          </button>
        </div>
        
        {/* Footer Note */}
        <p className="text-xs text-[#888] mt-10 text-center uppercase tracking-widest">
            Security Protocol Active | Encrypted communication powered by NextGen AI.
        </p>
      </div>

    </div>
  );
};

export default Landing;