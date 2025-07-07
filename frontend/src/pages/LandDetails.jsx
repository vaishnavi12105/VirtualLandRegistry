import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const LandDetails = () => {
  const { landId } = useParams();
  const { isAuthenticated, principal } = useAuth();
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (landId) {
      fetchLandDetails();
    }
  }, [landId]);

  const fetchLandDetails = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to get land details
      // const result = await landActor.get_land_details(BigInt(landId));
      // if (result.length > 0) {
      //   setLand(result[0]);
      // } else {
      //   setError('Land parcel not found');
      // }
      setLand(null); // Temporary
      setError('Land parcel not found'); // Temporary
    } catch (err) {
      setError('Failed to fetch land details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo.trim()) {
      setError('Please enter a valid Principal ID');
      return;
    }

    try {
      setTransferLoading(true);
      // TODO: Implement API call to transfer ownership
      // const result = await landActor.transfer_ownership(BigInt(landId), Principal.fromText(transferTo));
      // if (result.Ok) {
      //   fetchLandDetails(); // Refresh land details
      //   setTransferTo('');
      // } else {
      //   setError(result.Err);
      // }
      console.log('Transferring to:', transferTo);
    } catch (err) {
      setError('Failed to transfer ownership: ' + err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified': return 'text-green-600 bg-green-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      case 'ForSale': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center">Please login to view land details.</div>;
  }

  if (loading) {
    return <div className="text-center">Loading land details...</div>;
  }

  if (error && !land) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!land) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Land Not Found</h1>
        <p className="text-gray-600">The requested land parcel could not be found.</p>
      </div>
    );
  }

  const isOwner = land.owner.toString() === principal?.toString();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Land Parcel #{land.id}</h1>
            <p className="text-gray-600">Owner: {land.owner.toString()}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(land.status)}`}>
            {land.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Property Details</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Coordinates:</span>
                <p className="text-gray-600">{land.coordinates}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Size:</span>
                <p className="text-gray-600">{land.size} units</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-600">{land.description}</p>
              </div>
              {land.metadata && (
                <div>
                  <span className="font-medium text-gray-700">Metadata:</span>
                  <p className="text-gray-600">{land.metadata}</p>
                </div>
              )}
              {land.price && (
                <div>
                  <span className="font-medium text-gray-700">Price:</span>
                  <p className="text-gray-600">{land.price} e8s</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Verification & History</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <p className="text-gray-600">{land.status}</p>
              </div>
              {land.verified_by && (
                <div>
                  <span className="font-medium text-gray-700">Verified by:</span>
                  <p className="text-gray-600">{land.verified_by.toString()}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">
                  {new Date(Number(land.created_at) / 1000000).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">
                  {new Date(Number(land.updated_at) / 1000000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {land.history && land.history.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Transfer History</h2>
            <div className="space-y-2">
              {land.history.map((transfer, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-600">
                        From: {transfer.from.toString()} → To: {transfer.to.toString()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(Number(transfer.timestamp) / 1000000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Owner Actions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Ownership
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="Enter Principal ID"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {transferLoading ? 'Transferring...' : 'Transfer'}
                  </button>
                </div>
              </div>

              {land.status === 'Verified' && (
                <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                  Set for Sale
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandDetails;
