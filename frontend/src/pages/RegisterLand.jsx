import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import canisterService from '../services/canisterService';

const RegisterLand = () => {
  const { isAuthenticated, principal, identity } = useAuth();
  const [formData, setFormData] = useState({
    coordinates: '',
    size: '',
    description: '',
    metadata: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Initialize canister service with user's identity
      await canisterService.initializeAgent(identity);

      const landInput = {
        coordinates: formData.coordinates,
        size: parseFloat(formData.size),
        description: formData.description,
        metadata: formData.metadata,
        price: formData.price ? [BigInt(formData.price)] : []
      };

      const result = await canisterService.registerLand(landInput);
      
      if (result) {
        setSuccess('Land parcel registered successfully!');
        setFormData({
          coordinates: '',
          size: '',
          description: '',
          metadata: '',
          price: ''
        });
      }
    } catch (err) {
      setError('Failed to register land parcel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center">Please login to register land.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Register Land Parcel</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="coordinates" className="block text-sm font-medium text-gray-700 mb-1">
            Coordinates (GPS or Virtual)
          </label>
          <input
            type="text"
            id="coordinates"
            name="coordinates"
            value={formData.coordinates}
            onChange={handleInputChange}
            placeholder="e.g., 40.7128, -74.0060 or VR:Zone1:Plot42"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
            Size (square meters or virtual units)
          </label>
          <input
            type="number"
            id="size"
            name="size"
            value={formData.size}
            onChange={handleInputChange}
            placeholder="e.g., 1000"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the land parcel..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Metadata
          </label>
          <textarea
            id="metadata"
            name="metadata"
            value={formData.metadata}
            onChange={handleInputChange}
            placeholder="Zoning info, usage rights, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Price (optional, in e8s)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            placeholder="e.g., 100000000 (1 ICP)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register Land Parcel'}
        </button>
      </form>
    </div>
  );
};

export default RegisterLand;
