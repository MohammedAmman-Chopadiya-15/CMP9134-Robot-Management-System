import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // You will create this next!

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Login setUser={setUser} />;
  }

  return <Dashboard user={user} setUser={setUser} />;
}

export default App;