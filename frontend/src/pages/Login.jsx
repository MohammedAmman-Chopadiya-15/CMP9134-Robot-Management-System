import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ setUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'viewer' });

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const res = await axios.post(`http://127.0.0.1:8000/auth${endpoint}`, formData);
      if (isRegistering) {
        alert("Registered! Please login.");
        setIsRegistering(false);
      } else {
        setUser(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Auth Failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleAuth} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
        <input 
          type="text" placeholder="Username" className="w-full p-2 border mb-2"
          onChange={(e) => setFormData({...formData, username: e.target.value})}
        />
        <input 
          type="password" placeholder="Password" className="w-full p-2 border mb-4"
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />
        {isRegistering && (
          <select className="w-full p-2 border mb-4" onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <option value="viewer">Viewer</option>
            <option value="commander">Commander</option>
          </select>
        )}
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-semibold">
          {isRegistering ? 'Create Account' : 'Sign In'}
        </button>
        <p className="mt-4 text-sm text-center text-gray-600">
          {isRegistering ? 'Already have an account?' : 'Need an account?'} 
          <span className="text-blue-500 cursor-pointer ml-1" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Login' : 'Register'}
          </span>
        </p>
      </form>
    </div>
  );
};

export default Login;