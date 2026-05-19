import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  LogOut, History, Cpu, Activity, Target, 
  Zap, ShieldAlert, RotateCcw, BatteryLow 
} from 'lucide-react';

const Dashboard = ({ user, token, onLogout }) => {
  const [mapData, setMapData] = useState(null);
  const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
  const [backendStatus, setBackendStatus] = useState("Connecting...");
  const [robotOnline, setRobotOnline] = useState(false);
  const [missions, setMissions] = useState([]);
  const [telemetry, setTelemetry] = useState({ id: "---", battery: 0, state: "IDLE" });
  const [manualInput, setManualInput] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const isViewer = user.role === 'viewer';

  // --- 🛠️ ROBUSTNESS DERIVED STATES ---
  const isBatteryDead = robotOnline && telemetry.battery === 0;
  const isLowBattery = robotOnline && telemetry.battery > 0 && telemetry.battery < 20;
  const isSystemStuck = telemetry.state === 'STUCK';

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

  const refreshMap = useCallback(async () => {
    try {
      const mapRes = await axios.get('http://127.0.0.1:8000/missions/map', getAuthHeader());
      setMapData(mapRes.data.grid);
    } catch (err) {
      console.error("Map sync failed", err);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (!token) {
      onLogout();
      return;
    }

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

        await refreshMap();
        await refreshHistory();
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };

    fetchStaticData();
    return () => socket.close();
  }, [token, onLogout, refreshHistory, refreshMap, getAuthHeader]); // Added refreshMap to dependencies

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
    if (!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer) return;
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
      
      await refreshMap();
      await refreshHistory();
      
    } finally { 
      setIsProcessing(false); 
    }
  };

const renderGrid = () => {
    if (!mapData) return <div className="text-slate-500 animate-pulse font-mono uppercase tracking-widest text-sm">Linking Satellite Feed...</div>;
    
    const displayGrid = [...mapData].reverse();
    const axisLabels = Array.from({ length: 21 }, (_, i) => i);

    return (
      <div className="relative p-10 bg-slate-900/50 rounded-3xl border border-slate-800/50 shadow-inner">
        <div className="absolute left-3 top-10 bottom-10 w-6 grid grid-rows-[repeat(21,1fr)] text-[10px] font-mono font-bold text-white">
          {axisLabels.slice().reverse().map(label => (
            <div key={label} className="flex items-center justify-center">{label}</div>
          ))}
        </div>

        <div className="aspect-square h-[550px] grid grid-cols-[repeat(21,1fr)] grid-rows-[repeat(21,1fr)] bg-slate-950 border-[3px] border-slate-800 rounded-sm overflow-hidden shadow-2xl relative">
          {displayGrid.map((row, visualY) => {
            const hardwareY = 20 - visualY;
            return row.map((cell, x) => {
              const isObstacle = cell === 1;
              const isRobotHere = robotPos.x === x && robotPos.y === hardwareY;
              
              return (
                <div 
                  key={`${x}-${hardwareY}`} 
                  className={`relative aspect-square border-[0.5px] border-slate-800/20 flex items-center justify-center transition-all duration-300 group
                  ${isRobotHere ? 'bg-blue-600 text-white z-20 scale-110 shadow-lg' : isObstacle ? 'bg-slate-950' : 'bg-slate-100/90'}`}
                >
                  <span className={`absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold pointer-events-none transition-opacity
                    ${isRobotHere ? 'text-blue-100 opacity-60' : isObstacle ? 'text-slate-800 opacity-0' : 'text-blue-600 opacity-0 group-hover:opacity-100'}`}>
                    {x},{hardwareY}
                  </span>
                  {isRobotHere && (
                    <Bot size="75%" strokeWidth={2.5} className={telemetry.state === 'MOVING' ? "animate-pulse" : ""} />
                  )}
                </div>
              );
            });
          })}
        </div>

        <div className="absolute left-10 right-10 bottom-3 h-6 grid grid-cols-[repeat(21,1fr)] text-[10px] font-mono font-bold text-white">
          {axisLabels.map(label => (
            <div key={label} className="flex items-center justify-center">{label}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col p-6 overflow-hidden font-sans relative">
      
      {/* 🚀 ROBUSTNESS FEATURE: BATTERY DEAD OVERLAY (ONLY) */}
      {isBatteryDead && (
        <div className="absolute inset-0 z-[101] bg-red-950/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300">
          <div className="bg-slate-900 p-10 rounded-[3rem] border-2 border-red-600 shadow-[0_0_60px_rgba(220,38,38,0.4)] text-center max-w-md">
            <BatteryLow size={64} className="text-red-600 mx-auto mb-6 animate-bounce" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Power Depleted</h2>
            <p className="text-red-400 text-sm mb-8 font-mono font-bold uppercase tracking-widest">Robot shut down due to 0% battery. Manual recovery required.</p>
            <button 
                onClick={handleReset}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95"
            >
                Emergency Recharge & Reset
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex-none flex justify-between items-center mb-6 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-800">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={28} />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">Mission Control</h1>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors duration-500 ${
                robotOnline ? 'border-green-500/50 text-green-400 bg-green-500/5' : 'border-red-500/50 text-red-400 bg-red-500/5'
            } font-bold uppercase ml-2`}>
              {backendStatus}
            </span>
          </div>
          <div className="flex gap-6 border-l border-slate-800 pl-8 font-mono text-[10px] uppercase text-slate-400">
               ID: <span className="text-blue-400 font-bold">{user.username}</span> | Access: <span className={isViewer ? "text-slate-500" : "text-amber-500 font-bold"}>{user.role}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          
          {/* ⚡ BATTERY HUD WITH RED SHIFT */}
          <div className={`px-4 py-2.5 rounded-2xl border transition-all duration-300 flex flex-col shadow-inner min-w-[100px] ${
            isBatteryDead ? 'bg-red-600 border-white animate-pulse' :
            isLowBattery ? 'bg-red-950/40 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 
            'bg-slate-950 border-slate-800'
          }`}>
              <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${
                  isBatteryDead ? 'text-white' : isLowBattery ? 'text-red-400' : 'text-slate-500'
              }`}>
                {isBatteryDead ? "DEAD" : isLowBattery ? "CRITICAL" : "Power"}
              </span>
              <div className="flex items-center gap-2">
                <Zap size={12} className={isBatteryDead ? "text-white" : isLowBattery ? "text-red-500" : "text-green-400"} />
                <span className={`text-xs font-mono font-bold ${isBatteryDead ? 'text-white' : isLowBattery ? 'text-red-400' : 'text-white'}`}>
                    {telemetry.battery}%
                </span>
              </div>
          </div>

          <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 flex flex-col shadow-inner min-w-[110px]">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">System State</span>
            <div className="flex items-center gap-2">
              {isSystemStuck || isBatteryDead ? <ShieldAlert size={14} className="text-red-500 animate-bounce" /> : <Cpu size={14} className="text-blue-400" />}
              <span className={`text-xs font-black uppercase tracking-tighter ${
                telemetry.state === 'MOVING' ? 'text-green-400 animate-pulse' : 
                isSystemStuck || isBatteryDead ? 'text-red-500' : 'text-blue-400'
              }`}>
                {isBatteryDead ? "OFFLINE" : telemetry.state}
              </span>
            </div>
          </div>

          <button onClick={onLogout} className="p-4 bg-slate-800 hover:bg-red-900/40 rounded-2xl text-slate-400 hover:text-red-400 border border-slate-700 active:scale-90 shadow-lg transition-all">
            <LogOut size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 w-full overflow-hidden">
        
        <div className="flex-[2.5] bg-slate-900 rounded-[3rem] border border-slate-800 flex items-center justify-center p-12 overflow-hidden shadow-2xl gap-12 relative">
           <div className="h-full flex items-center justify-center">{renderGrid()}</div>

           <div className="flex flex-col gap-4 w-48">
              <div className="flex items-center gap-3 text-blue-500 mb-2">
                <Target size={20} />
                <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest">Live HUD</h2>
              </div>
              
              <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-inner">
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1">X-Coordinate</p>
                <p className="text-3xl font-mono font-bold text-blue-400">{robotPos.x}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-inner">
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1">Y-Coordinate</p>
                <p className="text-3xl font-mono font-bold text-blue-400">{robotPos.y}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-4">Manual Override</p>
                <form onSubmit={handleGoTo} className="space-y-3">
                  <div className="flex gap-2">
                    <input type="number" value={manualInput.x} onChange={(e) => setManualInput({...manualInput, x: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs text-white outline-none focus:border-blue-500" placeholder="X" />
                    <input type="number" value={manualInput.y} onChange={(e) => setManualInput({...manualInput, y: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-xs text-white outline-none focus:border-blue-500" placeholder="Y" />
                  </div>
                  <button type="submit" disabled={!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] py-3 rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-20">
                    GoTo
                  </button>
                </form>
              </div>
           </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-[320px] flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex-none shadow-xl relative">
            {(isViewer || isBatteryDead || !robotOnline) && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-[9px] font-black text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 uppercase tracking-widest">
                    {!robotOnline ? "Signal Lost" : isBatteryDead ? "Power Offline" : "Locked"}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-[160px] mx-auto">
              <div />
              <NavButton Icon={ChevronUp} onClick={() => handleMove('north')} disabled={!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer} />
              <div />
              <NavButton Icon={ChevronLeft} onClick={() => handleMove('west')} disabled={!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer} />
              <div className="flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full ${robotOnline && !isBatteryDead ? "bg-blue-500 animate-ping" : "bg-slate-700"}`} />
              </div>
              <NavButton Icon={ChevronRight} onClick={() => handleMove('east')} disabled={!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer} />
              <div />
              <NavButton Icon={ChevronDown} onClick={() => handleMove('south')} disabled={!robotOnline || telemetry.battery <= 0 || isProcessing || isViewer} />
              <div />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-[2.5rem] border border-slate-800 flex-none shadow-xl">
            <button onClick={handleReset} disabled={isProcessing || isViewer} className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2">
              <RotateCcw size={14} className={isProcessing ? "animate-spin" : ""} /> Emergency Reset
            </button>
          </div>

          <div className="bg-slate-900 p-5 rounded-[2.5rem] border border-slate-800 flex-1 flex flex-col min-h-0 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                <History size={16} /> Audit Trail
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {missions.map(m => (
                <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-2xl border-l-4 border-blue-600 shadow-md">
                  <span className="font-mono font-bold text-[10px] text-slate-200 uppercase">{m.command}</span>
                  <span className="text-[9px] font-bold text-slate-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ Icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className="aspect-square flex items-center justify-center bg-slate-800 rounded-2xl text-slate-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20 border border-slate-700 p-3 active:scale-90 shadow-md group">
    <Icon size={24} strokeWidth={2.5} className="group-active:scale-110 transition-transform" />
  </button>
);

export default Dashboard;