import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LogOut, History, Cpu, Battery, Activity } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [mapData, setMapData] = useState(null);
  const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [robotOnline, setRobotOnline] = useState(false);
  const [missions, setMissions] = useState([]);
  const [telemetry, setTelemetry] = useState({ id: "---", battery: 0, state: "UNKNOWN" });
  const [isProcessing, setIsProcessing] = useState(false);

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
        setMissions(historyRes.data);
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
    if (!robotOnline || telemetry.battery <= 0 || !mapData || isProcessing) return;
    setIsProcessing(true);
    try {
      await axios.post('http://127.0.0.1:8000/missions/move', { 
        username: user.username, 
        direction 
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

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col p-6 overflow-hidden font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex-none flex justify-between items-center mb-6 bg-slate-900 p-5 rounded-[2rem] shadow-2xl border border-slate-800">
        <div className="flex-1 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-500" size={28} />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Mission Control</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${robotOnline ? 'border-green-500/50 text-green-500' : 'border-red-500/50 text-red-500'}`}>
              {backendStatus}
            </span>
          </div>
          
          <div className="flex gap-6 border-l border-slate-800 pl-8">
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
              <Battery size={16} className={telemetry.battery > 20 ? "text-green-400" : "text-red-400"} />
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-700 ${telemetry.battery > 20 ? "bg-green-400" : "bg-red-400"}`} style={{width: `${telemetry.battery}%`}} />
              </div>
              <span className="text-xs font-bold font-mono">{telemetry.battery}%</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">State:</span>
              <span className={`text-xs font-black uppercase ${telemetry.state === 'MOVING' ? 'text-green-400 animate-pulse' : 'text-blue-400'}`}>
                {telemetry.state}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-2xl border ${robotOnline ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-red-500/30 bg-red-500/5 text-red-400'} flex items-center gap-2`}>
            <Cpu size={18} />
            <span className="text-xs font-black tracking-widest uppercase">ID: {telemetry.id}</span>
          </div>
          <button onClick={() => setUser(null)} className="p-4 bg-slate-800 hover:bg-red-900/40 rounded-2xl text-slate-400 hover:text-red-400 transition-all border border-slate-700 shadow-lg">
            <LogOut size={24} />
          </button>
        </div>
      </div>

      {/* BODY SECTION */}
      <div className="flex-1 flex gap-6 min-h-0 w-full overflow-hidden">
        
        {/* MAP PANEL - flex-[2.5] ensures central focus */}
        <div className="flex-[2.5] bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-800 flex items-center justify-center p-16 overflow-hidden">
           {renderGrid()}
        </div>

        {/* SIDEBAR PANEL - Removal of Targeted System here */}
        <div className="w-[380px] flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* DIRECTIONAL PAD */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-800 flex-none">
            <h2 className="text-[10px] font-black mb-8 text-slate-500 uppercase tracking-widest text-center">Tactical Override Pad</h2>
            <div className="grid grid-cols-3 gap-3 max-w-[160px] mx-auto">
              <div />
              <NavButton icon={<ChevronUp />} onClick={() => handleMove('north')} disabled={!robotOnline || isProcessing} />
              <div />
              <NavButton icon={<ChevronLeft />} onClick={() => handleMove('west')} disabled={!robotOnline || isProcessing} />
              <div className="flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${robotOnline ? "bg-blue-500 animate-ping" : "bg-slate-700"}`} />
              </div>
              <NavButton icon={<ChevronRight />} onClick={() => handleMove('east')} disabled={!robotOnline || isProcessing} />
              <div />
              <NavButton icon={<ChevronDown />} onClick={() => handleMove('south')} disabled={!robotOnline || isProcessing} />
              <div />
            </div>
            
            {/* Local Coordinate Display */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">X-Pos</p>
                <p className="text-xl font-mono font-bold text-blue-400">{robotPos.x}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Y-Pos</p>
                <p className="text-xl font-mono font-bold text-blue-400">{robotPos.y}</p>
              </div>
            </div>
          </div>

          {/* MISSION LOGS - flex-1 allows this box to fill the remaining vertical height */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-800 flex-1 flex flex-col min-h-0">
            <h2 className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                <History size={16} /> Mission Journal
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar scrollbar-hide">
              {missions.length === 0 ? <p className="text-slate-600 italic text-[10px] text-center">Awaiting telemetry...</p> : 
                missions.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span className="font-mono font-bold text-[10px] text-slate-200 uppercase">{m.command}</span>
                    <span className="text-[9px] font-bold text-slate-500 shrink-0">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className="aspect-square flex items-center justify-center bg-slate-800 rounded-2xl text-slate-300 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-10 border border-slate-700 p-2 active:scale-90 shadow-lg">
    {React.cloneElement(icon, { size: 24, strokeWidth: 3 })}
  </button>
);

export default Dashboard;