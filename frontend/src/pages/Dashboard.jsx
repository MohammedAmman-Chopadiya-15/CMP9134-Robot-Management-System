import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LogOut, History, Cpu } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {

  const [mapData, setMapData] = useState(null);
  const [robotPos, setRobotPos] = useState({ x: 10, y: 10 });
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [robotOnline, setRobotOnline] = useState(false);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        // 1. Check Backend
        const statusRes = await axios.get('http://127.0.0.1:8000/');
        setBackendStatus(statusRes.data.message);
        
        // 2. Check Robot Hardware
        const robotRes = await axios.get('http://127.0.0.1:8000/missions/status');
        setRobotOnline(robotRes.data.connected);

        // 3. Fetch Map
        const mapRes = await axios.get('http://127.0.0.1:8000/missions/map');
        setMapData(mapRes.data.grid);

        // 4. Fetch History
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
    if (!robotOnline) return;
    try {
      const res = await axios.post('http://127.0.0.1:8000/missions/move', {
        username: user.username,
        direction: direction 
      });

      if (res.data.status === "SUCCESS") {
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
      console.error("Move failed");
    }
  };

  const renderGrid = () => {
    if (!mapData) return <div className="p-20 text-slate-500 animate-pulse">INIT_MAP...</div>;

    const cells = [];
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        const isObstacle = mapData[y][x] === 1;
        const isRobotHere = robotPos.x === x && robotPos.y === (20 - y);
        
        cells.push(
          <div 
            key={`${x}-${y}`} 
            className={`w-5 h-5 md:w-6 md:h-6 border-[0.5px] border-slate-800/50 flex items-center justify-center transition-all duration-300
              ${isRobotHere ? 'bg-blue-500 text-white z-20 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.8)] rounded-sm' : 
                isObstacle ? 'bg-slate-950' : 'bg-slate-100'}`}
          >
            {/* ✅ Force the bot icon to show if isRobotHere is true */}
            {isRobotHere && <Bot size={16} strokeWidth={3} className="animate-bounce" />}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <div>
          <h1 className="text-3xl font-black tracking-tight">MISSION CONTROL</h1>
          <p className="text-slate-400 text-sm">USER: <span className="text-blue-400 font-mono">{user.username}</span> | ROLE: <span className="text-amber-400 font-mono">{user.role}</span></p>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full border border-slate-700">
                <Cpu size={18} className={robotOnline ? "text-green-400" : "text-red-400"} />
                <span className={`text-xs font-bold ${robotOnline ? "text-green-400" : "text-red-400"}`}>
                    {robotOnline ? "ROBOT ONLINE" : "ROBOT OFFLINE"}
                </span>
            </div>
            <button onClick={() => setUser(null)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all">
                <LogOut size={24} />
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* The Grid Map */}
        <div className="lg:col-span-2 flex justify-center items-center bg-slate-800 p-4 rounded-3xl shadow-2xl border border-slate-700">
          <div className="inline-grid grid-cols-[repeat(21,minmax(0,1fr))] bg-slate-900 border-2 border-slate-950">
            {renderGrid()}
          </div>
        </div>

        {/* Controls & Logs */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-6 text-slate-300">NAVIGATION</h2>
            <div className="grid grid-cols-3 gap-4 max-w-[220px] mx-auto">
              <div />
              <NavButton icon={<ChevronUp />} onClick={() => handleMove('north')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
              <NavButton icon={<ChevronLeft />} onClick={() => handleMove('west')} disabled={!robotOnline || user.role !== 'commander'} />
              <div className="flex items-center justify-center text-xs font-black text-slate-600">OS</div>
              <NavButton icon={<ChevronRight />} onClick={() => handleMove('east')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
              <NavButton icon={<ChevronDown />} onClick={() => handleMove('south')} disabled={!robotOnline || user.role !== 'commander'} />
              <div />
            </div>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700 flex-1">
            <h2 className="text-sm font-black text-slate-500 uppercase mb-6 flex items-center gap-2">
                <History size={18} /> RECENT LOGS
            </h2>
            <div className="space-y-4">
              {missions.length === 0 ? <p className="text-slate-500 italic text-sm text-center">No mission data.</p> : 
                missions.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border-l-4 border-blue-500">
                    <span className="font-mono font-bold text-sm text-slate-200">{m.command}</span>
                    <span className="text-[10px] text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
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

// Simple helper component for buttons
const NavButton = ({ icon, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className="p-4 bg-slate-700 rounded-2xl hover:bg-blue-600 hover:scale-105 transition-all disabled:opacity-20 disabled:hover:bg-slate-700 disabled:scale-100 shadow-lg"
  >
    {icon}
  </button>
);

export default Dashboard;