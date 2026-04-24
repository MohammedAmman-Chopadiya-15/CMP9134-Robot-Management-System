import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  LogOut, History, Cpu, Battery, Activity, Target, 
  MapPin, Zap, ShieldAlert, RotateCcw 
} from 'lucide-react';

const Dashboard = ({ user, token, onLogout }) => {
  const [mapData, setMapData] = useState(null);
  const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
  const [backendStatus, setBackendStatus] = useState("Connecting...");
  const [robotOnline, setRobotOnline] = useState(false);
  const [missions, setMissions] = useState([]);
  const [telemetry, setTelemetry] = useState({ id: "---", battery: 0, state: "UNKNOWN" });
  const [manualInput, setManualInput] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const isViewer = user.role === 'viewer';

  // ✅ Always use the freshest token for headers
  const getAuthHeader = useCallback(() => {
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  const refreshHistory = useCallback(async () => {
    try {
      const historyRes = await axios.get('http://127.0.0.1:8000/missions/history', getAuthHeader());
      setMissions(historyRes.data.slice(0, 15));
    } catch (err) {
      console.error("History sync failed", err);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (!token) {
      onLogout();
      return;
    }

    // 1. WebSocket initialization
    const socket = new WebSocket(`ws://localhost:8000/ws/telemetry?token=${token}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'TELEMETRY_UPDATE') {
        const details = message.data;
        setRobotOnline(true);
        setTelemetry({ id: details.id, battery: details.battery, state: details.status });
        setRobotPos({ x: details.position.x, y: details.position.y });
        setBackendStatus("Systems Nominal");
      }
      if (message.type === 'ERROR') {
        setRobotOnline(false);
        setBackendStatus("Signal Lost"); 
      }
    };

    const fetchStaticData = async () => {
      try {
        const mapRes = await axios.get('http://127.0.0.1:8000/missions/map', getAuthHeader());
        setMapData(mapRes.data.grid);
        await refreshHistory();
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };

    fetchStaticData();
    return () => socket.close();
  }, [token, onLogout, refreshHistory, getAuthHeader]);

  const handleMove = async (direction) => {
    if (!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer) return;
    setIsProcessing(true);
    try {
      await axios.post('http://127.0.0.1:8000/missions/move', { username: user.username, direction }, getAuthHeader());
      await refreshHistory();
    } catch (err) {
      if (err.response?.status === 401) onLogout();
    } finally { setIsProcessing(false); }
  };

  const handleGoTo = async (e) => {
    e.preventDefault();
    if (!robotOnline || isProcessing || isViewer) return;
    setIsProcessing(true);
    try {
      await axios.post('http://127.0.0.1:8000/missions/move', 
        { username: user.username, direction: "manual", target_x: parseInt(manualInput.x), target_y: parseInt(manualInput.y) }, 
        getAuthHeader()
      );
      await refreshHistory();
    } catch (err) {
      alert(err.response?.data?.detail || "Target Reachable?");
    } finally { setIsProcessing(false); }
  };

  const handleReset = async () => {
    if (isProcessing || isViewer || !window.confirm("Perform full system reset?")) return;
    setIsProcessing(true);
    try {
      await axios.post(`http://127.0.0.1:8000/missions/reset?username=${user.username}`, {}, getAuthHeader());
      await refreshHistory();
    } finally { setIsProcessing(false); }
  };

  const renderGrid = () => {
    if (!mapData) return <div className="text-slate-500 animate-pulse font-mono uppercase tracking-widest text-sm">Linking Satellite Feed...</div>;
    const displayGrid = [...mapData].reverse();
    return (
      <div className="aspect-square h-full grid grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] bg-slate-950 border-[3px] border-slate-800 rounded-sm overflow-hidden shadow-2xl">
        {displayGrid.map((row, visualY) => {
          const hardwareY = 20 - visualY;
          return row.map((cell, x) => {
            const isObstacle = cell === 1;
            const isRobotHere = robotPos.x === x && robotPos.y === hardwareY;
            return (
              <div 
                key={`${x}-${hardwareY}`} 
                className={`aspect-square border-[0.5px] border-slate-800/30 flex items-center justify-center transition-all duration-300 
                ${isRobotHere ? 'bg-blue-600 text-white z-20 scale-110 shadow-lg' : isObstacle ? 'bg-slate-950' : 'bg-slate-100'}`}
              >
                {isRobotHere && <Bot size="70%" strokeWidth={2.5} className={telemetry.state === 'MOVING' ? "animate-pulse" : ""} />}
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col p-6 overflow-hidden font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex-none flex justify-between items-center mb-6 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-800">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={28} />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Mission Control</h1>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${robotOnline ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'} font-bold uppercase ml-2`}>
              {backendStatus}
            </span>
          </div>
          <div className="flex gap-6 border-l border-slate-800 pl-8 font-mono text-[10px] uppercase text-slate-400">
             ID: <span className="text-blue-400 font-bold">{user.username}</span> | Access: <span className={isViewer ? "text-slate-500" : "text-amber-500 font-bold"}>{user.role}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex flex-col shadow-inner">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Power</span>
              <div className="flex items-center gap-2">
                <Zap size={12} className={telemetry.battery > 20 ? "text-green-400" : "text-red-500 animate-pulse"} />
                <span className="text-xs font-mono font-bold">{telemetry.battery}%</span>
              </div>
          </div>
          <button onClick={onLogout} className="p-4 bg-slate-800 hover:bg-red-900/40 rounded-2xl text-slate-400 hover:text-red-400 border border-slate-700 active:scale-90 shadow-lg">
            <LogOut size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 w-full overflow-hidden">
        
        {/* MAP PANEL */}
        <div className="flex-[2.5] bg-slate-900 rounded-[3rem] border border-slate-800 flex items-center justify-center p-16 overflow-hidden shadow-2xl">
           {renderGrid()}
        </div>

        {/* CONTROLS PANEL */}
        <div className="w-[380px] flex flex-col gap-4 min-h-0 overflow-hidden">
          
          <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-slate-800 flex-none relative shadow-xl">
            {isViewer && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-[10px] font-black text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 uppercase tracking-widest">Commander Access Required</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4 text-blue-500">
              <Target size={20} />
              <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest">Targeting</h2>
            </div>
            <form onSubmit={handleGoTo} className="space-y-3">
              <div className="flex gap-3">
                <input type="number" value={manualInput.x} onChange={(e) => setManualInput({...manualInput, x: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500" placeholder="X" />
                <input type="number" value={manualInput.y} onChange={(e) => setManualInput({...manualInput, y: e.target.value})} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500" placeholder="Y" />
              </div>
              <button type="submit" disabled={!robotOnline || isProcessing} className="w-full bg-blue-600 text-white font-black text-[10px] py-3 rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Execute Path
              </button>
            </form>
          </div>

          {/* ✅ FIXED D-PAD SECTION */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 flex-none shadow-xl">
            <div className="grid grid-cols-3 gap-3 max-w-[160px] mx-auto">
              <div />
              <NavButton Icon={ChevronUp} onClick={() => handleMove('north')} disabled={!robotOnline || isProcessing || isViewer} />
              <div />
              
              <NavButton Icon={ChevronLeft} onClick={() => handleMove('west')} disabled={!robotOnline || isProcessing || isViewer} />
              <div className="flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full ${robotOnline ? "bg-blue-500 animate-ping shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-slate-700"}`} />
              </div>
              <NavButton Icon={ChevronRight} onClick={() => handleMove('east')} disabled={!robotOnline || isProcessing || isViewer} />
              
              <div />
              <NavButton Icon={ChevronDown} onClick={() => handleMove('south')} disabled={!robotOnline || isProcessing || isViewer} />
              <div />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-[2.5rem] border border-slate-800 flex-none shadow-xl">
            <button 
              onClick={handleReset} 
              disabled={!robotOnline || isProcessing || isViewer}
              className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} className={isProcessing ? "animate-spin" : ""} /> Emergency Reset
            </button>
          </div>

          {/* AUDIT TRAIL */}
          <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-slate-800 flex-1 flex flex-col min-h-0 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                <History size={16} /> Audit Trail
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {missions.map(m => (
                <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-2xl border-l-4 border-blue-600 shadow-md">
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

// ✅ UPDATED NavButton: Uses direct Icon component to guarantee visibility
const NavButton = ({ Icon, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className="aspect-square flex items-center justify-center bg-slate-800 rounded-2xl text-slate-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 border border-slate-700 p-3 active:scale-90 shadow-md group"
  >
    <Icon size={24} strokeWidth={2.5} className="group-active:scale-110 transition-transform" />
  </button>
);

export default Dashboard;