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

  useEffect(() => {
    const checkConnections = async () => {
      try {
        // 1. Check Backend Connectivity
        const statusRes = await axios.get('http://127.0.0.1:8000/');
        setBackendStatus(statusRes.data.message);
        
        // 2. Check Robot Hardware & Get Detailed Status (Battery/ID/State)
        const robotRes = await axios.get('http://127.0.0.1:8000/missions/status');
        setRobotOnline(robotRes.data.connected);

        if (robotRes.data.connected) {
          const details = robotRes.data.details;
          setTelemetry({
            id: details.id,
            battery: details.battery,
            state: details.status
          });
          // Sync real-time position from hardware
          setRobotPos({ x: details.position.x, y: details.position.y });
        }

        // 3. Fetch Map Data (Obstacles)
        const mapRes = await axios.get('http://127.0.0.1:8000/missions/map');
        setMapData(mapRes.data.grid);

        // 4. Fetch Mission History from DB
        const historyRes = await axios.get('http://127.0.0.1:8000/missions/history');
        setMissions(historyRes.data.slice(0, 8));

      } catch (err) {
        setBackendStatus("Backend Offline");
        setRobotOnline(false);
      }
    };

    checkConnections();
    const interval = setInterval(checkConnections, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleMove = async (direction) => {
    if (!robotOnline || telemetry.battery <= 0) return;
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/missions/move', {
        username: user.username,
        direction: direction 
      });

      if (res.data.status === "SUCCESS") {
        // Local optimistic update for smoother UI
        setRobotPos(prev => {
          let { x, y } = prev;
          if (direction === 'north' && y < 20) y++;
          if (direction === 'south' && y > 0) y--;
          if (direction === 'east' && x < 20) x++;
          if (direction === 'west' && x > 0) x--;
          return { x, y };
        });
      }
    } catch (err) {
      console.error("Move failed:", err.response?.data?.detail);
    }
  };

  const renderGrid = () => {
    if (!mapData) return <div className="p-20 text-slate-500 animate-pulse font-mono text-xl">INITIALIZING_MAP_ARRAY...</div>;

    const cells = [];
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        const isObstacle = mapData[y][x] === 1;
        // Adjust for coordinate system: y=0 in array is top of grid (y=20 in cartesian)
        const isRobotHere = robotPos.x === x && robotPos.y === (20 - y);
        
        cells.push(
          <div 
            key={`${x}-${y}`} 
            className={`w-5 h-5 md:w-7 md:h-7 border-[0.5px] border-slate-800/30 flex items-center justify-center transition-all duration-500
              ${isRobotHere ? 'bg-blue-600 text-white z-20 scale-125 shadow-[0_0_20px_rgba(37,99,235,0.6)] rounded-sm' : 
                isObstacle ? 'bg-slate-950' : 'bg-slate-50'}`}
          >
            {isRobotHere && <Bot size={18} strokeWidth={2.5} className="animate-bounce" />}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-800 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
            <Activity className="text-blue-500" /> MISSION CONTROL
          </h1>
          <p className="text-slate-500 text-xs font-mono mt-1 uppercase tracking-widest">
            Operator: <span className="text-blue-400">{user.username}</span> | Access: <span className="text-amber-500">{user.role}</span>
          </p>
          
          {/* TELEMETRY BAR */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Battery size={14} className={telemetry.battery > 20 ? "text-green-500" : "text-red-500"} />
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${telemetry.battery > 20 ? "bg-green-500" : "bg-red-500"}`} style={{width: `${telemetry.battery}%`}} />
              </div>
              <span className="text-[10px] font-bold font-mono">{telemetry.battery}%</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase">State:</span>
              <span className={`text-[10px] font-black uppercase ${telemetry.state === 'MOVING' ? 'text-green-400' : 'text-blue-400'}`}>
                {telemetry.state}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800">
                <Cpu size={18} className={robotOnline ? "text-green-400" : "text-red-500"} />
                <span className={`text-xs font-black tracking-widest ${robotOnline ? "text-green-400" : "text-red-500"}`}>
                    {robotOnline ? "Online" : "Disconnected"}
                </span>
            </div>
            <button onClick={() => setUser(null)} className="p-3 bg-slate-800 hover:bg-red-900/40 rounded-2xl text-slate-400 hover:text-red-400 transition-all border border-slate-700">
                <LogOut size={22} />
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* GRID MAP CONTAINER */}
        <div className="lg:col-span-8 flex justify-center items-center bg-slate-900 p-2 md:p-6 rounded-[2.5rem] shadow-2xl border border-slate-800 min-h-[600px]">
          <div className="inline-grid grid-cols-[repeat(21,minmax(0,1fr))] bg-slate-950 border-[3px] border-slate-800 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {renderGrid()}
          </div>
        </div>

        {/* SIDEBAR: CONTROLS & HISTORY */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* NAVIGATION PAD */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-800">
            <h2 className="text-sm font-black mb-8 text-slate-500 uppercase tracking-widest text-center">Tactical Navigation</h2>
            <div className="grid grid-cols-3 gap-4 max-w-[200px] mx-auto">
              <div />
              <NavButton icon={<ChevronUp />} onClick={() => handleMove('north')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
              <NavButton icon={<ChevronLeft />} onClick={() => handleMove('west')} disabled={!robotOnline || user.role !== 'commander'} />
              <div className="flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${robotOnline ? "bg-blue-500 animate-ping" : "bg-slate-700"}`} />
              </div>
              <NavButton icon={<ChevronRight />} onClick={() => handleMove('east')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
              <NavButton icon={<ChevronDown />} onClick={() => handleMove('south')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
            </div>
          </div>

          {/* MISSION LOGS */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-800 flex-1 overflow-hidden">
            <h2 className="text-xs font-black text-slate-500 uppercase mb-6 flex items-center gap-2 tracking-widest">
                <History size={16} /> Data Log History
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {missions.length === 0 ? <p className="text-slate-600 italic text-xs py-4 text-center">No telemetry logs recorded.</p> : 
                missions.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span className="font-mono font-bold text-[11px] text-slate-200 tracking-tighter uppercase">{m.command}</span>
                    <span className="text-[9px] font-bold text-slate-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
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

// HELPER COMPONENT: BUTTON STYLING
const NavButton = ({ icon, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className="aspect-square flex items-center justify-center bg-slate-800 rounded-2xl text-slate-300 hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-10 disabled:grayscale shadow-lg border border-slate-700"
  >
    {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
  </button>
);

export default Dashboard;