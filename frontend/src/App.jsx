import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthClient } from '@dfinity/auth-client'
import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'

// Canister configuration
const CANISTER_IDS = {
  land_registry: import.meta.env.REACT_APP_LAND_REGISTRY_CANISTER_ID || 'uxrrr-q7777-77774-qaaaq-cai',
}

// IDL interface
const landRegistryIdl = ({ IDL }) => {
  const LandStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Verified': IDL.Null,
    'Rejected': IDL.Null,
    'ForSale': IDL.Null,
    'Sold': IDL.Null,
  })

  const LandTransfer = IDL.Record({
    'from': IDL.Principal,
    'to': IDL.Principal,
    'timestamp': IDL.Nat64,
    'verified_by': IDL.Opt(IDL.Principal),
  })

  const LandParcel = IDL.Record({
    'id': IDL.Nat64,
    'owner': IDL.Principal,
    'coordinates': IDL.Text,
    'size': IDL.Float64,
    'description': IDL.Text,
    'status': LandStatus,
    'verified_by': IDL.Opt(IDL.Principal),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
    'history': IDL.Vec(LandTransfer),
    'price': IDL.Opt(IDL.Nat64),
    'metadata': IDL.Text,
    'preview_image_url': IDL.Opt(IDL.Text),
  })

  const LandInput = IDL.Record({
    'coordinates': IDL.Text,
    'size': IDL.Float64,
    'description': IDL.Text,
    'metadata': IDL.Text,
    'price': IDL.Opt(IDL.Nat64),
  })

  const Result = IDL.Variant({ 'Ok': LandParcel, 'Err': IDL.Text })
  const StringResult = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })
  const BalanceResult = IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })

  return IDL.Service({
    'register_land': IDL.Func([LandInput], [Result], []),
    'get_user_lands': IDL.Func([IDL.Principal], [IDL.Vec(LandParcel)], ['query']),
    'get_all_lands': IDL.Func([], [IDL.Vec(LandParcel)], ['query']),
    'get_lands_for_sale': IDL.Func([], [IDL.Vec(LandParcel)], ['query']),
    'buy_land': IDL.Func([IDL.Nat64], [Result], []),
    'set_land_for_sale': IDL.Func([IDL.Nat64, IDL.Nat64], [Result], []),
    'remove_land_from_sale': IDL.Func([IDL.Nat64], [Result], []),
    'transfer_ownership': IDL.Func([IDL.Nat64, IDL.Principal], [Result], []),
    'initialize_sample_data': IDL.Func([], [StringResult], []),
    'get_wallet_balance': IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'add_funds_to_wallet': IDL.Func([IDL.Nat64], [BalanceResult], []),
    'initialize_user_wallet': IDL.Func([], [BalanceResult], []),
    'clear_all_data': IDL.Func([], [StringResult], []),
  })
}

// Helper function to create actors
const createActor = (identity) => {
  const agent = new HttpAgent({
    host: import.meta.env.REACT_APP_NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://ic0.app',
    identity,
  })

  if (import.meta.env.REACT_APP_NODE_ENV === 'development') {
    agent.fetchRootKey()
  }

  return Actor.createActor(landRegistryIdl, {
    agent,
    canisterId: CANISTER_IDS.land_registry,
  })
}

// Authentication Context
const AuthContext = React.createContext()

function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authClient, setAuthClient] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAuth()
  }, [])

  const initAuth = async () => {
    try {
      const client = await AuthClient.create()
      setAuthClient(client)
      
      const authenticated = await client.isAuthenticated()
      
      if (authenticated) {
        const identity = client.getIdentity()
        
        if (identity.getPrincipal().isAnonymous()) {
          setIsAuthenticated(false)
          setIdentity(null)
        } else {
          setIsAuthenticated(true)
          setIdentity(identity)
        }
      } else {
        setIsAuthenticated(false)
        setIdentity(null)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setIsAuthenticated(false)
      setIdentity(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    if (!authClient) return
    
    try {
      setLoading(true)
      await authClient.login({
        identityProvider: import.meta.env.REACT_APP_NODE_ENV === 'development' 
          ? `http://${import.meta.env.REACT_APP_INTERNET_IDENTITY_CANISTER_ID}.localhost:8000`
          : 'https://identity.ic0.app',
        onSuccess: () => {
          const identity = authClient.getIdentity()
          setIsAuthenticated(true)
          setIdentity(identity)
          window.location.href = '/dashboard'
        },
        onError: (error) => {
          console.error('Login error:', error)
        }
      })
    } catch (error) {
      console.error('Login process error:', error)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!authClient) return
    
    try {
      await authClient.logout()
      setIsAuthenticated(false)
      setIdentity(null)
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    isAuthenticated,
    identity,
    loading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Login Component
function Login() {
  const { login, loading, isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            🏡 Virtual Land Registry
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with Internet Identity to manage your virtual land assets
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <button 
            onClick={login}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Login with Internet Identity'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Navbar Component
function SimpleNavbar() {
  const { isAuthenticated, logout } = useAuth()
  
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600">🏡 Virtual Land Registry</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <a href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  Dashboard
                </a>
                <a href="/register" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  Register Land
                </a>
                <a href="/marketplace" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  Marketplace
                </a>
                <a href="/my-lands" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                  My Lands
                </a>
                <button 
                  onClick={logout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// Dashboard Component with Wallet
function Dashboard() {
  const { identity } = useAuth()
  const [stats, setStats] = useState({
    totalLands: 0,
    marketValue: 0,
    forSale: 0,
    verified: 0
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletLoading, setWalletLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStats()
    fetchWalletBalance()
  }, [])

  const fetchStats = async () => {
    try {
      const actor = createActor(identity)
      const principal = identity.getPrincipal()
      const userLands = await actor.get_user_lands(principal)
      
      const totalLands = userLands.length
      const marketValue = userLands.reduce((sum, land) => sum + (land.price?.[0] ? Number(land.price[0]) : 0), 0)
      const forSale = userLands.filter(land => land.status.ForSale).length
      const verified = userLands.filter(land => land.status.Verified || land.status.ForSale).length
      
      setStats({ totalLands, marketValue: marketValue / 1000000, forSale, verified })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const actor = createActor(identity)
      const principal = identity.getPrincipal()
      const balance = await actor.get_wallet_balance(principal)
      setWalletBalance(Number(balance) / 1000000) // Convert from backend scale
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      // Try to initialize wallet if it doesn't exist
      try {
        const actor = createActor(identity)
        await actor.initialize_user_wallet()
        const balance = await actor.get_wallet_balance(principal)
        setWalletBalance(Number(balance) / 1000000)
      } catch (initError) {
        console.error('Error initializing wallet:', initError)
      }
    }
  }

  const addFunds = async (amount) => {
    try {
      setWalletLoading(true)
      setMessage('')
      const actor = createActor(identity)
      const result = await actor.add_funds_to_wallet(BigInt(amount * 1000000)) // Convert to backend scale
      if (result.Err) {
        setMessage(`❌ Error: ${result.Err}`)
      } else {
        setMessage(`✅ Added $${amount.toLocaleString()} to wallet!`)
        fetchWalletBalance()
      }
    } catch (error) {
      console.error('Error adding funds:', error)
      setMessage(`❌ Failed to add funds: ${error.message}`)
    } finally {
      setWalletLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">🏡 Virtual Land Registry Dashboard</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Wallet Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">💰 My Wallet</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg text-blue-700 mb-2">Current Balance:</p>
            <p className="text-3xl font-bold text-blue-900">${walletBalance.toLocaleString()}</p>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => addFunds(10000)}
              disabled={walletLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
            >
              Add $10,000
            </button>
            <button 
              onClick={() => addFunds(50000)}
              disabled={walletLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
            >
              Add $50,000
            </button>
            <button 
              onClick={() => addFunds(100000)}
              disabled={walletLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
            >
              Add $100,000
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Total Lands</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalLands}</p>
          <p className="text-sm text-gray-600">Registered properties</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 Portfolio Value</h3>
          <p className="text-3xl font-bold text-green-600">${stats.marketValue.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total land value</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🏪 For Sale</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.forSale}</p>
          <p className="text-sm text-gray-600">Active listings</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">✅ Verified</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.verified}</p>
          <p className="text-sm text-gray-600">Verified properties</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">🏗️ Register New Land</h2>
          <p className="text-gray-600 mb-4">Register a new virtual land parcel on the blockchain with complete ownership verification.</p>
          <a href="/register" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Register Land
          </a>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">🗂️ My Lands</h2>
          <p className="text-gray-600 mb-4">View and manage your registered land parcels, update details, and track their value.</p>
          <a href="/my-lands" className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
            View My Lands
          </a>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">🏪 Marketplace</h2>
          <p className="text-gray-600 mb-4">Browse and purchase available land parcels from other verified landowners.</p>
          <a href="/marketplace" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors font-medium">
            Browse Marketplace
          </a>
        </div>
      </div>
    </div>
  )
}

// Marketplace Component with Wallet Integration
function Marketplace() {
  const { identity } = useAuth()
  const [lands, setLands] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const [message, setMessage] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    fetchLands()
    fetchWalletBalance()
  }, [])

  const fetchLands = async () => {
    try {
      const actor = createActor(identity)
      const result = await actor.get_lands_for_sale()
      console.log('Lands for sale:', result)
      
      // Filter out lands owned by the current user
      const userPrincipal = identity.getPrincipal().toString()
      const filteredLands = result.filter(land => land.owner.toString() !== userPrincipal)
      
      setLands(filteredLands)
      
      if (filteredLands.length === 0 && result.length > 0) {
        setMessage('ℹ️ No lands available for purchase (you cannot buy your own lands).')
      } else if (filteredLands.length === 0) {
        setMessage('ℹ️ No lands available for sale at the moment.')
      }
    } catch (error) {
      console.error('Error fetching lands:', error)
      setMessage(`❌ Failed to load marketplace data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const actor = createActor(identity)
      const principal = identity.getPrincipal()
      const balance = await actor.get_wallet_balance(principal)
      setWalletBalance(Number(balance) / 1000000) // Convert from backend scale
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
    }
  }

  const handlePurchase = async (land) => {
    const landId = Number(land.id)
    const price = land.price?.[0] ? Number(land.price[0]) / 1000000 : 0

    if (price > walletBalance) {
      setMessage(`❌ Insufficient funds! You need $${price.toLocaleString()} but only have $${walletBalance.toLocaleString()}`)
      return
    }

    setPurchasing(landId)
    setMessage('')

    try {
      const actor = createActor(identity)
      const result = await actor.buy_land(BigInt(landId))

      if (result.Ok) {
        setMessage('✅ Land purchased successfully!')
        fetchLands() // Refresh the list
        fetchWalletBalance() // Update wallet balance
      } else {
        setMessage(`❌ Purchase failed: ${result.Err}`)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      setMessage(`❌ Failed to purchase land: ${error.message}`)
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading marketplace...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">🏪 Land Marketplace</h1>
      
      {/* Wallet Balance Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          💰 Your Wallet Balance: <span className="font-bold text-xl">${walletBalance.toLocaleString()}</span>
        </p>
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : message.includes('ℹ️') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      {lands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No lands available for purchase at the moment.</p>
          <p className="text-gray-500 mt-2">Check back later or register your own land to sell!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lands.map(land => {
            const price = land.price?.[0] ? Number(land.price[0]) / 1000000 : 0
            const canAfford = price <= walletBalance
            
            return (
              <div key={Number(land.id)} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Land #{Number(land.id)}</h3>
                <p className="text-gray-600 mb-2">📍 {land.coordinates}</p>
                <p className="text-gray-600 mb-2">📏 {land.size} sq meters</p>
                <p className="text-gray-600 mb-2">🏷️ {land.metadata}</p>
                {price > 0 && (
                  <p className={`text-2xl font-bold mb-2 ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                    ${price.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-600 mb-4">{land.description}</p>
                <p className="text-xs text-gray-500 mb-4">
                  Status: {Object.keys(land.status)[0]}
                </p>
                <button 
                  onClick={() => handlePurchase(land)}
                  disabled={purchasing === Number(land.id) || !canAfford}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    canAfford 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  } disabled:opacity-50`}
                >
                  {purchasing === Number(land.id) ? 'Purchasing...' : 
                   !canAfford ? `Need $${(price - walletBalance).toLocaleString()} more` : 
                   'Purchase Land'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Register Land Component  
function RegisterLand() {
  const { identity } = useAuth()
  const [formData, setFormData] = useState({
    coordinates: '',
    size: '',
    price: '',
    description: '',
    metadata: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const actor = createActor(identity)
      
      const landInput = {
        coordinates: formData.coordinates,
        size: parseFloat(formData.size),
        description: formData.description,
        metadata: formData.metadata || 'Virtual Land',
        price: formData.price ? [BigInt(parseFloat(formData.price) * 1000000)] : [] // Convert to backend scale
      }

      console.log('Submitting land input:', landInput)
      
      const result = await actor.register_land(landInput)
      console.log('Registration result:', result)

      if (result.Ok) {
        setMessage('✅ Land registered successfully on the blockchain!')
        setFormData({
          coordinates: '',
          size: '',
          price: '',
          description: '',
          metadata: ''
        })
      } else {
        setMessage(`❌ Error: ${result.Err}`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      setMessage(`❌ Failed to register land: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">🏗️ Register New Land</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location/Coordinates</label>
            <input 
              type="text" 
              name="coordinates"
              value={formData.coordinates}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g., 40.7128, -74.0060 or City Center Block A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Size (sq meters)</label>
            <input 
              type="number" 
              step="0.01"
              name="size"
              value={formData.size}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Enter land size in square meters"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (USD) - Optional</label>
            <input 
              type="number" 
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Enter price if you want to sell immediately"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              rows="4" 
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Describe the property"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Metadata - Optional</label>
            <input 
              type="text" 
              name="metadata"
              value={formData.metadata}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g., Commercial, Residential, Industrial"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Land on Blockchain'}
          </button>
        </form>
      </div>
    </div>
  )
}

// My Lands Component  
function MyLands() {
  const { identity } = useAuth()
  const [lands, setLands] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchMyLands()
  }, [])

  const fetchMyLands = async () => {
    try {
      const actor = createActor(identity)
      const principal = identity.getPrincipal()
      const result = await actor.get_user_lands(principal)
      setLands(result)
      
      if (result.length === 0) {
        setMessage('ℹ️ You haven\'t registered any lands yet.')
      }
    } catch (error) {
      console.error('Error fetching user lands:', error)
      setMessage(`❌ Failed to load your lands: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const initializeSampleData = async () => {
    try {
      const actor = createActor(identity)
      const result = await actor.initialize_sample_data()
      
      if (result.Ok) {
        setMessage('✅ Sample lands created successfully!')
        fetchMyLands()
      } else {
        setMessage(`❌ Error creating sample data: ${result.Err}`)
      }
    } catch (error) {
      console.error('Error initializing sample data:', error)
      setMessage(`❌ Failed to initialize sample data: ${error.message}`)
    }
  }

  const setLandForSale = async (landId, price) => {
    try {
      const actor = createActor(identity)
      const result = await actor.set_land_for_sale(BigInt(landId), BigInt(price * 1000000)) // Convert to backend scale
      
      if (result.Ok) {
        setMessage(`✅ Land #${landId} listed for sale at $${price.toLocaleString()}!`)
        fetchMyLands()
      } else {
        setMessage(`❌ Error listing land: ${result.Err}`)
      }
    } catch (error) {
      console.error('Error setting land for sale:', error)
      setMessage(`❌ Failed to list land: ${error.message}`)
    }
  }

  const removeLandFromSale = async (landId) => {
    try {
      const actor = createActor(identity)
      const result = await actor.remove_land_from_sale(BigInt(landId))
      
      if (result.Ok) {
        setMessage(`✅ Land #${landId} removed from sale!`)
        fetchMyLands()
      } else {
        setMessage(`❌ Error removing land from sale: ${result.Err}`)
      }
    } catch (error) {
      console.error('Error removing land from sale:', error)
      setMessage(`❌ Failed to remove land from sale: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your lands...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🗂️ My Lands</h1>
        {lands.length === 0 && (
          <button
            onClick={initializeSampleData}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Create Sample Lands for Demo
          </button>
        )}
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : message.includes('ℹ️') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      {lands.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't registered any lands yet.</p>
          <a href="/register" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Register Your First Land
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lands.map(land => {
            const price = land.price?.[0] ? Number(land.price[0]) / 1000000 : 0
            const isForSale = land.status.ForSale
            
            return (
              <div key={Number(land.id)} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Land #{Number(land.id)}</h3>
                <p className="text-gray-600 mb-2">📍 {land.coordinates}</p>
                <p className="text-gray-600 mb-2">📏 {land.size} sq meters</p>
                <p className="text-gray-600 mb-2">🏷️ {land.metadata}</p>
                {price > 0 && (
                  <p className="text-xl font-bold text-blue-600 mb-2">
                    ${price.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-600 mb-4">{land.description}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  isForSale ? 'bg-orange-100 text-orange-800' : 
                  Object.keys(land.status)[0] === 'Verified' ? 'bg-green-100 text-green-800' :
                  Object.keys(land.status)[0] === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {Object.keys(land.status)[0]}
                </span>
                <div className="space-y-2">
                  {!isForSale ? (
                    <button 
                      onClick={() => {
                        const salePrice = prompt(`Enter sale price for Land #${Number(land.id)} (USD):`)
                        if (salePrice && !isNaN(salePrice) && parseFloat(salePrice) > 0) {
                          setLandForSale(Number(land.id), parseFloat(salePrice))
                        }
                      }}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      List for Sale
                    </button>
                  ) : (
                    <button 
                      onClick={() => removeLandFromSale(Number(land.id))}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                      Remove from Sale
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <SimpleNavbar />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/register" element={
                <ProtectedRoute>
                  <RegisterLand />
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={
                <ProtectedRoute>
                  <Marketplace />
                </ProtectedRoute>
              } />
              <Route path="/my-lands" element={
                <ProtectedRoute>
                  <MyLands />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
