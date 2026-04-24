import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [session, setSession] = useState({ user: null, token: null });
  const [loading, setLoading] = useState(true);

  // 1. Persistence check: Keep user logged in on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem('robot_user');
    const savedToken = localStorage.getItem('robot_token');
    
    if (savedUser && savedToken) {
      try {
        setSession({ user: JSON.parse(savedUser), token: savedToken });
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // 2. Synchronized login handler
  const handleLogin = (userData, token) => {
    localStorage.setItem('robot_token', token);
    localStorage.setItem('robot_user', JSON.stringify(userData));
    setSession({ user: userData, token: token });
  };

  // 3. Logout handler
  const handleLogout = () => {
    localStorage.clear();
    setSession({ user: null, token: null });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="text-blue-500 font-mono animate-pulse uppercase tracking-[0.3em]">
          Syncing Secure Link...
        </div>
      </div>
    );
  }

  // Ensure we pass "onLogin" as the prop name
  if (!session.user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Dashboard 
      user={session.user} 
      token={session.token} 
      onLogout={handleLogout} 
    />
  );
}

export default App;