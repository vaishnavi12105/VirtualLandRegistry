import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'

// Canister IDs - These would be set after deployment
const CANISTER_IDS = {
  auth: import.meta.env.REACT_APP_AUTH_CANISTER_ID,
  land_registry: import.meta.env.REACT_APP_LAND_REGISTRY_CANISTER_ID,
} 

console.log('Canister IDs:', CANISTER_IDS)

// Candid interface definitions
const authIdlFactory = ({ IDL }) => {
  const UserProfile = IDL.Record({
    'user_principal': IDL.Principal,
    'username': IDL.Opt(IDL.Text),
    'email': IDL.Opt(IDL.Text),
    'created_at': IDL.Nat64,
    'last_login': IDL.Nat64,
    'is_active': IDL.Bool,
  })

  return IDL.Service({
    'register_user': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text })], []),
    'login': IDL.Func([], [IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text })], []),
    'get_user_profile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'get_current_user': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'update_user_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text })], []),
    'is_user_registered': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'get_total_users': IDL.Func([], [IDL.Nat64], ['query']),
  })
}

const landRegistryIdlFactory = ({ IDL }) => {
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

  const Result = IDL.Variant({
    'Ok': LandParcel,
    'Err': IDL.Text,
  })

  const StringResult = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  })

  const BalanceResult = IDL.Variant({
    'Ok': IDL.Nat64,
    'Err': IDL.Text,
  })

  return IDL.Service({
    'register_land': IDL.Func([LandInput], [Result], []),
    'get_land_details': IDL.Func([IDL.Nat64], [IDL.Opt(LandParcel)], ['query']),
    'get_user_lands': IDL.Func([IDL.Principal], [IDL.Vec(LandParcel)], ['query']),
    'get_all_lands': IDL.Func([], [IDL.Vec(LandParcel)], ['query']),
    'get_lands_for_sale': IDL.Func([], [IDL.Vec(LandParcel)], ['query']),
    'get_pending_verification_lands': IDL.Func([], [IDL.Vec(LandParcel)], ['query']),
    'get_lands_by_status': IDL.Func([LandStatus], [IDL.Vec(LandParcel)], ['query']),
    'get_total_lands': IDL.Func([], [IDL.Nat64], ['query']),
    'get_land_history': IDL.Func([IDL.Nat64], [IDL.Opt(IDL.Vec(LandTransfer))], ['query']),
    'verify_land': IDL.Func([IDL.Nat64], [Result], []),
    'reject_land_verification': IDL.Func([IDL.Nat64], [Result], []),
    'set_land_for_sale': IDL.Func([IDL.Nat64, IDL.Nat64], [Result], []),
    'buy_land': IDL.Func([IDL.Nat64], [Result], []),
    'remove_land_from_sale': IDL.Func([IDL.Nat64], [Result], []),
    'transfer_ownership': IDL.Func([IDL.Nat64, IDL.Principal], [Result], []),
    'add_verifier': IDL.Func([IDL.Principal], [StringResult], []),
    'remove_verifier': IDL.Func([IDL.Principal], [StringResult], []),
    'is_user_verifier': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'search_lands': IDL.Func([IDL.Text], [IDL.Vec(LandParcel)], ['query']),
    'initialize_sample_data': IDL.Func([], [StringResult], []),
    'get_wallet_balance': IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'add_funds_to_wallet': IDL.Func([IDL.Nat64], [BalanceResult], []),
    'initialize_user_wallet': IDL.Func([], [BalanceResult], []),
  })
}

class CanisterService {
  constructor() {
    this.agent = null
    this.authActor = null
    this.landRegistryActor = null
  }

  async initializeAgent(identity = null) {
    try {
      const host = import.meta.env.REACT_APP_NODE_ENV === 'development' 
        ? 'http://localhost:8000' 
        : 'https://ic0.app'

      if (identity?.agent && identity?.principal && identity?.isPlugWallet) {
        console.log('🔌 Using Plug Wallet. Creating actors with standard method.')
        
        // Use the authenticated agent provided by Plug Wallet
        this.agent = identity.agent

        // CRITICAL: In local development, Plug's agent might need the root key fetched manually.
        if (import.meta.env.REACT_APP_NODE_ENV === 'development') {
          try {
            console.log('Fetching root key for Plug agent...')
            await this.agent.fetchRootKey()
            console.log('✅ Root key fetched successfully for Plug agent.')
          } catch (e) {
            console.error('Could not fetch root key for Plug agent. This might be okay if the replica is already known.', e)
          }
        }

        // Create actors using the standard method, not window.ic.plug.createActor
        this.authActor = Actor.createActor(authIdlFactory, {
          agent: this.agent,
          canisterId: CANISTER_IDS.auth,
        })

        this.landRegistryActor = Actor.createActor(landRegistryIdlFactory, {
          agent: this.agent,
          canisterId: CANISTER_IDS.land_registry,
        })

        console.log('✅ Plug Wallet actors created successfully using standard Actor.createActor')
        
        return
      }
    
      this.agent = new HttpAgent({ 
        host,
        identity 
      })

      // Always fetch root key for local development
      if (import.meta.env.REACT_APP_NODE_ENV === 'development') {
        await this.agent.fetchRootKey()
      }

      this.authActor = Actor.createActor(authIdlFactory, {
        agent: this.agent,
        canisterId: CANISTER_IDS.auth,
      })

      // Create land registry actor 
      this.landRegistryActor = Actor.createActor(landRegistryIdlFactory, {
        agent: this.agent,
        canisterId: CANISTER_IDS.land_registry,
      })

      console.log('All actors initialized successfully')
    } catch (error) {
      console.error('Agent initialization failed:', error)
      throw error
    }
  }

  // Auth methods
  async registerUser(username, email) {
    if (!this.authActor) throw new Error('Auth actor not initialized')
    return await this.authActor.register_user(username ? [username] : [], email ? [email] : [])
  }

  async loginUser() {
    if (!this.authActor) throw new Error('Auth actor not initialized')
    return await this.authActor.login()
  }

  async getCurrentUser() {
    if (!this.authActor) throw new Error('Auth actor not initialized')
    return await this.authActor.get_current_user()
  }

  async getUserProfile(principal) {
    if (!this.authActor) throw new Error('Auth actor not initialized')
    return await this.authActor.get_user_profile(principal)
  }

  // Land Registry methods
  async registerLand(landInput) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.register_land(landInput)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async getLandDetails(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.get_land_details(landId)
    return result.length > 0 ? result[0] : null
  }

  async getUserLands(principal) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_user_lands(principal)
  }

  async getAllLands() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_all_lands()
  }

  async getLandsForSale() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_lands_for_sale()
  }

  async getPendingVerificationLands() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_pending_verification_lands()
  }

  async verifyLand(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.verify_land(landId)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async rejectLandVerification(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.reject_land_verification(landId)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async setLandForSale(landId, price) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    
    try {
      // Add logging for debugging
      console.log(`Attempting to set land ${landId} for sale at price ${price}`);
      console.log('Current identity:', this.landRegistryActor._agent.getPrincipal().toString());
      
      // First check if land exists and user owns it
      const landDetails = await this.landRegistryActor.get_land_details(landId);
      if (!landDetails || !landDetails[0]) {
        throw new Error(`Land ${landId} not found`);
      }
      
      const land = landDetails[0];
      console.log('Land details:', land);
      console.log('Land owner:', land.owner.toString());
      console.log('Current user:', this.landRegistryActor._agent.getPrincipal().toString());
      
      if (land.owner.toString() !== this.landRegistryActor._agent.getPrincipal().toString()) {
        throw new Error(`You don't own this land. Owner: ${land.owner.toString()}`);
      }
      
      const result = await this.landRegistryActor.set_land_for_sale(landId, price)
      if (result.Err) throw new Error(result.Err)
      return result.Ok
    } catch (error) {
      console.error('Error in setLandForSale:', error);
      throw error;
    }
  }

  async buyLand(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    
    try {
      // Add logging for debugging
      console.log(`Attempting to buy land ${landId}`);
      console.log('Current identity:', this.landRegistryActor._agent.getPrincipal().toString());
      
      // First check if land exists and is for sale
      const landDetails = await this.landRegistryActor.get_land_details(landId);
      if (!landDetails || !landDetails[0]) {
        throw new Error(`Land ${landId} not found`);
      }
      
      const land = landDetails[0];
      console.log('Land details:', land);
      console.log('Land status:', land.status);
      console.log('Land owner:', land.owner.toString());
      
      if (!land.status.ForSale) {
        throw new Error(`Land ${landId} is not for sale. Current status: ${Object.keys(land.status)[0]}`);
      }
      
      const result = await this.landRegistryActor.buy_land(landId)
      if (result.Err) throw new Error(result.Err)
      return result.Ok
    } catch (error) {
      console.error('Error in buyLand:', error);
      throw error;
    }
  }

  async removeLandFromSale(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.remove_land_from_sale(landId)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async transferOwnership(landId, newOwner) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.transfer_ownership(landId, newOwner)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async addVerifier(verifier) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.add_verifier(verifier)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async removeVerifier(verifier) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.remove_verifier(verifier)
    if (result.Err) throw new Error(result.Err)
    return result.Ok
  }

  async isUserVerifier(user) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.is_user_verifier(user)
  }

  async searchLands(query) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.search_lands(query)
  }

  async getLandHistory(landId) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    const result = await this.landRegistryActor.get_land_history(landId)
    return result.length > 0 ? result[0] : []
  }

  async getTotalLands() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_total_lands()
  }

  // Initialize sample data (for development purposes)
  async initializeSampleData() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.initialize_sample_data()
  }

  // Wallet management functions
  async getWalletBalance(userPrincipal) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.get_wallet_balance(userPrincipal)
  }

  async addFundsToWallet(amount) {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.add_funds_to_wallet(amount)
  }

  async initializeUserWallet() {
    if (!this.landRegistryActor) throw new Error('Land Registry actor not initialized')
    return await this.landRegistryActor.initialize_user_wallet()
  }

  // Legacy methods for backward compatibility (throws errors since we're using land registry now)
  async uploadAsset() {
    throw new Error('Asset upload is no longer supported in Land Registry mode')
  }

  async getAssetsForSale() {
    // Redirect to lands for sale
    return this.getLandsForSale()
  }

  async setAssetForSale() {
    throw new Error('Use setLandForSale instead')
  }

  async buyAsset() {
    throw new Error('Use buyLand instead')
  }
}

// Create and export singleton instance
const service = new CanisterService()
export default service
