import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Simple Login Component
function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Virtual Land Registry
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your virtual land assets
          </p>
        </div>
        <div className="space-y-4">
          <button 
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            onClick={() => alert('Login functionality will be added')}
          >
            Login with Internet Identity
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple Dashboard Component  
function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Virtual Land Registry Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Register New Land</h2>
          <p className="text-gray-600">Register a new virtual land parcel on the blockchain.</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Register Land
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">My Lands</h2>
          <p className="text-gray-600">View and manage your registered land parcels.</p>
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            View My Lands
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Marketplace</h2>
          <p className="text-gray-600">Browse and purchase available land parcels.</p>
          <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Browse Marketplace
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple Navbar Component
function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-indigo-600">Virtual Land Registry</h1>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md">
              Dashboard
            </a>
            <a href="/login" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md">
              Login
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
