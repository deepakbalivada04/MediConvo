import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AnimationEasing
} from 'recharts';
import { ConsultationRecord, DashboardStats, Patient } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  history: ConsultationRecord[];
  patients: Patient[];
  onViewConsultation: (id: string) => void;
}

// PREMIUM COLORS: Charcoal, Muted Gold, Soft Gray
const COLORS = ['#2D2D2D', '#C5A059', '#A3A3A3', '#E5E0D8']; 

// Custom Tooltip for Recharts (adjusted for Light/Premium mode)
const CustomTooltip = ({ active, payload, label, stats }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg shadow-xl text-sm text-[#2D2D2D]">
        <p className="font-bold text-[#2D2D2D] mb-1">{label || data.name}</p>
        <p>{`${data.name ? 'Count' : 'Consultations'}: `}<span className="font-semibold text-[#2D2D2D]">{payload[0].value}</span></p>
        {data.name && stats && (
          <p>{`Percentage: `}<span className="font-semibold text-[#C5A059]">{(data.value / stats.totalConsultations * 100).toFixed(1)}%</span></p>
        )}
      </div>
    );
  }
  return null;
};

// Custom Legend for PieChart
const renderLanguageLegend = (value: string, entry: any, totalConsultations: number) => {
  const { color, payload } = entry;
  const percentage = totalConsultations > 0 ? ((payload.value / totalConsultations) * 100).toFixed(1) : 0;

  return (
    <div className="flex items-center gap-2 mr-4 mb-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
      <span className="text-sm font-medium text-[#444]">{value}</span>
      <span className="text-xs text-[#888] font-normal">({percentage}%)</span>
    </div>
  );
};

// Simplified Intro Graphic for a professional icon look
const SimpleIntroGraphic: React.FC = () => (
    <div className="w-10 h-10 rounded-lg bg-[#2D2D2D] flex items-center justify-center text-[#C5A059] text-xl font-extrabold shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v.217l-.2.2-4 4a1 1 0 001.414 1.414L9 7.414V14a1 1 0 102 0V7.414l2.786 2.786a1 1 0 001.414-1.414l-4-4-.2-.2V4a1 1 0 00-1-1z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, history, patients, onViewConsultation }) => {
  const totalConsultationsForPie = stats.languageDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    // Main background changed to Cream
    <div className="space-y-8 animate-fade-in pb-16 bg-[#F9F7F2] min-h-screen text-[#2D2D2D] font-sans">
      
      {/* HEADER: Premium Cream Look */}
      <header className="bg-white sticky top-0 z-10 shadow-lg px-8 pt-6 pb-4 border-b border-[#EAEAEA]">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center">
            <SimpleIntroGraphic />
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#2D2D2D] tracking-tight ml-3">MedConvo Dashboard</h1>
              <p className="text-[#888] mt-1 text-sm ml-3 uppercase tracking-widest">Analytics & Key Performance Indicators</p>
            </div>
          </div>
          <div className="bg-[#FFFEFA] shadow-sm border border-[#EAEAEA] rounded-full px-4 py-1.5 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-semibold">System Ready</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className='px-8'>
        
        {/* Stats Grid: Cream Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Stat Card 1: Total Visits */}
          <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-[#C5A059] hover:bg-[#FFFEFA] transition-colors">
            <p className="text-xs font-medium text-[#C5A059] uppercase tracking-widest mb-1">Total Visits</p>
            <div className="flex justify-between items-center">
                <p className="text-4xl font-serif font-bold text-[#2D2D2D]">{stats.totalConsultations}</p>
                <div className="w-8 h-8 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center text-[#C5A059] opacity-90">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
            </div>
          </div>

          {/* Stat Card 2: Avg Time */}
          <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-[#2D2D2D] hover:bg-[#FFFEFA] transition-colors">
            <p className="text-xs font-medium text-[#2D2D2D] uppercase tracking-widest mb-1">Avg Time</p>
            <div className="flex justify-between items-center">
                <p className="text-4xl font-serif font-bold text-[#2D2D2D]">{stats.avgDurationMinutes}<span className="text-xl text-[#2D2D2D] font-normal ml-1">m</span></p>
                <div className="w-8 h-8 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center text-[#2D2D2D] opacity-90">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>
          </div>

          {/* Stat Card 3: Unique Patients */}
          <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-[#A3A3A3] hover:bg-[#FFFEFA] transition-colors">
            <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-widest mb-1">Unique Patients</p>
            <div className="flex justify-between items-center">
                <p className="text-4xl font-extrabold text-[#2D2D2D]">{patients.length}</p>
                <div className="w-8 h-8 rounded-full bg-[#A3A3A3]/20 flex items-center justify-center text-[#A3A3A3] opacity-90">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.292M21 21v-1a6 6 0 00-3-5.196" /></svg>
                </div>
            </div>
          </div>

          {/* Stat Card 4: Top Language */}
          <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-[#3b82f6] hover:bg-[#FFFEFA] transition-colors">
            <p className="text-xs font-medium text-[#3b82f6] uppercase tracking-widest mb-1">Top Language</p>
            <div className="flex justify-between items-center">
                <p className="text-2xl font-extrabold text-[#2D2D2D] mt-2">{stats.languageDistribution[0]?.name || 'N/A'}</p>
                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] opacity-90">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-2.239 3-5s-1.343-5-3-5m0 10v-5m0 0H9" /></svg>
                </div>
            </div>
          </div>
        </div>

        {/* Charts & Graphics Area: Premium Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* Chart Section: Weekly Activity */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-[#EAEAEA] lg:col-span-2 animate-fade-in-up">
            <h3 className="text-lg font-serif font-bold text-[#2D2D2D] mb-1">Weekly Activity Trend</h3>
            <p className="text-[#888] text-sm mb-4">Consultations over the last 7 days.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyActivity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip stats={stats} />} cursor={{ fill: '#f8fafc', opacity: 0.6 }} />
                  <Bar
                    dataKey="consultations"
                    fill="#2D2D2D" // Charcoal
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Language Demographics (Sidebar Content Area) */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-[#EAEAEA] animate-fade-in-up delay-100">
            <h3 className="text-lg font-serif font-bold text-[#2D2D2D] mb-1">Language Demographics</h3>
            <p className="text-[#888] text-sm mb-4">Distribution of consultation language.</p>
            <div className="h-72 flex flex-col items-center">
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={stats.languageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50} // Smaller donut for clean look
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#f8fafc"
                    strokeWidth={2}
                    labelLine={false}
                    animationDuration={1800}
                  >
                    {stats.languageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip stats={stats} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center mt-3 w-full">
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  payload={
                    stats.languageDistribution.map((entry, index) => ({
                      value: entry.name,
                      type: 'square',
                      color: COLORS[index % COLORS.length],
                      payload: entry
                    }))
                  }
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {payload.map((entry, index) => renderLanguageLegend(entry.value, entry, totalConsultationsForPie))}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Records Table: Premium Theme */}
        <div className="bg-white rounded-xl shadow-lg border border-[#EAEAEA] overflow-hidden mt-6 animate-fade-in-up delay-200">
          <div className="px-6 py-4 border-b border-[#EAEAEA] flex justify-between items-center">
            <h3 className="text-lg font-serif font-bold text-[#2D2D2D]">Recent Consultation Records</h3>
            <button className="text-[#C5A059] hover:text-[#2D2D2D] text-sm font-semibold">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-[#444]">
              <thead className="text-xs font-bold text-[#888] uppercase bg-[#F9F7F2] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Patient ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Language</th>
                  <th className="px-6 py-3">Summary Preview</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-[#A3A3A3] italic">No consultation records found.</td>
                  </tr>
                ) : (
                  history.map((record, index) => {
                    const patient = patients.find(p => p.id === record.patientId);
                    const language = patient?.primaryLanguage || 'Unknown';
                    return (
                      <tr key={record.id} className="hover:bg-[#FFFEFA] transition-colors" style={{ animationDelay: `${index * 50}ms` }}>
                        <td className="px-6 py-4 font-mono text-xs text-[#888]">{record.patientId}</td>
                        <td className="px-6 py-4 font-medium text-[#2D2D2D]">{patient?.name || 'Unknown Patient'}</td>
                        <td className="px-6 py-4 text-[#666]">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            language === 'Telugu' ? 'bg-[#F2E8D5] text-[#C5A059]' :
                            language === 'Hindi' ? 'bg-[#E5E0D8] text-[#2D2D2D]' :
                            language === 'Odia' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' :
                            'bg-[#F5F5F5] text-[#888]'
                          }`}>
                            {language}
                          </span>
                        </td>
                        <td className="px-6 py-4 truncate max-w-xs text-[#888] italic">
                          {record.summary.substring(0, 40)}...
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onViewConsultation(record.id)}
                            className="text-[#2D2D2D] hover:text-[#C5A059] font-medium text-sm px-3 py-1.5 rounded-lg border border-[#EAEAEA] hover:border-[#D4AF37] transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;