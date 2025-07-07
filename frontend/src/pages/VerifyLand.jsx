import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';

const VerifyLand = () => {
  const { isAuthenticated, principal } = useAuth();
  const [pendingLands, setPendingLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVerifier, setIsVerifier] = useState(false);

  useEffect(() => {
    if (isAuthenticated && principal) {
      checkVerifierStatus();
      fetchPendingLands();
    }
  }, [isAuthenticated, principal]);

  const checkVerifierStatus = async () => {
    try {
      // TODO: Implement API call to check if user is verifier
      // const result = await landActor.is_user_verifier(principal);
      // setIsVerifier(result);
      setIsVerifier(false); // Temporary
    } catch (err) {
      console.error('Failed to check verifier status:', err);
    }
  };

  const fetchPendingLands = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to get pending verification lands
      // const result = await landActor.get_pending_verification_lands();
      // setPendingLands(result);
      setPendingLands([]); // Temporary empty array
    } catch (err) {
      setError('Failed to fetch pending lands: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLand = async (landId) => {
    try {
      // TODO: Implement API call to verify land
      // const result = await landActor.verify_land(landId);
      // if (result.Ok) {
      //   fetchPendingLands(); // Refresh the list
      // } else {
      //   setError(result.Err);
      // }
      console.log('Verifying land:', landId);
    } catch (err) {
      setError('Failed to verify land: ' + err.message);
    }
  };

  const handleRejectLand = async (landId) => {
    try {
      // TODO: Implement API call to reject land verification
      // const result = await landActor.reject_land_verification(landId);
      // if (result.Ok) {
      //   fetchPendingLands(); // Refresh the list
      // } else {
      //   setError(result.Err);
      // }
      console.log('Rejecting land:', landId);
    } catch (err) {
      setError('Failed to reject land: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center">Please login to access the verification panel.</div>;
  }

  if (!isVerifier) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">You are not authorized to verify land parcels.</p>
        <p className="text-gray-600">Contact an administrator to become a verifier.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center">Loading pending verifications...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Land Verification Panel</h1>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-6">
          {error}
        </div>
      )}

      {pendingLands.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No land parcels pending verification.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingLands.map((land) => (
            <div key={land.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Land Parcel #{land.id}</h3>
                  <p className="text-gray-600">Owner: {land.owner.toString()}</p>
                  <p className="text-gray-600">
                    Registered: {new Date(Number(land.created_at) / 1000000).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Pending Verification
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Location & Size</h4>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Coordinates:</strong> {land.coordinates}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Size:</strong> {land.size} units
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{land.description}</p>
                </div>
              </div>

              {land.metadata && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">Additional Metadata</h4>
                  <p className="text-sm text-gray-600">{land.metadata}</p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => handleVerifyLand(land.id)}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Verify Land
                </button>
                <button
                  onClick={() => handleRejectLand(land.id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Reject Verification
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifyLand;
