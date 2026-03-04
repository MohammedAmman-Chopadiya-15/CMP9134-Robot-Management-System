import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [message, setMessage] = useState("Loading...")

  //Calling FastAPI
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/')
      .then(response => {
        setMessage(response.data.message)
      })
      .catch(error => {
        console.error("Error fetching data:", error)
        setMessage("Backend is not responding!")
      })
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Robot Management System</h1>
      <div style={{ padding: '20px', border: '1px solid #ccc', display: 'inline-block' }}>
        <p>Message from Backend:</p>
        <h2 style={{ color: '#007bff' }}>{message}</h2>
      </div>
    </div>
  )
}

export default App