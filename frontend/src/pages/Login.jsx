import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, ShieldCheck, Activity, UserPlus } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Choosing the right API pathway depending on the form state
    const endpoint = isRegistering ? '/register' : '/login';
    
    try {
      console.log(`Attempting ${endpoint}...`);
      const res = await axios.post(`http://127.0.0.1:8000/auth${endpoint}`, formData);
      console.log("Server Response:", res.data);

      if (isRegistering) {
        alert("Account Authorized. Please Sign In.");
        setIsRegistering(false);
      } else {
        const { access_token, user } = res.data;
        
        // Verifying that the expected login tokens are present in the response
        if (access_token && user) {
          onLogin(user, access_token);
        } else {
          console.error("Missing fields in response. Received:", res.data);
          setError("Protocol Error: Malformed Server Response");
        }
      }
    } catch (err) {
      console.error("Auth Exception:", err);
      const message = err.response?.data?.detail || "Connection Failure: Gateway Offline";
      setError(message);
    } finally {
      // Resetting the form submission tracker once the network request finishes
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600/10 rounded-2xl mb-4 border border-blue-500/20">
            {isRegistering ? <UserPlus size={40} className="text-blue-500" /> : <ShieldCheck size={40} className="text-blue-500" />}
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            {isRegistering ? 'Register Unit' : 'Gateway Access'}
          </h1>
          <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] mt-1 font-bold">
            Secure Mission Protocol
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold text-center uppercase tracking-widest animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="OPERATOR ID"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="password"
              placeholder="ACCESS KEY"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-all"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {isRegistering && (
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-4 text-sm text-blue-400 font-bold uppercase outline-none focus:border-blue-500 appearance-none"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="viewer">Role: Viewer</option>
              <option value="commander">Role: Commander</option>
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-lg uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {loading ? <Activity size={18} className="animate-spin" /> : <>{isRegistering ? 'Initialize' : 'Establish Link'}</>}
          </button>

          <p className="pt-4 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <button 
              type="button"
              className="text-blue-500 hover:text-blue-400 cursor-pointer underline underline-offset-4" 
              onClick={() => { setError(''); setIsRegistering(!isRegistering); }}
            >
              {isRegistering ? 'Switch to Sign In' : 'Create New Operator Profile'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;