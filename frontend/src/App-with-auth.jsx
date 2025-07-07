import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './services/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import RegisterLand from './pages/RegisterLand'
import MyLands from './pages/MyLands'
import LandDetails from './pages/LandDetails'
import VerifyLand from './pages/VerifyLand'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <Marketplace />
                </ProtectedRoute>
              } />
              <Route path="/register-land" element={
                <ProtectedRoute>
                  <RegisterLand />
                </ProtectedRoute>
              } />
              <Route path="/my-lands" element={
                <ProtectedRoute>
                  <MyLands />
                </ProtectedRoute>
              } />
              <Route path="/verify-land" element={
                <ProtectedRoute>
                  <VerifyLand />
                </ProtectedRoute>
              } />
              <Route path="/land-details/:landId" element={
                <ProtectedRoute>
                  <LandDetails />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
