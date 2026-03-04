import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, LogOut, History } from 'lucide-react';

const Dashboard = ({ user, setUser }) => {
  const [robotPos, setRobotPos] = useState({ x: 10, y: 10 });
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [missions, setMissions] = useState([]); // To store history

  // Fetch initial status and mission history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes = await axios.get('http://127.0.0.1:8000/');
        setBackendStatus(statusRes.data.message);
        
        // We will build this endpoint next!
        const historyRes = await axios.get('http://127.0.0.1:8000/missions/history');
        setMissions(historyRes.data.slice(0, 5)); // Show last 5
      } catch (err) {
        setBackendStatus("Backend Offline");
      }
    };
    fetchData();
  }, []);

  const handleMove = async (direction) => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/missions/move', {
        username: user.username,
        direction: direction
      });

      if (res.data.status === "SUCCESS") {
        // 1. Update Map Position
        setRobotPos(prev => {
          let { x, y } = prev;
          if (direction === 'north' && y < 20) y++;
          if (direction === 'south' && y > 0) y--;
          if (direction === 'east' && x < 20) x++;
          if (direction === 'west' && x > 0) x--;
          return { x, y };
        });

        // 2. Add to local history list immediately
        const newLog = { 
            id: Date.now(), 
            command: `MOVE_${direction.upper()}`, 
            timestamp: new Date().toLocaleTimeString() 
        };
        setMissions(prev => [newLog, ...prev].slice(0, 5));
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Movement restricted");
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 20; y >= 0; y--) {
      for (let x = 0; x <= 20; x++) {
        const isRobotHere = robotPos.x === x && robotPos.y === y;
        cells.push(
          <div key={`${x}-${y}`} className={`w-6 h-6 border border-gray-100 flex items-center justify-center ${isRobotHere ? 'bg-blue-500 text-white animate-pulse' : 'bg-white'}`}>
            {isRobotHere ? <Bot size={16} /> : null}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mission Control</h1>
          <p className="text-sm text-gray-500">User: <span className="font-semibold text-blue-600 uppercase">{user.username}</span> | Role: <span className="italic">{user.role}</span></p>
        </div>
        <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${backendStatus.includes('Active') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {backendStatus}
            </span>
            <button onClick={() => setUser(null)} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Map */}
        <div className="lg:col-span-2 flex justify-center">
          <div className="inline-grid grid-cols-[repeat(21,minmax(0,1fr))] border-4 border-gray-800 bg-white shadow-2xl">
            {renderGrid()}
          </div>
        </div>

        {/* Right: Controls & History */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">Navigation</h2>
            <div className="grid grid-cols-3 gap-3 max-w-[200px] mx-auto">
              <div />
              <button onClick={() => handleMove('north')} disabled={user.role !== 'commander'} className="p-4 bg-gray-100 rounded-xl hover:bg-blue-500 hover:text-white disabled:opacity-30"><ChevronUp /></button>
              <div />
              <button onClick={() => handleMove('west')} disabled={user.role !== 'commander'} className="p-4 bg-gray-100 rounded-xl hover:bg-blue-500 hover:text-white disabled:opacity-30"><ChevronLeft /></button>
              <div className="flex items-center justify-center font-bold text-gray-400">POS</div>
              <button onClick={() => handleMove('east')} disabled={user.role !== 'commander'} className="p-4 bg-gray-100 rounded-xl hover:bg-blue-500 hover:text-white disabled:opacity-30"><ChevronRight /></button>
              <div />
              <button onClick={() => handleMove('south')} disabled={user.role !== 'commander'} className="p-4 bg-gray-100 rounded-xl hover:bg-blue-500 hover:text-white disabled:opacity-30"><ChevronDown /></button>
              <div />
            </div>
          </div>

          {/* New Mission History Component */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <History size={16} /> Recent Missions
            </h2>
            <div className="space-y-3">
              {missions.length === 0 ? <p className="text-xs text-gray-400 italic">No missions logged.</p> : 
                missions.map(m => (
                  <div key={m.id} className="flex justify-between text-xs border-l-2 border-blue-500 pl-2">
                    <span className="font-mono font-bold text-gray-700">{m.command}</span>
                    <span className="text-gray-400">{m.timestamp}</span>
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

export default Dashboard;