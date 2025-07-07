import React, { useEffect, useState } from 'react'
import { useAuth } from '../services/AuthContext'
import canisterService from '../services/canisterService'
import { Search, MapPin, DollarSign, User, Calendar, AlertCircle, ShoppingCart, Eye } from 'lucide-react'

const Marketplace = () => {
  const { identity, principal } = useAuth()
  const [landsForSale, setLandsForSale] = useState([])
  const [filteredLands, setFilteredLands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [buyingLand, setBuyingLand] = useState(null)
  const [selectedLand, setSelectedLand] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    if (identity) {
      loadMarketplaceData()
    }
  }, [identity])

  useEffect(() => {
    filterAndSortLands()
  }, [landsForSale, searchQuery, sortBy])

  const loadMarketplaceData = async () => {
    try {
      setLoading(true)
      await canisterService.initializeAgent(identity)
      const [lands, balance] = await Promise.all([
        canisterService.getLandsForSale(),
        canisterService.getWalletBalance(principal)
      ])
      console.log("Lands for sale:", lands)
      console.log("Wallet balance:", balance)
      setLandsForSale(lands || [])
      setWalletBalance(Number(balance) || 0)
    } catch (error) {
      console.error('Error loading marketplace data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortLands = () => {
    let filtered = [...landsForSale]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(land =>
        land.description.toLowerCase().includes(query) ||
        land.coordinates.toLowerCase().includes(query) ||
        land.metadata.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return (a.price?.[0] || 0) - (b.price?.[0] || 0)
        case 'price_high':
          return (b.price?.[0] || 0) - (a.price?.[0] || 0)
        case 'size_large':
          return b.size - a.size
        case 'size_small':
          return a.size - b.size
        case 'oldest':
          return Number(a.created_at) - Number(b.created_at)
        case 'newest':
        default:
          return Number(b.created_at) - Number(a.created_at)
      }
    })

    setFilteredLands(filtered)
  }

  const handleBuyLand = async (landId) => {
    if (!identity || !principal) {
      alert('Please log in to buy land')
      return
    }

    // Find the land to check price and ownership
    const land = landsForSale.find(l => l.id === landId)
    if (!land) {
      alert('Land not found')
      return
    }

    // Check if user is trying to buy their own land
    if (land.owner.toString() === principal.toString()) {
      alert('You cannot buy your own land')
      return
    }

    // Check if user has enough funds
    const price = land.price && land.price[0] ? land.price[0] : 0
    if (walletBalance < price) {
      alert(`Insufficient funds. You have ${formatICP(walletBalance)} ICP but need ${formatICP(price)} ICP`)
      return
    }

    // Confirm purchase
    const confirmed = confirm(`Buy "${land.description}" for ${formatICP(price)} ICP?`)
    if (!confirmed) return

    try {
      setBuyingLand(landId)
      await canisterService.buyLand(landId)
      alert('Land purchased successfully! Check "My Lands" to see your new property.')
      await loadMarketplaceData() // Refresh the list and wallet balance
    } catch (error) {
      console.error('Error buying land:', error)
      alert(`Error buying land: ${error.message}`)
    } finally {
      setBuyingLand(null)
    }
  }

  const formatICP = (e8s) => {
    return (e8s / 100_000_000).toFixed(2)
  }

  const formatPrice = (price) => {
    if (!price || !price[0]) return 'Price not set'
    return `${formatICP(price[0])} ICP`
  }

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString()
  }

  const formatSize = (size) => {
    return `${size.toLocaleString()} sq units`
  }

  const openLandDetails = (land) => {
    setSelectedLand(land)
    setShowDetails(true)
  }

  const closeLandDetails = () => {
    setSelectedLand(null)
    setShowDetails(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Virtual Land Marketplace</h1>
          <p className="text-gray-600">Discover and purchase virtual land parcels from verified sellers</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <div className="text-sm text-green-600 font-medium">Your Wallet</div>
              <div className="text-lg font-bold text-green-800">{formatICP(walletBalance)} ICP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by description, coordinates, or metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="size_large">Size: Large to Small</option>
          <option value="size_small">Size: Small to Large</option>
        </select>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredLands.length} of {landsForSale.length} land parcels for sale
        </p>
      </div>

      {/* Land Grid */}
      {filteredLands.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No land parcels found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search criteria' : 'No land parcels are currently for sale'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLands.map((land) => (
            <div key={land.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Land Image */}
              <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500 relative">
                {land.preview_image_url?.[0] ? (
                  <img
                    src={land.preview_image_url[0]}
                    alt={land.description}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    For Sale
                  </span>
                </div>
              </div>

              {/* Land Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {land.description}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{land.coordinates}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="font-semibold text-gray-900">{formatPrice(land.price)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatSize(land.size)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openLandDetails(land)}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </button>
                  
                  <button
                    onClick={() => handleBuyLand(land.id)}
                    disabled={buyingLand === land.id || (land.owner === principal)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {buyingLand === land.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : land.owner === principal ? (
                      'Your Land'
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Land Details Modal */}
      {showDetails && selectedLand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Land Details</h2>
                <button
                  onClick={closeLandDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Land Image */}
              <div className="h-64 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg mb-6">
                {selectedLand.preview_image_url?.[0] ? (
                  <img
                    src={selectedLand.preview_image_url[0]}
                    alt={selectedLand.description}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-lg">
                    <MapPin className="h-20 w-20 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Land Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedLand.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Coordinates</h4>
                    <p className="text-gray-600">{selectedLand.coordinates}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Size</h4>
                    <p className="text-gray-600">{formatSize(selectedLand.size)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Price</h4>
                    <p className="text-gray-600 font-semibold">{formatPrice(selectedLand.price)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Land ID</h4>
                    <p className="text-gray-600">#{selectedLand.id}</p>
                  </div>
                </div>

                {selectedLand.metadata && (
                  <div>
                    <h4 className="font-medium text-gray-900">Additional Information</h4>
                    <p className="text-gray-600">{selectedLand.metadata}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={closeLandDetails}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  
                  <button
                    onClick={() => {
                      handleBuyLand(selectedLand.id)
                      closeLandDetails()
                    }}
                    disabled={buyingLand === selectedLand.id || (selectedLand.owner === principal)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {buyingLand === selectedLand.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : selectedLand.owner === principal ? (
                      'This is Your Land'
                    ) : (
                      'Buy This Land'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Marketplace
