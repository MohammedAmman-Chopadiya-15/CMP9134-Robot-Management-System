import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LogOut, History, Cpu, Battery, Activity, Target, MapPin, Zap, ShieldAlert, RotateCcw } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [mapData, setMapData] = useState(null);
  const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [robotOnline, setRobotOnline] = useState(false);
  const [missions, setMissions] = useState([]);
  const [telemetry, setTelemetry] = useState({ id: "---", battery: 0, state: "UNKNOWN" });
  const [manualInput, setManualInput] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const isViewer = user.role === 'viewer';

  useEffect(() => {
    const fetchData = async () => {
      if (isProcessing) return;
      try {
        const robotRes = await axios.get('http://127.0.0.1:8000/missions/status');
        setRobotOnline(robotRes.data.connected);

        if (robotRes.data.connected) {
          const details = robotRes.data.details;
          setTelemetry({ id: details.id, battery: details.battery, state: details.status });
          setRobotPos({ x: details.position.x, y: details.position.y });
        }
        if (!mapData) {
          const mapRes = await axios.get('http://127.0.0.1:8000/missions/map');
          setMapData(mapRes.data.grid);
        }
        const historyRes = await axios.get('http://127.0.0.1:8000/missions/history');
        setMissions(historyRes.data.slice(0, 15));
        setBackendStatus("Systems Nominal");
      } catch (err) {
        setRobotOnline(false);
        setBackendStatus("Link Error");
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 500); 
    return () => clearInterval(interval);
  }, [mapData, isProcessing]);

  const handleMove = async (direction) => {
    if (!robotOnline || telemetry.battery <= 0 || !mapData || isProcessing || isViewer) return;
    setIsProcessing(true);
    try {
      await axios.post('http://127.0.0.1:8000/missions/move', { username: user.username, direction });
    } finally { setIsProcessing(false); }
  };

  const handleGoTo = async (e) => {
    e.preventDefault();
    if (!robotOnline || telemetry.battery <= 0 || !mapData || isProcessing || isViewer) return;
    setIsProcessing(true);
    try {
      await axios.post('http://127.0.0.1:8000/missions/move', {
        username: user.username, direction: "manual", target_x: parseInt(manualInput.x), target_y: parseInt(manualInput.y)
      });
    } finally { setIsProcessing(false); }
  };

  const renderGrid = () => {
    if (!mapData) return <div className="text-slate-500 animate-pulse font-mono uppercase tracking-widest">Linking Satellite Feed...</div>;
    return (
      <div className="aspect-square h-full grid grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] bg-slate-950 border-[3px] border-slate-800 rounded-sm overflow-hidden shadow-2xl">
        {mapData.map((row, y) => row.map((cell, x) => {
          const isObstacle = cell === 1;
          const isRobotHere = robotPos.x === x && robotPos.y === (20 - y);
          return (
            <div 
              key={`${x}-${y}`} 
              className={`aspect-square border-[0.5px] border-slate-800/30 flex items-center justify-center transition-all duration-300 
                ${isRobotHere ? 'bg-blue-600 text-white z-20 scale-110 shadow-lg' : isObstacle ? 'bg-slate-950' : 'bg-slate-100'}`}
            >
              {isRobotHere && <Bot size="70%" strokeWidth={2.5} className={telemetry.state === 'MOVING' ? "animate-pulse" : ""} />}
            </div>
          );
        }))}
      </div>
    );
  };

  const handleReset = async () => {
  if (isProcessing || isViewer) return;
  
  if (!window.confirm("Perform full system reset? This will clear all errors and refill battery.")) return;

  setIsProcessing(true);
  try {
    const res = await axios.post(`http://127.0.0.1:8000/missions/reset?username=${user.username}`);
    if (res.data.status === "SUCCESS") {
      // The telemetry heartbeat will pick up the (0,0) position and 100% battery automatically
      console.log("System rebooted");
    }
  } catch (err) {
    alert(err.response?.data?.detail || "Reset failed");
  } finally {
    setIsProcessing(false);
  } };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col p-6 overflow-hidden font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex-none flex justify-between items-center mb-6 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-800">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={28} />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Mission Control</h1>
            <div className="flex flex-col ml-2">
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${robotOnline ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} font-bold uppercase tracking-tighter`}>
                {backendStatus}
              </span>
            </div>
          </div>
          <div className="flex gap-6 border-l border-slate-800 pl-8 font-mono text-[10px] uppercase tracking-wider text-slate-400">
             ID: <span className="text-blue-400 font-bold">{user.username}</span> | Access: <span className={isViewer ? "text-slate-500" : "text-amber-500 font-bold"}>{user.role}</span>
          </div>
        </div>
        
        {/* TELEMETRY BOXES */}
        <div className="flex items-center gap-4">
          {/* Battery Box */}
          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Power Level</span>
              <div className="flex items-center gap-3">
                <Zap size={14} className={telemetry.battery > 20 ? "text-green-400" : "text-red-500 animate-pulse"} />
                <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className={`h-full transition-all duration-700 ${telemetry.battery > 20 ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-red-500"}`} style={{width: `${telemetry.battery}%`}} />
                </div>
                <span className="text-xs font-mono font-bold text-slate-200">{telemetry.battery}%</span>
              </div>
            </div>
          </div>

          {/* Status Box */}
          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">System State</span>
              <div className="flex items-center gap-2">
                {telemetry.state === 'STUCK' || telemetry.state === 'LOW_BATTERY' ? <ShieldAlert size={14} className="text-red-500 animate-bounce" /> : <Cpu size={14} className="text-blue-400" />}
                <span className={`text-xs font-black uppercase tracking-tighter ${
                  telemetry.state === 'MOVING' ? 'text-green-400 animate-pulse' : 
                  telemetry.state === 'STUCK' ? 'text-red-500' : 'text-blue-400'
                }`}>
                  {telemetry.state}
                </span>
              </div>
            </div>
          </div>

          <button onClick={() => setUser(null)} className="p-4 bg-slate-800 hover:bg-red-900/40 rounded-2xl text-slate-400 hover:text-red-400 transition-all border border-slate-700 shadow-lg active:scale-90">
            <LogOut size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 w-full overflow-hidden">
        {/* MAP PANEL */}
        <div className="flex-[2.5] bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-800 flex items-center justify-center p-16 overflow-hidden">
           {renderGrid()}
        </div>

        {/* SIDEBAR PANEL */}
        <div className="w-[380px] flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-xl border border-slate-800 flex-none relative">
            {isViewer && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Commander Access Required</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4 text-blue-500">
              <Target size={20} />
              <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest">Targeting System</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase">X-Coord</p>
                <p className="text-xl font-mono font-bold text-blue-400">{robotPos.x}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase">Y-Coord</p>
                <p className="text-xl font-mono font-bold text-blue-400">{robotPos.y}</p>
              </div>
            </div>
            <form onSubmit={handleGoTo} className="space-y-3">
              <div className="flex gap-3">
                <input type="number" value={manualInput.x} onChange={(e) => setManualInput({...manualInput, x: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-30" min="0" max="20" placeholder="X" disabled={isViewer} />
                <input type="number" value={manualInput.y} onChange={(e) => setManualInput({...manualInput, y: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-30" min="0" max="20" placeholder="Y" disabled={isViewer} />
              </div>
              <button type="submit" disabled={!robotOnline || isProcessing || isViewer} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] py-3 rounded-xl transition-all disabled:opacity-20 flex items-center justify-center gap-2 shadow-xl uppercase tracking-widest">
                <MapPin size={14} /> Execute Path
              </button>
            </form>
          </div>

          <div className="bg-slate-900 p-4 rounded-[2.5rem] shadow-xl border border-slate-800 flex-none">
            <div className="grid grid-cols-3 gap-2 max-w-[140px] mx-auto">
              <div />
              <NavButton icon={<ChevronUp />} onClick={() => handleMove('north')} disabled={!robotOnline || isProcessing || isViewer} />
              <div />
              <NavButton icon={<ChevronLeft />} onClick={() => handleMove('west')} disabled={!robotOnline || isProcessing || isViewer} />
              <div className="flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${robotOnline ? "bg-blue-500 animate-ping" : "bg-slate-700"}`} />
              </div>
              <NavButton icon={<ChevronRight />} onClick={() => handleMove('east')} disabled={!robotOnline || isProcessing || isViewer} />
              <div />
              <NavButton icon={<ChevronDown />} onClick={() => handleMove('south')} disabled={!robotOnline || isProcessing || isViewer} />
              <div />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-[2.5rem] shadow-xl border border-slate-800 flex-none">
            <button 
              onClick={handleReset}
              disabled={!robotOnline || isProcessing || isViewer}
              className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] py-3 rounded-xl transition-all disabled:opacity-10 flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg"
            >
              <RotateCcw size={14} className={isProcessing ? "animate-spin" : ""} /> 
              System Emergency Reset
            </button>
          </div>

          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-xl border border-slate-800 flex-1 flex flex-col min-h-0">
            <h2 className="text-[10px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                <History size={16} /> Data Stream
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar scrollbar-hide">
              {missions.map(m => (
                <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                  <span className="font-mono font-bold text-[10px] text-slate-200 uppercase">{m.command}</span>
                  <span className="text-[9px] font-bold text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className="aspect-square flex items-center justify-center bg-slate-800 rounded-xl text-slate-300 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-10 border border-slate-700 p-2 active:scale-90">
    {React.cloneElement(icon, { size: 20, strokeWidth: 3 })}
  </button>
);

export default Dashboard;