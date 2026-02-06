import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import {
  Thermometer, Wind, ShieldCheck, ShieldAlert, RefreshCw, LayoutDashboard, Menu, X, Waves, BarChart3, Filter, ChevronRight, AlertCircle, Clock, Table as TableIcon, Activity
} from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1mB3Cb6GVbPVI_mK2q7BRWlvgXSikxS7ZvA-0_8_T7WY/export?format=csv&gid=356457835";

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('overview');
  const [error, setError] = useState(null);

  // Filters
  const [selectedFurnace, setSelectedFurnace] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(DEFAULT_SHEET_URL);
      Papa.parse(response.data, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const sanitized = results.data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
              const cleanedKey = key.trim();
              newRow[cleanedKey] = row[key];
            });
            return newRow;
          }).filter(row => row['ประทับเวลา']);

          setData(sanitized);
          if (sanitized.length === 0) setError("No data found in the spreadsheet.");
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch data from Google Sheets.");
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const rowFurnace = String(row['ชื่อเตา'] || '').trim();
      const rowMonth = String(row['Month'] || '').trim();
      const matchFurnace = selectedFurnace === 'All' || rowFurnace === selectedFurnace;
      const matchMonth = selectedMonth === 'All' || rowMonth === selectedMonth;
      return matchFurnace && matchMonth;
    });
  }, [data, selectedFurnace, selectedMonth]);

  const uniqueFurnaces = useMemo(() => ['All', ...new Set(data.map(row => String(row['ชื่อเตา'] || '').trim()).filter(Boolean))], [data]);
  const uniqueMonths = useMemo(() => ['All', ...new Set(data.map(row => String(row['Month'] || '').trim()).filter(Boolean))], [data]);

  const latestEntry = filteredData[filteredData.length - 1] || {};

  // --- DATA AGGREGATION FOR COMPARISON ---
  const comparisonData = useMemo(() => {
    const months = [...new Set(data.map(row => String(row['Month'] || '').trim()))].filter(m => m && m !== 'undefined');

    return months.map(m => {
      const monthRows = data.filter(r => String(r['Month'] || '').trim() === m && (selectedFurnace === 'All' || String(r['ชื่อเตา'] || '').trim() === selectedFurnace));
      if (monthRows.length === 0) return null;

      const calcAvg = (key) => {
        const validRows = monthRows.filter(r => r[key] !== null && r[key] !== undefined && !isNaN(parseFloat(r[key])));
        if (validRows.length === 0) return 0;
        const sum = validRows.reduce((acc, r) => acc + parseFloat(r[key]), 0);
        return parseFloat((sum / validRows.length).toFixed(1));
      };

      // Thermal Positions
      const positions = ['บนซ้าย', 'บนกลาง', 'บนขวา', 'กลางซ้าย', 'กลางกลาง', 'กลางขวา', 'ล่างซ้าย', 'ล่างกลาง', 'ล่างขวา'];
      const thermalAvgs = {};
      positions.forEach(p => {
        thermalAvgs[`Cone_${p}`] = calcAvg(`Cone-${p}`) || calcAvg(`Cone - ${p}`);
        thermalAvgs[`Ring_${p}`] = calcAvg(`Ring-${p}`) || calcAvg(`Ring - ${p}`);
      });

      // Gas Averages (Firing Zones)
      const gasAvgs = {
        z1_o2: calcAvg('Firing Zone1 - %O2 (OP=0%)'),
        z2_o2: calcAvg('Firing Zone2 - %O2 (OP=0%)'),
        z1_co2: calcAvg('Firing Zone1 - %CO2 (OP=0%)'),
        z2_co2: calcAvg('Firing Zone2 - %CO2 (OP=0%)'),
        z1_co: calcAvg('Firing Zone1 - CO(ppm) (OP=0%)'),
        z2_co: calcAvg('Firing Zone2 - CO(ppm) (OP=0%)')
      };

      // Safety Averages
      const safetyAvgs = {
        main: calcAvg('Main gas - ค่าที่วัดได้ (ppm)'),
        z1: calcAvg('Firing zone 1 - ค่าที่วัดได้ (ppm)'),
        z2: calcAvg('Firing zone 2 - ค่าที่วัดได้ (ppm)')
      };

      const statusCount = monthRows.filter(r => String(r['ตำแหน่ง Main gas']).toLowerCase() === 'normal').length;
      const statusPercent = Math.round((statusCount / monthRows.length) * 100);

      return { month: m, ...thermalAvgs, ...gasAvgs, ...safetyAvgs, safetyRating: statusPercent > 90 ? 'Perfect' : statusPercent > 70 ? 'Good' : 'Warning' };
    }).filter(Boolean);
  }, [data, selectedFurnace]);

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-thai transition-colors duration-500">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-500 bg-[#0f172a] text-white p-4 flex flex-col fixed h-full z-40 border-r border-slate-800 shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between mb-10 mt-2 px-1">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20 ring-1 ring-orange-400/50">
              <Waves size={24} />
            </div>
            {sidebarOpen && <span className="font-black text-xl tracking-tight uppercase">KilnVision</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-slate-800 p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-0.5">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active={currentView === 'overview'} collapsed={!sidebarOpen} onClick={() => setCurrentView('overview')} />
          <NavItem icon={<BarChart3 size={20} />} label="Analytics" active={currentView === 'comparison'} collapsed={!sidebarOpen} onClick={() => setCurrentView('comparison')} />

          <div className="pt-8 mb-4">
            <div className="h-px bg-slate-800 mx-2 mb-6 opacity-30"></div>
            {sidebarOpen ? <p className="text-[10px] font-black text-slate-500 uppercase px-3 tracking-[0.2em] mb-4">Data Filters</p> : <Filter size={16} className="mx-auto text-slate-500 mb-4" />}
          </div>

          {sidebarOpen && (
            <div className="space-y-6 px-3">
              <div className="group">
                <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-wider group-hover:text-orange-500 transition-colors">Furnace</label>
                <select value={selectedFurnace} onChange={(e) => setSelectedFurnace(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700/50 text-xs p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer shadow-inner">
                  {uniqueFurnaces.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-wider group-hover:text-orange-500 transition-colors">Month</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700/50 text-xs p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer shadow-inner">
                  {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <div className={`flex items-center gap-3 p-3 bg-slate-800/20 rounded-2xl border border-slate-800/20 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-400 to-red-600 flex items-center justify-center text-white font-black shadow-lg">
              {String(latestEntry['ผู้ตรวจสอบ'] || 'U')[0]}
            </div>
            {sidebarOpen && (
              <div className="text-xs truncate">
                <p className="font-bold text-slate-300">{latestEntry['ผู้ตรวจสอบ'] || 'Operator'}</p>
                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Verified Session</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-6 lg:p-10 pb-32 overflow-x-hidden`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-3">
              <span>Diagnostics</span>
              <ChevronRight size={10} className="text-orange-500" />
              <span className="text-slate-900">{currentView}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
              {currentView === 'overview' ? 'KILN OVERVIEW' : 'ANALYTICS'}
            </h1>
          </div>
          <button onClick={fetchData} className="group flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-orange-200 hover:text-orange-600 transition-all font-black text-[11px] uppercase tracking-widest active:scale-95">
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
            Database Sync
          </button>
        </header>

        {error && (
          <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-5 text-red-800 shadow-sm animate-in zoom-in duration-300">
            <div className="bg-red-500 p-2.5 rounded-xl text-white shadow-xl shadow-red-500/20"><AlertCircle size={24} /></div>
            <div>
              <p className="font-black text-[11px] uppercase tracking-widest mb-1">System Fault</p>
              <p className="text-sm font-bold opacity-80">{error}</p>
            </div>
          </div>
        )}

        {currentView === 'overview' ? (
          <OverviewView latestEntry={latestEntry} isLoading={loading} />
        ) : (
          <ComparisonView data={comparisonData} furnace={selectedFurnace} />
        )}
      </main>
    </div>
  );
};

// --- SUB-VIEWS ---

const OverviewView = ({ latestEntry, isLoading }) => {
  if (isLoading) return <LoadingSkeleton />;
  if (!latestEntry['ประทับเวลา']) return <NoDataState />;

  const getGridData = (prefix) => [
    ['บนซ้าย', 'บนกลาง', 'บนขวา'],
    ['กลางซ้าย', 'กลางกลาง', 'กลางขวา'],
    ['ล่างซ้าย', 'ล่างกลาง', 'ล่างขวา']
  ].map(row => row.map(pos => ({
    label: pos,
    value: latestEntry[`${prefix}-${pos}`] || latestEntry[`${prefix} - ${pos}`] || latestEntry[`${prefix} ${pos}`] || 0
  })));

  const formatGasData = (type) => [
    { op: '0%', z1: latestEntry[`Firing Zone1 - ${type} (OP=0%)`], z2: latestEntry[`Firing Zone2 - ${type} (OP=0%)`] },
    { op: '50%', z1: latestEntry[`Firing Zone1 -  ${type} (OP=50%)`] || latestEntry[`Firing Zone1 - ${type} (OP=50%)`], z2: latestEntry[`Firing Zone2 - ${type} (OP=50%)`] },
    { op: '100%', z1: latestEntry[`Firing Zone1 - ${type} (OP=100%)`], z2: latestEntry[`Firing Zone2 - ${type} (OP=100%)`] }
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-top-4 duration-1000">
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><Thermometer size={22} /></div>
            Temperature Profile
          </h2>
          <div className="hidden md:flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[9px] font-black text-slate-400 shadow-sm">
            <Clock size={12} className="text-orange-500" /> SYNC: {latestEntry['ประทับเวลา']}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CrossSectionGrid title="Cone Temperature Profile" data={getGridData('Cone')} color="red" />
          <CrossSectionGrid title="Ring Temperature Profile" data={getGridData('Ring')} color="orange" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Wind size={22} /></div>
          Atmosphere Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ChartCard title="% Oxygen (O2)" data={formatGasData('%O2')} color="#3b82f6" unit="%" />
          <ChartCard title="% Carbon Dioxide (CO2)" data={formatGasData('%CO2')} color="#8b5cf6" unit="%" />
          <ChartCard title="Carbon Monoxide (CO)" data={formatGasData('CO(ppm)')} color="#ef4444" unit="ppm" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck size={22} /></div>
          Gas Leakage Inspection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <LeakCard label="Main Gas Line" status={latestEntry['ตำแหน่ง Main gas']} value={latestEntry['Main gas - ค่าที่วัดได้ (ppm)']} />
          <LeakCard label="Firing Zone 1" status={latestEntry['ตำแหน่ง Firing zone1']} value={latestEntry['Firing zone 1 - ค่าที่วัดได้ (ppm)']} />
          <LeakCard label="Firing Zone 2" status={latestEntry['ตำแหน่ง Firing zone2']} value={latestEntry['Firing zone 2 - ค่าที่วัดได้ (ppm)']} />
        </div>
      </section>
    </div>
  );
};

const ComparisonView = ({ data, furnace }) => {
  const [activeTab, setActiveTab] = useState('thermal');
  if (data.length === 0) return <NoDataState />;

  const positions = ['บนซ้าย', 'บนกลาง', 'บนขวา', 'กลางซ้าย', 'กลางกลาง', 'กลางขวา', 'ล่างซ้าย', 'ล่างกลาง', 'ล่างขวา'];

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-1000 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
        <div className="bg-white p-1.5 rounded-2xl inline-flex gap-1.5 shadow-xl shadow-slate-200/40 border border-slate-100/50">
          <TabButton active={activeTab === 'thermal'} label="Thermal Profile" icon={<Thermometer size={14} />} onClick={() => setActiveTab('thermal')} />
          <TabButton active={activeTab === 'gas'} label="Gas Composition" icon={<Wind size={14} />} onClick={() => setActiveTab('gas')} />
          <TabButton active={activeTab === 'safety'} label="Safety & Zones" icon={<Activity size={14} />} onClick={() => setActiveTab('safety')} />
        </div>
        <div className="px-5 py-2.5 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl ring-1 ring-slate-700">
          Source: {furnace} Historical
        </div>
      </div>

      {activeTab === 'thermal' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 animate-in fade-in zoom-in duration-700">
          {positions.map(pos => (
            <div key={pos} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">POSITION: {pos}</h4>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} hide domain={[1000, 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey={`Cone_${pos}`} name="Cone" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey={`Ring_${pos}`} name="Ring" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'gas' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-xl">Cross-Zone Gas Comparison</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Zone 1</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300 shadow-lg shadow-slate-100"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Zone 2</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-50">
              {['o2', 'co2', 'co'].map(metric => (
                <div key={metric} className="p-8 group hover:bg-slate-50/50 transition-colors">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Wind size={14} className="text-blue-500" />
                    Average {metric.toUpperCase()} {metric === 'co' ? '(ppm)' : '(%)'}
                  </h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
                        <Bar dataKey={`z1_${metric}`} name="Zone 1" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey={`z2_${metric}`} name="Zone 2" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#0f172a] text-white font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Month</th>
                  <th className="px-8 py-5 text-center bg-blue-600/20">Oxygen (Z1 vs Z2)</th>
                  <th className="px-8 py-5 text-center bg-purple-600/20">CO2 (Z1 vs Z2)</th>
                  <th className="px-8 py-5 text-center bg-red-600/20">CO ppm (Z1 vs Z2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                {data.map(m => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition-all cursor-default group">
                    <td className="px-8 py-4 text-slate-900 group-hover:text-blue-600">{m.month}</td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg">{m.z1_o2}%</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{m.z2_o2}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg">{m.z1_co2}%</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{m.z2_co2}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg">{m.z1_co}</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{m.z2_co}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <SafetyMetricCard label="Main Pipeline Avg" value={data[data.length - 1]?.main} data={data} dataKey="main" color="#10b981" />
            <SafetyMetricCard label="Zone 1 Sensor Avg" value={data[data.length - 1]?.z1} data={data} dataKey="z1" color="#f59e0b" />
            <SafetyMetricCard label="Zone 2 Sensor Avg" value={data[data.length - 1]?.z2} data={data} dataKey="z2" color="#ef4444" />
          </div>

          <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-900 text-xl tracking-tighter uppercase">Cross-Zone Safety Status log</h3>
              <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100">
                SENSORS ACTIVE: 100%
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="px-10 py-6">Reporting Month</th>
                  <th className="px-10 py-6">Global Rating</th>
                  <th className="px-10 py-6">Main (ppm)</th>
                  <th className="px-10 py-6">Zone 1 (ppm)</th>
                  <th className="px-10 py-6">Zone 2 (ppm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-xs text-slate-600">
                {data.map(m => (
                  <tr key={m.month} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-5 text-slate-900">{m.month}</td>
                    <td className="px-10 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${m.safetyRating === 'Perfect' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${m.safetyRating === 'Perfect' ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`}></div>
                        {m.safetyRating}
                      </div>
                    </td>
                    <td className="px-10 py-5"><span className="text-slate-400 group-hover:text-slate-900 transition-colors">{m.main}</span></td>
                    <td className="px-10 py-5"><span className="text-slate-400 group-hover:text-slate-900 transition-colors">{m.z1}</span></td>
                    <td className="px-10 py-5"><span className="text-slate-400 group-hover:text-slate-900 transition-colors">{m.z2}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPACT COMPONENTS ---

const NavItem = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/40 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className="font-black whitespace-nowrap text-[11px] uppercase tracking-widest">{label}</span>}
  </button>
);

const TabButton = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2.5 px-6 lg:px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${active ? 'bg-[#0f172a] text-white shadow-2xl scale-[1.05]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}>
    {icon} {label}
  </button>
);

const SafetyMetricCard = ({ label, value, data, dataKey, color }) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
    <div className="flex items-center justify-between mb-6">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
        <Activity size={14} />
      </div>
    </div>
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-4xl font-black text-slate-900 tracking-tighter">{value || 0}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Avg ppm</p>
      </div>
      <div className="flex-1 h-12 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const CrossSectionGrid = ({ title, data, color }) => (
  <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-1000 group">
    <div className="flex items-center justify-between mb-8">
      <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px] flex items-center gap-2.5">
        <div className={`w-1.5 h-1.5 rounded-full ${color === 'red' ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-orange-500 shadow-lg shadow-orange-500/30'}`}></div>
        {title}
      </h3>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {data.flat().map((item, i) => (
        <div key={i} className="bg-slate-50/50 rounded-3xl p-5 text-center border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-500 group/item">
          <p className="text-[9px] text-slate-400 font-bold uppercase mb-1.5 tracking-tighter opacity-70 group-hover/item:text-orange-500">{item.label}</p>
          <div className={`text-xl font-black ${parseFloat(item.value) > 0 ? (color === 'red' ? 'text-slate-900' : 'text-slate-800') : 'text-slate-200'}`}>
            {item.value || '-'}
            {parseFloat(item.value) > 0 && <span className="text-[9px] ml-0.5 font-bold opacity-30 group-hover/item:opacity-80">°C</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ChartCard = ({ title, data, color, unit }) => (
  <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 flex flex-col h-[380px] hover:shadow-2xl transition-all duration-700">
    <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3 text-[10px] uppercase tracking-widest">
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}10`, color: color }}><Wind size={16} /></div>
      {title}
    </h3>
    <div className="flex-1 w-full -ml-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="op" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1' }} unit={unit === '%' ? '%' : ''} />
          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.15)', fontWeight: 900, fontSize: '10px' }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900 }} />
          <Line name="Zone 1" type="monotone" dataKey="z1" stroke={color} strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} />
          <Line name="Zone 2" type="monotone" dataKey="z2" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} opacity={0.6} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const LeakCard = ({ label, status, value }) => {
  const isNormal = str => String(str || '').toLowerCase() === 'normal';
  return (
    <div className={`p-8 rounded-[48px] transition-all border-2 group ${isNormal(status) ? 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm' : 'bg-red-50 border-red-200 shadow-xl'}`}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className={`font-black text-[10px] uppercase tracking-widest ${isNormal(status) ? 'text-slate-400' : 'text-red-500'}`}>{label}</p>
          <p className="text-[8px] text-slate-300 font-bold mt-1 uppercase tracking-[0.2em]">SENSOR_NODE</p>
        </div>
        <div className={`p-3 rounded-2xl ${isNormal(status) ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-red-600 animate-pulse'}`}>
          {isNormal(status) ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-4xl font-black tracking-tighter ${isNormal(status) ? 'text-slate-900 group-hover:text-emerald-700' : 'text-red-800'}`}>{value !== null ? value : '-'}</p>
          <p className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-widest">CONTENT PPM</p>
        </div>
        <div className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg ${isNormal(status) ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {status || 'UNKNOWN'}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-12">
    <div className="h-48 bg-slate-200 rounded-[56px] w-full border-4 border-white shadow-xl"></div>
    <div className="grid grid-cols-2 gap-10">
      <div className="h-[400px] bg-slate-200 rounded-[56px]"></div>
      <div className="h-[400px] bg-slate-200 rounded-[56px]"></div>
    </div>
  </div>
);

const NoDataState = () => (
  <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-200 rounded-[64px] bg-slate-50/20 animate-in zoom-in duration-500">
    <div className="p-8 bg-white shadow-xl text-slate-300 rounded-[32px] mb-8 ring-8 ring-slate-50">
      <Filter size={48} />
    </div>
    <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Repository Empty</h3>
    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Adjust filter parameters to synchronize data</p>
  </div>
);

export default App;
