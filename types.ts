
export enum Language {
  ENGLISH = 'English',
  TELUGU = 'Telugu',
  HINDI = 'Hindi',
  ODIA = 'Odia'
}

export type UserRole = 'doctor' | 'patient';

export interface Patient {
  id: string;
  name: string;
  age: number;
  primaryLanguage: Language;
  registeredAt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ConsultationRecord {
  id: string;
  patientId: string;
  date: string;
  transcript: ChatMessage[];
  summary: string;
  status: 'completed' | 'pending';
  doctorNotes?: string;
}

export interface DashboardStats {
  totalConsultations: number;
  avgDurationMinutes: number;
  languageDistribution: { name: string; value: number }[];
  dailyActivity: { day: string; consultations: number }[];
}
