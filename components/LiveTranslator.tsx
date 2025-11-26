import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveClient } from '@google/genai';
import { createBlob, decode, decodeAudioData, audioContext, inputAudioContext } from '../services/audioUtils';
import { ChatMessage, Patient } from '../types';
import { generateSummary } from '../services/geminiService'; // Assume this service can handle JSON structure request

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
    if (sessionRef.current) {
      // Close the WebSocket connection cleanly
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
      sourceRef.current = null;
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

    // --- MODIFIED SUMMARY CALL TO REQUEST STRUCTURED DATA ---
    // The key to this feature working is assuming 'generateSummary' now tells Gemini
    // to return a specific JSON or structured text format that contains:
    // 1. Clinical Summary (text)
    // 2. Vitals (JSON/text list)
    // 3. Medications (JSON/text list)
    // The LiveTranslator must pass a special instruction asking for this format.
    
    // NOTE: This relies on you updating the 'generateSummary' function definition
    // in '../services/geminiService' to handle a complex prompt requiring structured output.

    const summary = await generateSummary(finalTranscript, 'structured_medical_note'); // Passing a hint for structured output
    onSessionEnd(finalTranscript, summary);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      
      {/* Background Pattern & Radial Gradient */}
      <div className="absolute inset-0 z-0 bg-repeat opacity-[0.03]" style={{ backgroundImage: "url('/dots.svg')", backgroundSize: '20px 20px' }}></div>
      <div className="absolute inset-0 z-0 radial-gradient-mask opacity-10"></div> {/* Subtle radial gradient */}


      {/* Header */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur-md border-b border-indigo-900 px-8 py-5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:bg-indigo-900/50 p-2 rounded-full transition text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {patient.name}
                    <span className="text-xs font-normal px-2 py-1 bg-indigo-900/70 rounded-full text-indigo-300 border border-indigo-700">{patient.id}</span>
                </h2>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400 mt-1">
                    <span className="text-teal-400">{patient.primaryLanguage}</span>
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    <span className="text-teal-400">English</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             {status === 'connected' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-900/50 border border-green-700 rounded-full text-green-300 shadow-md">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse-slow"></div>
                    <span className="text-xs font-medium uppercase tracking-wider">Live Translation</span>
                </div>
             )}
        </div>
      </div>

      {/* Content (Chat Area) */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 mx-auto w-full max-w-4xl scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-slate-800" ref={scrollRef}>
          {/* Animated Gradient Border to focus the chat area */}
          <div className="absolute inset-0 pointer-events-none p-px">
              {/* Note: This is a placeholder for a complex Tailwind animation if defined in config */}
              <div className="absolute inset-0 rounded-3xl opacity-30 [background:linear-gradient(45deg,rgba(79,70,229,0.5)_0%,rgba(6,182,212,0.5)_50%,rgba(79,70,229,0.5)_100%)] bg-[length:200%_200%] animate-spin-slow"></div>
          </div>
          
        <div className="space-y-6 pt-4"> 
        {transcript.length === 0 && !streamingInput && !streamingOutput && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 animate-fade-in">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-slate-950/50 relative">
                    <svg className={`w-10 h-10 ${status === 'idle' ? 'text-indigo-400 animate-mic-pulse' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <p className="text-xl font-semibold text-indigo-300">Awaiting Input</p>
                <p className="text-md text-slate-400 mt-2">Initiate translation to begin the secure interpretation session.</p>
            </div>
        )}
        
        {/* Transcript Bubbles */}
        {transcript.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`max-w-[75%] p-5 rounded-3xl shadow-xl relative ${
              msg.role === 'user' 
                // User/Source: Rich Indigo
                ? 'bg-indigo-600/90 text-white rounded-tr-none border border-indigo-500' 
                // Model/Translation: High-contrast Slate/Teal
                : 'bg-slate-700 text-teal-300 rounded-tl-none border border-slate-600'
            }`}>
              <div className="text-xs uppercase tracking-widest font-semibold opacity-70 mb-2">
                  {msg.role === 'user' ? 'SOURCE AUDIO' : 'TRANSLATION'}
              </div>
              <p className="text-base leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Streaming Partials - Realtime Feedback */}
        {streamingInput && (
           <div className="flex justify-end animate-fade-in-up">
            <div className="max-w-[75%] p-5 rounded-3xl shadow-lg relative bg-indigo-900/70 text-white rounded-tr-none border border-indigo-700 opacity-90">
              <div className="text-xs uppercase tracking-widest font-semibold opacity-70 mb-2 flex items-center gap-2">
                  Speaking <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              </div>
              <p className="text-base leading-relaxed italic text-indigo-200">{streamingInput}</p>
            </div>
          </div>
        )}
        
        {streamingOutput && (
           <div className="flex justify-start animate-fade-in-up">
            <div className="max-w-[75%] p-5 rounded-3xl shadow-lg relative bg-slate-700 border border-slate-600 text-white rounded-tl-none opacity-90">
              <div className="text-xs uppercase tracking-widest font-semibold opacity-70 mb-2 flex items-center gap-2">
                  Translating <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
              </div>
              <p className="text-base leading-relaxed italic text-teal-300">{streamingOutput}</p>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-slate-900/90 border-t border-indigo-900 relative z-20 shadow-2xl">
        {isLive && (
             <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-teal-700 px-5 py-2 rounded-full shadow-2xl shadow-teal-900/50 flex items-center gap-3">
                 <div className="flex gap-1 h-5 items-end">
                     {[...Array(8)].map((_,i) => (
                         <div key={i} className="w-1 bg-teal-400 rounded-full transition-all duration-75 ease-out" style={{ height: `${Math.max(4, audioLevel * 25 * ((i % 2) + 0.8))}px`, animationDelay: `${i * 0.05}s` }}></div>
                     ))}
                 </div>
                 <span className="text-sm font-medium text-teal-300">Live Audio Input</span>
             </div>
        )}

        <div className="flex justify-center gap-4">
          {!isLive ? (
            <button 
              onClick={startSession}
              disabled={status === 'connecting'}
              className="group relative flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-full font-semibold text-xl shadow-xl shadow-indigo-900/50 transition-all hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
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
              className="group flex items-center gap-3 px-10 py-4 bg-red-700 hover:bg-red-600 text-white rounded-full font-semibold text-xl transition-all active:scale-95 shadow-xl shadow-red-900/50 hover:shadow-red-800/80"
            >
              <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center">
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