import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import canisterService from '../services/canisterService';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Calendar, Edit, ShoppingCart, X, Check } from 'lucide-react';

const MyLands = () => {
  const { isAuthenticated, principal, identity } = useAuth();
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedLand, setSelectedLand] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [updatingLand, setUpdatingLand] = useState(null);

  useEffect(() => {
    if (isAuthenticated && principal && identity) {
      fetchUserLands();
    }
  }, [isAuthenticated, principal, identity]);

  const fetchUserLands = async () => {
    try {
      setLoading(true);
      await canisterService.initializeAgent(identity);
      const userLands = await canisterService.getUserLands(principal);
      console.log("User lands:", userLands);
      setLands(userLands || []);
    } catch (err) {
      console.error("Error fetching user lands:", err);
      setError('Failed to fetch your lands: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified': return 'text-green-600 bg-green-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      case 'ForSale': return 'text-blue-600 bg-blue-100';
      case 'Sold': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPrice = (price) => {
    if (!price || !price[0]) return 'Not set';
    return `${price[0].toLocaleString()} ICP`;
  };

  const formatSize = (size) => {
    return `${size.toLocaleString()} sq units`;
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString();
  };

  const openPriceModal = (land) => {
    setSelectedLand(land);
    setSalePrice(land.price?.[0]?.toString() || '');
    setShowPriceModal(true);
  };

  const closePriceModal = () => {
    setShowPriceModal(false);
    setSelectedLand(null);
    setSalePrice('');
  };

  const handleSetForSale = async () => {
    if (!selectedLand || !salePrice) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setUpdatingLand(selectedLand.id);
      const price = parseInt(salePrice);
      await canisterService.setLandForSale(selectedLand.id, price);
      alert('Land successfully listed for sale!');
      await fetchUserLands();
      closePriceModal();
    } catch (error) {
      console.error('Error setting land for sale:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUpdatingLand(null);
    }
  };

  const handleRemoveFromSale = async (landId) => {
    if (!confirm('Are you sure you want to remove this land from sale?')) {
      return;
    }

    try {
      setUpdatingLand(landId);
      await canisterService.removeLandFromSale(landId);
      alert('Land removed from sale successfully!');
      await fetchUserLands();
    } catch (error) {
      console.error('Error removing land from sale:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUpdatingLand(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">Please login to view your lands.</p>
        <Link to="/login" className="text-blue-600 hover:text-blue-800">
          Go to Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Land Parcels</h1>
          <p className="text-gray-600 mt-2">Manage your virtual land portfolio</p>
        </div>
        <Link
          to="/register-land"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Register New Land
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {lands.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No land parcels yet</h3>
          <p className="text-gray-600 mb-6">You haven't registered any land parcels yet.</p>
          <Link
            to="/register-land"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Register Your First Land Parcel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lands.map((land) => (
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(land.status)}`}>
                    {Object.keys(land.status)[0]}
                  </span>
                </div>
              </div>

              {/* Land Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Land #{land.id}</h3>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{land.description}</p>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{land.coordinates}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatSize(land.size)}</span>
                  </div>
                  {land.price?.[0] && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="font-semibold">{formatPrice(land.price)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Link
                    to={`/land-details/${land.id}`}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </Link>
                  
                  {Object.keys(land.status)[0] === 'Verified' && (
                    <button
                      onClick={() => openPriceModal(land)}
                      disabled={updatingLand === land.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      {updatingLand === land.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Set for Sale
                        </>
                      )}
                    </button>
                  )}
                  
                  {Object.keys(land.status)[0] === 'ForSale' && (
                    <button
                      onClick={() => handleRemoveFromSale(land.id)}
                      disabled={updatingLand === land.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      {updatingLand === land.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Remove from Sale
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Price Setting Modal */}
      {showPriceModal && selectedLand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Set Sale Price</h2>
                <button
                  onClick={closePriceModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">Land: {selectedLand.description}</p>
                <p className="text-sm text-gray-500">Coordinates: {selectedLand.coordinates}</p>
                <p className="text-sm text-gray-500">Size: {formatSize(selectedLand.size)}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Price (ICP)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Enter price in ICP"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={closePriceModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetForSale}
                  disabled={!salePrice || updatingLand === selectedLand.id}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {updatingLand === selectedLand.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting...
                    </div>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2 inline" />
                      List for Sale
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLands;
