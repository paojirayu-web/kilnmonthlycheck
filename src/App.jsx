import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import {
  Thermometer, Wind, ShieldCheck, ShieldAlert, RefreshCw, LayoutDashboard, Menu, X, Waves, BarChart3, Filter, ChevronRight, ChevronDown, AlertCircle, Clock, Table as TableIcon, Activity
} from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1mB3Cb6GVbPVI_mK2q7BRWlvgXSikxS7ZvA-0_8_T7WY/export?format=csv&gid=356457835";

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [currentView, setCurrentView] = useState('overview');
  const [error, setError] = useState(null);

  // Filters
  const [selectedFurnace, setSelectedFurnace] = useState('');
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

  useEffect(() => {
    fetchData();
    // Auto-open sidebar on larger screens
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  const uniqueFurnaces = useMemo(() => {
    const furnaces = [...new Set(data.map(row => String(row['ชื่อเตา'] || '').trim()).filter(Boolean))];
    return furnaces.sort((a, b) => a.localeCompare(b, 'th'));
  }, [data]);

  const effectiveFurnace = selectedFurnace || (uniqueFurnaces.length > 0 ? uniqueFurnaces[0] : '');

  // Set default furnace when data is loaded
  useEffect(() => {
    if (!selectedFurnace && uniqueFurnaces.length > 0) {
      setSelectedFurnace(uniqueFurnaces[0]);
    }
  }, [uniqueFurnaces, selectedFurnace]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const rowFurnace = String(row['ชื่อเตา'] || '').trim();
      const rowMonth = String(row['Month'] || '').trim();
      const matchFurnace = rowFurnace === effectiveFurnace;
      const matchMonth = selectedMonth === 'All' || rowMonth === selectedMonth;
      return matchFurnace && matchMonth;
    });
  }, [data, effectiveFurnace, selectedMonth]);

  const uniqueMonths = useMemo(() => ['All', ...new Set(data.map(row => String(row['Month'] || '').trim()).filter(Boolean))], [data]);

  const latestEntry = filteredData[filteredData.length - 1] || {};

  // --- DATA AGGREGATION FOR COMPARISON ---
  const comparisonData = useMemo(() => {
    const months = [...new Set(data.map(row => String(row['Month'] || '').trim()))].filter(m => m && m !== 'undefined');

    return months.map(m => {
      const monthRows = data.filter(r => String(r['Month'] || '').trim() === m && (String(r['ชื่อเตา'] || '').trim() === effectiveFurnace));
      if (monthRows.length === 0) return null;

      const calcAvg = (key) => {
        const validRows = monthRows.filter(r => r[key] !== null && r[key] !== undefined && !isNaN(parseFloat(r[key])));
        if (validRows.length === 0) return 0;
        const sum = validRows.reduce((acc, r) => acc + parseFloat(r[key]), 0);
        return parseFloat((sum / validRows.length).toFixed(1));
      };

      const positions = ['บนซ้าย', 'บนกลาง', 'บนขวา', 'กลางซ้าย', 'กลางกลาง', 'กลางขวา', 'ล่างซ้าย', 'ล่างกลาง', 'ล่างขวา'];
      const thermalAvgs = {};
      positions.forEach(p => {
        thermalAvgs[`Cone_${p}`] = calcAvg(`Cone-${p}`) || calcAvg(`Cone - ${p}`);
        thermalAvgs[`Ring_${p}`] = calcAvg(`Ring-${p}`) || calcAvg(`Ring - ${p}`);
      });

      const gasAvgs = {};
      ['0%', '50%', '100%'].forEach(op => {
        const opKey = op.replace('%', '');
        const suffix = `(OP=${op})`;
        const getGasVal = (zone, metric, opSuffix) => {
          const baseKey = `Firing Zone${zone} - ${metric} ${opSuffix}`;
          const spaceKey = `Firing Zone${zone} -  ${metric} ${opSuffix}`;
          return calcAvg(baseKey) || calcAvg(spaceKey);
        };

        gasAvgs[`z1_o2_${opKey}`] = getGasVal(1, '%O2', suffix);
        gasAvgs[`z2_o2_${opKey}`] = getGasVal(2, '%O2', suffix);
        gasAvgs[`z1_co2_${opKey}`] = getGasVal(1, '%CO2', suffix);
        gasAvgs[`z2_co2_${opKey}`] = getGasVal(2, '%CO2', suffix);
        gasAvgs[`z1_co_${opKey}`] = getGasVal(1, 'CO(ppm)', suffix);
        gasAvgs[`z2_co_${opKey}`] = getGasVal(2, 'CO(ppm)', suffix);
      });

      const safetyAvgs = {
        main: calcAvg('Main gas - ค่าที่วัดได้ (ppm)'),
        z1: calcAvg('Firing zone 1 - ค่าที่วัดได้ (ppm)'),
        z2: calcAvg('Firing zone 2 - ค่าที่วัดได้ (ppm)')
      };

      const statusCount = monthRows.filter(r => String(r['ตำแหน่ง Main gas']).toLowerCase() === 'normal').length;
      const statusPercent = Math.round((statusCount / monthRows.length) * 100);

      return { month: m, ...thermalAvgs, ...gasAvgs, ...safetyAvgs, safetyRating: statusPercent > 90 ? 'Perfect' : statusPercent > 70 ? 'Good' : 'Warning' };
    }).filter(Boolean);
  }, [data, effectiveFurnace]);

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-thai transition-colors duration-500 overflow-x-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile Floating Toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-orange-600 text-white rounded-full shadow-2xl shadow-orange-600/40 lg:hidden hover:scale-110 active:scale-95 transition-all"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transition-all duration-700 text-white p-4 flex flex-col h-full overflow-hidden
        ${sidebarOpen
          ? 'w-64 translate-x-0 bg-[#0f172a] shadow-2xl border-r border-slate-800'
          : 'w-20 -translate-x-full lg:translate-x-0 lg:w-24 bg-[#0f172a] border-r border-slate-800 shadow-xl'}
      `}>
        {/* Sidebar Header */}
        <div className="flex flex-col items-center mb-10 mt-2">
          <div className={`flex items-center w-full transition-all duration-300 ${sidebarOpen ? 'justify-between flex-row' : 'flex-col justify-center gap-8'}`}>
            {/* Logo */}
            <div className={`flex items-center ${!sidebarOpen && 'scale-110 transition-transform'}`}>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20 ring-1 ring-white/10 flex-shrink-0">
                <Waves size={24} />
              </div>
              <span className={`font-black text-xl tracking-tight uppercase transition-all duration-700 ml-3 whitespace-nowrap overflow-hidden origin-left ${sidebarOpen ? 'opacity-100 w-auto scale-100' : 'opacity-0 w-0 scale-50'}`}>
                CROWNKILN
              </span>
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`rounded-xl transition-all duration-300 text-slate-400 hover:text-white hover:bg-white/10 ${sidebarOpen ? 'p-2' : 'p-3 bg-slate-800/50 hover:bg-slate-700'}`}
            >
              {sidebarOpen ? <X size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          {/* Collapsed Filters REMOVED as requested */}
        </div>

        <nav className="flex-1 space-y-4 w-full flex flex-col items-center">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active={currentView === 'overview'} collapsed={!sidebarOpen} onClick={() => { setCurrentView('overview'); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
          <NavItem icon={<BarChart3 size={20} />} label="Analytics" active={currentView === 'comparison'} collapsed={!sidebarOpen} onClick={() => { setCurrentView('comparison'); if (window.innerWidth < 1024) setSidebarOpen(false); }} />

          <div className={`pt-6 mb-2 overflow-hidden w-full transition-all duration-700 ${sidebarOpen ? 'opacity-100' : 'opacity-0 h-0'}`}>
            <div className="px-2 mb-4">
              <div className="h-px bg-slate-800 mx-1 mb-6 opacity-30"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Data Filters</p>
            </div>
          </div>

          <div className={`space-y-6 transition-all duration-700 flex flex-col items-center w-full ${sidebarOpen ? 'px-1 opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
            <div className="group w-full">
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-wider group-hover:text-orange-500 transition-colors">KILN</label>
              <select value={effectiveFurnace} onChange={(e) => setSelectedFurnace(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700/50 text-xs p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer shadow-inner text-slate-200">
                {uniqueFurnaces.map(f => <option key={f} value={f} className="text-slate-900">{f}</option>)}
              </select>
            </div>
            <div className="group w-full">
              <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-wider group-hover:text-orange-500 transition-colors">Month</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700/50 text-xs p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer shadow-inner text-slate-200">
                {uniqueMonths.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}
              </select>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-6 border-t border-slate-800/50 w-full mb-2">
          <div className={`flex items-center p-2 bg-slate-800/30 rounded-2xl border border-slate-700/30 transition-all duration-500 ${sidebarOpen ? 'gap-3' : 'justify-center w-12 h-12 mx-auto'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-400 to-red-600 flex items-center justify-center text-white font-black shadow-lg shrink-0">
              {String(latestEntry['ผู้ตรวจสอบ'] || 'U')[0]}
            </div>
            <div className={`transition-all duration-500 overflow-hidden ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <div className="text-xs whitespace-nowrap">
                <p className="font-bold text-slate-300">{latestEntry['ผู้ตรวจสอบ'] || 'Operator'}</p>
                <p className="text-[7px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Verified</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-700 min-w-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-24'} pb-32 pt-28 lg:pt-32`}>
        {/* Header - Fixed on PC & Mobile */}
        <header className={`fixed top-0 right-0 z-40 bg-[#f8fafc]/90 backdrop-blur-xl border-b border-slate-200/50 px-4 lg:px-10 py-4 lg:py-6 transition-all shadow-sm ${sidebarOpen ? 'lg:left-64' : 'lg:left-24'} left-0`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8 w-full md:w-auto">
                <div className="hidden lg:block">
                  <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-1.5">
                    <span>Diagnostics</span>
                    <ChevronRight size={10} className="text-orange-500" />
                    <span className="text-slate-900">{currentView}</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {currentView === 'overview' ? 'KILN OVERVIEW' : 'ANALYTICS'}
                  </h1>
                </div>

                {/* Mobile Header Title & View Selector */}
                <div className="lg:hidden flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-2">
                      <Waves size={18} className="text-orange-600" />
                      CROWNKILN
                    </h1>

                    {/* Mobile View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setCurrentView('overview')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${currentView === 'overview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setCurrentView('comparison')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${currentView === 'comparison' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        Analytics
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Kiln Selector */}
                  {effectiveFurnace && (
                    <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700">
                      <div className="flex items-center gap-2 lg:gap-3 bg-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 group-hover:border-orange-200 group-hover:shadow-md transition-all cursor-pointer">
                        <div className="shrink-0 w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs lg:text-base font-black text-slate-800 tracking-tight leading-none uppercase">{effectiveFurnace}</p>
                          <ChevronDown size={14} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                        </div>
                        <select
                          value={effectiveFurnace}
                          onChange={(e) => setSelectedFurnace(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                          {uniqueFurnaces.map(f => <option key={f} value={f} className="text-slate-900">{f}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Month Selector */}
                  <div className="relative group animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
                    <div className="flex items-center gap-2 lg:gap-3 bg-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 group-hover:border-blue-200 group-hover:shadow-md transition-all cursor-pointer">
                      <Clock size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <div className="flex items-center gap-2">
                        <p className="text-xs lg:text-base font-black text-slate-800 tracking-tight leading-none uppercase">
                          {selectedMonth === 'All' ? 'ALL MONTHS' : selectedMonth}
                        </p>
                        <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      >
                        {uniqueMonths.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={fetchData} className="hidden md:flex group items-center justify-center gap-3 bg-white px-6 py-3 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-orange-200 hover:text-orange-600 transition-all font-black text-[11px] uppercase tracking-widest active:scale-95 shrink-0">
              <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              Database Sync
            </button>
          </div>
        </header>

        <div className="px-4 lg:px-10 max-w-[1600px] mx-auto">
          {error && (
            <div className="mb-8 lg:mb-10 p-5 lg:p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4 lg:gap-5 text-red-800 shadow-sm animate-in zoom-in duration-300">
              <div className="bg-red-500 p-2 lg:p-2.5 rounded-xl text-white shadow-xl shadow-red-500/20 shrink-0"><AlertCircle size={20} /></div>
              <div>
                <p className="font-black text-[10px] lg:text-[11px] uppercase tracking-widest mb-0.5">System Fault</p>
                <p className="text-xs lg:text-sm font-bold opacity-80">{error}</p>
              </div>
            </div>
          )}

          {currentView === 'overview' ? (
            <OverviewView latestEntry={latestEntry} isLoading={loading} />
          ) : (
            <ComparisonView data={comparisonData} furnace={effectiveFurnace} />
          )}
        </div>
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
    <div className="space-y-12 lg:space-y-16 animate-in fade-in slide-in-from-top-4 duration-1000">
      <section>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 lg:mb-8 gap-4">
          <h2 className="text-xl lg:text-2xl font-black flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg lg:rounded-xl"><Thermometer size={20} /></div>
            Temperature Profile
          </h2>
          <div className="flex items-center gap-2.5 px-4 lg:px-5 py-2 lg:py-2.5 bg-white border border-slate-100 rounded-xl text-[8px] lg:text-[9px] font-black text-slate-400 shadow-sm w-full md:w-auto">
            <Clock size={12} className="text-orange-500" /> SYNC: {latestEntry['ประทับเวลา']}
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <CrossSectionGrid title="Cone Temperature Profile" data={getGridData('Cone')} color="red" />
          <CrossSectionGrid title="Ring Temperature Profile" data={getGridData('Ring')} color="orange" />
        </div>
      </section>

      <section>
        <h2 className="text-xl lg:text-2xl mb-6 lg:mb-8 font-black flex items-center gap-3 text-slate-800">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg lg:rounded-xl"><Wind size={20} /></div>
          Atmosphere Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <ChartCard title="% Oxygen (O2)" data={formatGasData('%O2')} color="#3b82f6" unit="%" />
          <ChartCard title="% Carbon Dioxide (CO2)" data={formatGasData('%CO2')} color="#8b5cf6" unit="%" />
          <ChartCard title="Carbon Monoxide (CO)" data={formatGasData('CO(ppm)')} color="#ef4444" unit="ppm" />
        </div>
      </section>

      <section>
        <h2 className="text-xl lg:text-2xl mb-6 lg:mb-8 font-black flex items-center gap-3 text-slate-800">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg lg:rounded-xl"><ShieldCheck size={20} /></div>
          Gas Leakage Inspection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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
    <div className="space-y-6 lg:space-y-8 animate-in slide-in-from-right-4 duration-1000 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 lg:gap-6 mb-2">
        <div className="bg-white p-1 lg:p-1.5 rounded-xl lg:rounded-2xl flex gap-1 shadow-xl shadow-slate-200/40 border border-slate-100/50 overflow-x-auto no-scrollbar">
          <TabButton active={activeTab === 'thermal'} label="CONE&RING" icon={<Thermometer size={14} />} onClick={() => setActiveTab('thermal')} />
          <TabButton active={activeTab === 'gas'} label="GAS ANALYTICS" icon={<Wind size={14} />} onClick={() => setActiveTab('gas')} />
          <TabButton active={activeTab === 'safety'} label="GAS LEAKAGE" icon={<Activity size={14} />} onClick={() => setActiveTab('safety')} />
        </div>
        <div className="px-4 py-2 bg-[#0f172a] text-white rounded-xl text-[10px] lg:text-[10px] font-black uppercase tracking-widest shadow-xl ring-1 ring-slate-700 text-center">
          Source: {furnace} DATA
        </div>
      </div>

      {activeTab === 'thermal' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 animate-in fade-in zoom-in duration-700">
          {positions.map(pos => (
            <div key={pos} className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-500 group">
              <div className="flex items-center justify-between mb-3 lg:mb-4 border-b border-slate-50 pb-2 lg:pb-3">
                <h4 className="text-[9px] lg:text-[10px] font-black text-slate-800 uppercase tracking-widest">{pos}</h4>
                <div className="flex gap-1.5 lg:gap-2">
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-red-500"></span>
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-orange-400"></span>
                </div>
              </div>
              <div className="h-[150px] lg:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} hide domain={[1000, 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '9px', fontWeight: 800 }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey={`Cone_${pos}`} name="Cone" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey={`Ring_${pos}`} name="Ring" fill="#fb923c" radius={[3, 3, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'gas' && <GasTabContent data={data} />}
      {activeTab === 'safety' && <SafetyView data={data} />}
    </div>
  );
};

// --- GAS CONTENT COMPONENT ---

const GasTabContent = ({ data }) => {
  const [selectedOp, setSelectedOp] = useState('0'); // '0', '50', '100'

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* OP Selection Tabs */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner">
          {['0', '50', '100'].map(op => (
            <button
              key={op}
              onClick={() => setSelectedOp(op)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedOp === op ? 'bg-white text-slate-900 shadow-md scale-[1.05]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              OP = {op}%
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 lg:p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg lg:text-xl">
            Atmosphere Analysis <span className="text-orange-500 text-sm ml-2">(OP={selectedOp}%)</span>
          </h3>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-200"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Z1</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Z2</span></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-50">
          {['o2', 'co2', 'co'].map(metric => (
            <div key={metric} className="p-6 lg:p-8 group hover:bg-slate-50/50 transition-colors">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 lg:mb-6 flex items-center gap-2">
                <Wind size={12} className="text-orange-500" />
                {metric.toUpperCase()} {metric === 'co' ? '(ppm)' : '(%)'}
              </h4>
              <div className="h-[280px] lg:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} unit={metric === 'co' ? '' : '%'} />
                    <Tooltip
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey={`z1_${metric}_${selectedOp}`} name="Z1" fill="#f97316" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar dataKey={`z2_${metric}_${selectedOp}`} name="Z2" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-slate-100 overflow-x-auto">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 font-black text-slate-800 text-xs uppercase tracking-widest">
          Comprehensive Monthly Log (All OP Levels)
        </div>
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-[#0f172a] text-white font-black text-[9px] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4 text-center">OP</th>
              <th className="px-6 py-4 text-center bg-blue-600/20">Oxygen (Z1|Z2)</th>
              <th className="px-6 py-4 text-center bg-purple-600/20">CO2 (Z1|Z2)</th>
              <th className="px-6 py-4 text-center bg-red-600/20">CO (Z1|Z2)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
            {data.map(m => (
              <React.Fragment key={m.month}>
                <tr className="bg-slate-50/50">
                  <td rowSpan={4} className="px-6 py-4 text-slate-900 border-r border-slate-100 font-black text-xs">{m.month}</td>
                </tr>
                {['0', '50', '100'].map(op => (
                  <tr key={`${m.month}-${op}`} className="hover:bg-slate-50 transition-all cursor-default">
                    <td className="px-6 py-2 text-center text-[10px] text-slate-400 font-black">{op}%</td>
                    <td className="px-6 py-2 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">{m[`z1_o2_${op}`]}%</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{m[`z2_o2_${op}`]}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md">{m[`z1_co2_${op}`]}%</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{m[`z2_co2_${op}`]}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md">{m[`z1_co_${op}`]}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{m[`z2_co_${op}`]}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SafetyView = ({ data }) => {
  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8 mb-6 lg:mb-8">
        <SafetyMetricCard label="Main Gas" value={data[data.length - 1]?.main} data={data} dataKey="main" color="#10b981" />
        <SafetyMetricCard label="Firing zone1" value={data[data.length - 1]?.z1} data={data} dataKey="z1" color="#f59e0b" />
        <SafetyMetricCard label="Firing zone2" value={data[data.length - 1]?.z2} data={data} dataKey="z2" color="#ef4444" />
      </div>

      <div className="bg-white rounded-3xl lg:rounded-[48px] shadow-sm border border-slate-100 overflow-x-auto">
        <div className="p-6 lg:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-black text-slate-900 text-base lg:text-xl tracking-tighter uppercase">Safety Log</h3>
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[8px] lg:text-[10px] font-black rounded-lg border border-emerald-100 shrink-0 ml-4">
            ACTIVE
          </div>
        </div>
        <table className="w-full text-left min-w-[700px]">
          <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
            <tr>
              <th className="px-8 py-5">Month</th>
              <th className="px-8 py-5">Rating</th>
              <th className="px-8 py-5 text-center">Main Gas</th>
              <th className="px-8 py-5 text-center">Firing zone1</th>
              <th className="px-8 py-5 text-center">Firing zone2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold text-[11px] text-slate-600">
            {data.map(m => (
              <tr key={m.month} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-8 py-4 text-slate-900">{m.month}</td>
                <td className="px-8 py-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${m.safetyRating === 'Perfect' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${m.safetyRating === 'Perfect' ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`}></div>
                    {m.safetyStatus || m.safetyRating}
                  </div>
                </td>
                <td className="px-8 py-4 text-center text-slate-400 group-hover:text-slate-900">{m.main}</td>
                <td className="px-8 py-4 text-center text-slate-400 group-hover:text-slate-900">{m.z1}</td>
                <td className="px-8 py-4 text-center text-slate-400 group-hover:text-slate-900">{m.z2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- COMPACT COMPONENTS ---

const NavItem = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`
    w-full flex items-center p-3 rounded-2xl transition-all duration-300 group/nav relative
    ${active ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
    ${collapsed ? 'justify-center' : 'gap-4 px-5'}
  `}>
    <div className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover/nav:scale-110'}`}>
      {icon}
    </div>
    <span className={`font-bold whitespace-nowrap text-[11px] uppercase tracking-widest transition-all duration-500 origin-left overflow-hidden ${collapsed ? 'opacity-0 w-0 scale-x-0' : 'opacity-100 w-auto scale-x-100'}`}>
      {label}
    </span>
    {collapsed && active && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-orange-500 rounded-l-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
    )}
  </button>
);

const TabButton = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`
    flex items-center gap-2 px-5 lg:px-8 py-2.5 lg:py-3.5 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all duration-300 shrink-0
    ${active ? 'bg-[#0f172a] text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}
  `}>
    {icon} <span className="ml-1.5 hidden sm:inline">{label}</span>
  </button>
);

const SafetyMetricCard = ({ label, value, data, dataKey, color }) => (
  <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-500 group">
    <div className="flex items-center justify-between mb-4 lg:mb-6">
      <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
        <Activity size={12} />
      </div>
    </div>
    <div className="flex items-end justify-between gap-3 lg:gap-4">
      <div>
        <p className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter">{value || 0}</p>
        <p className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase mt-0.5 lg:mt-1">PPM</p>
      </div>
      <div className="flex-1 h-10 lg:h-12 -mb-1 lg:-mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const CrossSectionGrid = ({ title, data, color }) => (
  <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[48px] shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-1000 group">
    <div className="flex items-center justify-between mb-6 lg:mb-8">
      <h3 className="font-black text-slate-900 uppercase tracking-widest text-[9px] lg:text-[10px] flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
        {title}
      </h3>
    </div>
    <div className="grid grid-cols-3 gap-3 lg:gap-4">
      {data.flat().map((item, i) => (
        <div key={i} className="bg-slate-50/50 rounded-2xl p-4 lg:p-5 text-center border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-500 group/item">
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-1 tracking-tighter opacity-70 truncate">{item.label}</p>
          <div className={`text-sm lg:text-xl font-black ${parseFloat(item.value) > 0 ? (color === 'red' ? 'text-slate-900' : 'text-slate-800') : 'text-slate-200'}`}>
            {item.value || '-'}
            {parseFloat(item.value) > 0 && <span className="text-[8px] ml-0.5 font-bold opacity-30">°C</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ChartCard = ({ title, data, color, unit }) => (
  <div className="bg-white p-6 lg:p-8 rounded-2xl lg:rounded-[48px] shadow-sm border border-slate-100 flex flex-col h-[320px] lg:h-[380px] hover:shadow-lg transition-all duration-700">
    <h3 className="font-black text-slate-900 mb-6 lg:mb-8 flex items-center gap-2.5 text-[9px] lg:text-[10px] uppercase tracking-widest truncate">
      <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}10`, color: color }}><Wind size={14} /></div>
      {title}
    </h3>
    <div className="flex-1 w-full -ml-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="op" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#cbd5e1' }} unit={unit === '%' ? '%' : ''} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '9px' }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '9px', fontWeight: 800 }} />
          <Line name="Z1" type="monotone" dataKey="z1" stroke={color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
          <Line name="Zone 2" type="monotone" dataKey="z2" stroke="#64748b" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const LeakCard = ({ label, status, value }) => {
  const isNormal = str => String(str || '').toLowerCase() === 'normal';
  return (
    <div className={`p-6 lg:p-8 rounded-2xl lg:rounded-[48px] transition-all border-2 group ${isNormal(status) ? 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm' : 'bg-red-50 border-red-200 shadow-lg'}`}>
      <div className="flex justify-between items-start mb-6 lg:mb-8">
        <div className="min-w-0">
          <p className={`font-black text-[9px] lg:text-[10px] uppercase tracking-widest truncate ${isNormal(status) ? 'text-slate-400' : 'text-red-500'}`}>{label}</p>
          <p className="text-[7px] text-slate-300 font-bold mt-1 uppercase tracking-widest">SENS_NODE</p>
        </div>
        <div className={`p-2 lg:p-3 rounded-xl shrink-0 ${isNormal(status) ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-red-600 animate-pulse'}`}>
          {isNormal(status) ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-2xl lg:text-4xl font-black tracking-tighter ${isNormal(status) ? 'text-slate-900' : 'text-red-800'}`}>{value !== null ? value : '-'}</p>
          <p className="text-[7px] font-black text-slate-400 mt-1 uppercase tracking-widest">PPM CONTENT</p>
        </div>
        <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase shadow-md ${isNormal(status) ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {status || 'UNK'}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-10">
    <div className="h-40 lg:h-48 bg-slate-200 rounded-3xl w-full"></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-[300px] lg:h-[400px] bg-slate-200 rounded-3xl"></div>
      <div className="h-[300px] lg:h-[400px] bg-slate-200 rounded-3xl"></div>
    </div>
  </div>
);

const NoDataState = () => (
  <div className="flex flex-col items-center justify-center py-24 lg:py-40 border-2 border-dashed border-slate-200 rounded-3xl lg:rounded-[64px] bg-slate-50/20 text-center px-4">
    <div className="p-6 bg-white shadow-xl text-slate-300 rounded-2xl mb-6">
      <Filter size={40} />
    </div>
    <h3 className="text-xl font-black text-slate-800 mb-2 uppercase">No Data Found</h3>
    <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] lg:text-[9px]">Check filters to sync content</p>
  </div>
);

export default App;
