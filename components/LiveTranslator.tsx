import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveClient } from '@google/genai';
import { createBlob, decode, decodeAudioData, audioContext, inputAudioContext } from '../services/audioUtils';
import { ChatMessage, Patient } from '../types';
import { generateSummary } from '../services/geminiService';

interface LiveTranslatorProps {
  patient: Patient;
  onSessionEnd: (transcript: ChatMessage[], summary: string) => void;
  onBack: () => void;
}

const LiveTranslator: React.FC<LiveTranslatorProps> = ({ patient, onSessionEnd, onBack }) => {
  const [isLive, setIsLive] = useState(false);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Real-time streaming text
  const [streamingInput, setStreamingInput] = useState('');
  const [streamingOutput, setStreamingOutput] = useState('');
  
  const sessionRef = useRef<LiveClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const currentInputRef = useRef<string>('');
  const currentOutputRef = useRef<string>('');

  // Support both standard process.env (Cloud/Node) and Vite's import.meta.env (Local Dev)
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY || '';

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, streamingInput, streamingOutput]);

  useEffect(() => {
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async () => {
    if (!apiKey) {
      alert("Please configure your API_KEY in the environment (or .env file for local dev).");
      return;
    }

    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey });

      await audioContext.resume();
      await inputAudioContext.resume();

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Strict Instruction for Simultaneous Interpretation
      // Explicitly mentioning Oriya for Odia support
      const targetLanguage = patient.primaryLanguage === 'Odia' ? 'Odia (Oriya)' : patient.primaryLanguage;
      
      const systemInstruction = `
      You are a professional, simultaneous medical interpreter. 
      Your task is to translate spoken audio in real-time between English and ${targetLanguage}.
      
      Rules:
      1. If you hear English, translate it to ${targetLanguage}.
      2. If you hear ${targetLanguage}, translate it to English.
      3. Output ONLY the translated speech audio and the translated text. 
      4. Do NOT add conversational fillers like "Sure", "Okay", "Here is the translation". Just translate.
      5. Maintain the tone, urgency, and emotion of the speaker.
      6. Be precise with medical terminology.
      7. ALWAYS ensure the output transcription text is generated in the target language script or English as appropriate.
      `;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };

      const sessionPromise = ai.live.connect({
        model: config.model,
        config: config.config,
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsLive(true);
            setupAudioInput(sessionPromise);
          },
          onmessage: (msg) => handleMessage(msg),
          onclose: () => {
             console.log("Session closed");
             setIsLive(false);
             setStatus('idle');
          },
          onerror: (err) => {
            console.error("Session error", err);
            setStatus('error');
            setIsLive(false);
          }
        }
      });
      
      sessionPromise.then(sess => {
          sessionRef.current = sess;
      });

    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const setupAudioInput = (sessionPromise: Promise<LiveClient>) => {
    if (!streamRef.current) return;

    const source = inputAudioContext.createMediaStreamSource(streamRef.current);
    const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for(let i=0; i<inputData.length; i+=10) {
          sum += Math.abs(inputData[i]);
      }
      setAudioLevel(Math.min(sum / (inputData.length/10) * 5, 1)); 

      const blob = createBlob(inputData);
      
      sessionPromise.then(session => {
          session.sendRealtimeInput({ media: blob });
      });
    };

    source.connect(processor);
    processor.connect(inputAudioContext.destination);

    sourceRef.current = source;
    scriptProcessorRef.current = processor;
  };

  const handleMessage = async (message: LiveServerMessage) => {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext);
      
      // Sync timing
      const currentTime = audioContext.currentTime;
      if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      sourcesRef.current.add(source);
      source.onended = () => sourcesRef.current.delete(source);
    }

    const outTrans = message.serverContent?.outputTranscription?.text;
    const inTrans = message.serverContent?.inputTranscription?.text;

    // Update partials
    if (outTrans) {
        currentOutputRef.current += outTrans;
        setStreamingOutput(currentOutputRef.current);
    }
    if (inTrans) {
        currentInputRef.current += inTrans;
        setStreamingInput(currentInputRef.current);
    }

    // Commit to history on turn complete
    if (message.serverContent?.turnComplete) {
      const newItems: ChatMessage[] = [];
      
      if (currentInputRef.current.trim()) {
        newItems.push({
          role: 'user',
          text: currentInputRef.current.trim(),
          timestamp: Date.now()
        });
        currentInputRef.current = '';
        setStreamingInput('');
      }
      if (currentOutputRef.current.trim()) {
        newItems.push({
          role: 'model',
          text: currentOutputRef.current.trim(),
          timestamp: Date.now()
        });
        currentOutputRef.current = '';
        setStreamingOutput('');
      }

      if (newItems.length > 0) {
          setTranscript(prev => [...prev, ...newItems]);
      }
    }
  };

  const stopSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      scriptProcessorRef.current.disconnect();
    }
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (sessionRef.current) {
        sessionRef.current = null;
    }
    setIsLive(false);
    setStatus('idle');
  };

  const handleFinishConsultation = async () => {
    stopSession();
    
    // IMPORTANT: Capture any pending streaming text that hasn't been committed yet
    const finalTranscript = [...transcript];
    if (currentInputRef.current && currentInputRef.current.trim()) {
        finalTranscript.push({ role: 'user', text: currentInputRef.current.trim(), timestamp: Date.now() });
    }
    if (currentOutputRef.current && currentOutputRef.current.trim()) {
        finalTranscript.push({ role: 'model', text: currentOutputRef.current.trim(), timestamp: Date.now() });
    }
    
    // Reset refs after capturing
    currentInputRef.current = '';
    currentOutputRef.current = '';

    const summary = await generateSummary(finalTranscript);
    onSessionEnd(finalTranscript, summary);
  };

  return (
    // Changed bg-slate-950 to bg-[#FDFCF8] (Cream) and text-slate-100 to text-slate-800
    <div className="flex flex-col h-screen w-full bg-[#FDFCF8] text-slate-800 relative overflow-hidden font-sans">
      
      {/* Background Pattern - Subtle dots for professional texture */}
      <div className="absolute inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(#A8A29E 1px, transparent 1px)", backgroundSize: '24px 24px' }}></div>
      
      {/* Header */}
      <div className="relative z-20 bg-white/90 backdrop-blur-md border-b border-stone-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:bg-stone-100 p-2 rounded-full transition text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    {patient.name}
                    {/* ID Badge: Muted professional gray */}
                    <span className="text-xs font-normal px-2 py-1 bg-stone-100 rounded-full text-stone-600 border border-stone-300">{patient.id}</span>
                </h2>
                <div className="flex items-center gap-2 text-sm font-medium text-stone-500 mt-1">
                    <span className="text-teal-700">{patient.primaryLanguage}</span>
                    <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    <span className="text-teal-700">English</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             {status === 'connected' && (
                // Live Badge: Green is universal, but softer
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-green-800 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse-slow"></div>
                    <span className="text-xs font-bold uppercase tracking-wider">Live Translation</span>
                </div>
             )}
        </div>
      </div>

      {/* Content (Chat Area) */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 mx-auto w-full max-w-4xl scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent" ref={scrollRef}>
          
        <div className="space-y-8 pt-4"> 
        {transcript.length === 0 && !streamingInput && !streamingOutput && (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 animate-fade-in">
                <div className="w-24 h-24 bg-white border border-stone-200 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-stone-200/50 relative">
                    <svg className={`w-10 h-10 ${status === 'idle' ? 'text-teal-600 animate-mic-pulse' : 'text-stone-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <p className="text-xl font-serif font-semibold text-stone-800">Awaiting Input</p>
                <p className="text-md text-stone-500 mt-2">Initiate translation to begin the secure interpretation session.</p>
            </div>
        )}
        
        {/* Transcript Bubbles */}
        {transcript.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`max-w-[75%] p-5 rounded-2xl shadow-sm border relative ${
              msg.role === 'user' 
                // User/Source: Dark Navy/Slate for professional contrast against cream
                ? 'bg-slate-800 text-white rounded-tr-sm border-slate-900' 
                // Model/Translation: White card on cream background
                : 'bg-white text-stone-800 rounded-tl-sm border-stone-200 shadow-md'
            }`}>
              <div className={`text-xs uppercase tracking-widest font-bold opacity-80 mb-2 ${msg.role === 'user' ? 'text-slate-300' : 'text-teal-700'}`}>
                  {msg.role === 'user' ? 'SOURCE AUDIO' : 'TRANSLATION'}
              </div>
              <p className="text-base leading-relaxed font-medium">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Streaming Partials - Realtime Feedback */}
        {streamingInput && (
           <div className="flex justify-end animate-fade-in-up">
            <div className="max-w-[75%] p-5 rounded-2xl shadow-sm relative bg-slate-100 text-slate-800 rounded-tr-sm border border-slate-200 opacity-90">
              <div className="text-xs uppercase tracking-widest font-bold opacity-70 mb-2 flex items-center gap-2 text-slate-500">
                  Speaking <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse"></span>
              </div>
              <p className="text-base leading-relaxed italic text-slate-700">{streamingInput}</p>
            </div>
          </div>
        )}
        
        {streamingOutput && (
           <div className="flex justify-start animate-fade-in-up">
            <div className="max-w-[75%] p-5 rounded-2xl shadow-sm relative bg-white border border-stone-200 text-stone-800 rounded-tl-sm opacity-90">
              <div className="text-xs uppercase tracking-widest font-bold opacity-70 mb-2 flex items-center gap-2 text-teal-600">
                  Translating <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
              </div>
              <p className="text-base leading-relaxed italic text-stone-600">{streamingOutput}</p>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-white/90 border-t border-stone-200 relative z-20 shadow-[0_-5px_30px_-5px_rgba(0,0,0,0.05)]">
        {isLive && (
             <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur border border-teal-100 px-6 py-2 rounded-full shadow-lg shadow-stone-200 flex items-center gap-3">
                 <div className="flex gap-1 h-5 items-end">
                     {[...Array(8)].map((_,i) => (
                         // Visualizer bars: Teal to match medical theme
                         <div key={i} className="w-1 bg-teal-500 rounded-full transition-all duration-75 ease-out" style={{ height: `${Math.max(4, audioLevel * 25 * ((i % 2) + 0.8))}px`, animationDelay: `${i * 0.05}s` }}></div>
                     ))}
                 </div>
                 <span className="text-sm font-semibold text-teal-800">Live Audio Input</span>
             </div>
        )}

        <div className="flex justify-center gap-4">
          {!isLive ? (
            <button 
              onClick={startSession}
              disabled={status === 'connecting'}
              // Primary Button: Dark Slate/Navy for high contrast professional look
              className="group relative flex items-center gap-3 px-10 py-4 bg-slate-800 hover:bg-slate-700 disabled:bg-stone-300 text-white rounded-full font-semibold text-lg shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              {status === 'connecting' ? (
                 <svg className="animate-spin h-5 w-5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 </div>
              )}
              <span>Start Translation</span>
            </button>
          ) : (
            <button 
              onClick={handleFinishConsultation}
              // End Button: Deep professional red
              className="group flex items-center gap-3 px-10 py-4 bg-rose-700 hover:bg-rose-600 text-white rounded-full font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-rose-200 hover:shadow-rose-300"
            >
              <div className="w-8 h-8 rounded-full bg-rose-900/30 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <span>End & Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTranslator;