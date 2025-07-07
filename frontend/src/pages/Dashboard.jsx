import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import canisterService from '../services/canisterService'
import { 
  MapPin, 
  PlusCircle, 
  Wallet, 
  TrendingUp, 
  Users, 
  Eye,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react'

const Dashboard = () => {
  const { principal, identity } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [userLands, setUserLands] = useState([])
  const [totalLands, setTotalLands] = useState(0)
  const [landsForSale, setLandsForSale] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creatingData, setCreatingData] = useState(false)

  useEffect(() => {
    if (principal && identity) {
      initializeDashboard()
    }
  }, [principal, identity])

  const initializeDashboard = async () => {
    try {
      setLoading(true)
      await canisterService.initializeAgent(identity)
      
      // Load user data in parallel
      const [
        profileResult,
        landsResult,
        totalLandsResult,
        landsForSaleResult,
        walletResult
      ] = await Promise.allSettled([
        canisterService.getCurrentUser(),
        canisterService.getUserLands(principal),
        canisterService.getTotalLands(),
        canisterService.getLandsForSale(),
        canisterService.getWalletBalance(principal)
      ])

      if (profileResult.status === 'fulfilled') {
        setUserProfile(profileResult.value?.[0] || null)
      }

      if (landsResult.status === 'fulfilled') {
        setUserLands(landsResult.value || [])
      }

      if (totalLandsResult.status === 'fulfilled') {
        setTotalLands(Number(totalLandsResult.value) || 0)
      }

      if (landsForSaleResult.status === 'fulfilled') {
        setLandsForSale(landsForSaleResult.value || [])
      }

      if (walletResult.status === 'fulfilled') {
        setWalletBalance(Number(walletResult.value) || 0)
      }

      // Register user if not already registered
      if (!profileResult.value || !profileResult.value[0]) {
        try {
          await canisterService.registerUser([], [])
          const newProfile = await canisterService.getCurrentUser()
          setUserProfile(newProfile[0] || null)
        } catch (regError) {
          console.log('User might already be registered:', regError)
        }
      }

    } catch (error) {
      console.error('Dashboard initialization error:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSampleData = async () => {
    try {
      setCreatingData(true)
      const result = await canisterService.initializeSampleData()
      console.log('Sample data created:', result)
      alert('Sample land data created successfully!')
      await initializeDashboard() // Refresh the dashboard
    } catch (error) {
      console.error('Error creating sample data:', error)
      alert(`Error creating sample data: ${error.message}`)
    } finally {
      setCreatingData(false)
    }
  }

  const handleInitializeWallet = async () => {
    try {
      const result = await canisterService.initializeUserWallet()
      console.log('Wallet initialized:', result)
      if (result.Ok !== undefined) {
        setWalletBalance(Number(result.Ok))
        alert('Wallet initialized with 500 ICP!')
      } else {
        alert(`Error: ${result.Err}`)
      }
    } catch (error) {
      console.error('Error initializing wallet:', error)
      alert(`Error initializing wallet: ${error.message}`)
    }
  }

  const handleAddFunds = async () => {
    const amount = prompt('Enter amount to add (in ICP):')
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      try {
        const amountInE8s = Math.floor(parseFloat(amount) * 100_000_000) // Convert ICP to e8s
        const result = await canisterService.addFundsToWallet(amountInE8s)
        console.log('Funds added:', result)
        if (result.Ok !== undefined) {
          setWalletBalance(Number(result.Ok))
          alert(`Successfully added ${amount} ICP to your wallet!`)
        } else {
          alert(`Error: ${result.Err}`)
        }
      } catch (error) {
        console.error('Error adding funds:', error)
        alert(`Error adding funds: ${error.message}`)
      }
    }
  }

  const formatICP = (e8s) => {
    return (e8s / 100_000_000).toFixed(2)
  }

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString()
  }

  const getStatusColor = (status) => {
    const statusKey = Object.keys(status)[0]
    switch (statusKey) {
      case 'Verified': return 'text-green-600 bg-green-100'
      case 'Pending': return 'text-yellow-600 bg-yellow-100'
      case 'Rejected': return 'text-red-600 bg-red-100'
      case 'ForSale': return 'text-blue-600 bg-blue-100'
      case 'Sold': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md">
              <div className="h-6 bg-gray-300 animate-pulse rounded mb-2"></div>
              <div className="h-8 bg-gray-300 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={initializeDashboard}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  const myLandsForSale = userLands.filter(land => Object.keys(land.status)[0] === 'ForSale').length
  const myVerifiedLands = userLands.filter(land => Object.keys(land.status)[0] === 'Verified').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Virtual Land Registry
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Register, verify, and trade virtual land assets on the Internet Computer blockchain
        </p>
        {userProfile && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Member since {formatDate(userProfile.created_at)}
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Wallet Balance</div>
              <div className="text-2xl font-bold text-gray-900">{formatICP(walletBalance)} ICP</div>
              <div className="text-xs text-gray-400 mt-1">
                <button 
                  onClick={handleInitializeWallet}
                  className="text-blue-600 hover:text-blue-800 mr-2"
                >
                  Initialize
                </button>
                <button 
                  onClick={handleAddFunds}
                  className="text-green-600 hover:text-green-800"
                >
                  Add Funds
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">My Lands</div>
              <div className="text-2xl font-bold text-gray-900">{userLands.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Verified Lands</div>
              <div className="text-2xl font-bold text-gray-900">{myVerifiedLands}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">For Sale</div>
              <div className="text-2xl font-bold text-gray-900">{myLandsForSale}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Platform Lands</div>
              <div className="text-2xl font-bold text-gray-900">{totalLands}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/register-land" 
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <PlusCircle className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Register Land</h3>
              <p className="text-gray-600">Add a new land parcel to the registry</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
          </div>
        </Link>

        <Link 
          to="/marketplace" 
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Browse Marketplace</h3>
              <p className="text-gray-600">Discover land parcels for sale</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
          </div>
        </Link>

        <Link 
          to="/my-lands" 
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">My Portfolio</h3>
              <p className="text-gray-600">Manage your land holdings</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
          </div>
        </Link>
      </div>

      {/* Sample Data Section */}
      {totalLands === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Data Found</h3>
                <p className="text-gray-600">Create sample land data to get started with the marketplace</p>
              </div>
            </div>
            <button
              onClick={handleCreateSampleData}
              disabled={creatingData}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center"
            >
              {creatingData ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {creatingData ? 'Creating...' : 'Create Sample Data'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Lands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">My Recent Lands</h2>
              <Link to="/my-lands" className="text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            {userLands.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No land parcels registered yet</p>
                <Link 
                  to="/register-land"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Register your first land
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userLands.slice(0, 3).map((land) => (
                  <div key={land.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <MapPin className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        Land #{land.id}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {land.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(land.status)}`}>
                        {Object.keys(land.status)[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Marketplace Activity</h2>
              <Link to="/marketplace" className="text-blue-600 hover:text-blue-800">
                View Marketplace
              </Link>
            </div>
          </div>
          <div className="p-6">
            {landsForSale.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No lands for sale currently</p>
              </div>
            ) : (
              <div className="space-y-4">
                {landsForSale.slice(0, 3).map((land) => (
                  <div key={land.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        Land #{land.id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {land.price?.[0] ? `${land.price[0].toLocaleString()} ICP` : 'Price not set'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                        For Sale
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
