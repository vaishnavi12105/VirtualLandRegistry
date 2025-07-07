use candid::{CandidType, Principal};
use ic_cdk::api::time;
use ic_cdk::{caller, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::{Serialize, Deserialize as SerdeDeserialize};
use std::cell::RefCell;
use std::borrow::Cow;

type Memory = VirtualMemory<DefaultMemoryImpl>;
type LandStore = StableBTreeMap<u64, LandParcel, Memory>;
type LandIdCounter = StableBTreeMap<u8, u64, Memory>;
type VerifierStore = StableBTreeMap<Principal, bool, Memory>;
type WalletStore = StableBTreeMap<Principal, u64, Memory>; // User wallet balances in e8s

#[derive(CandidType, Serialize, SerdeDeserialize, Clone, Debug)]
pub enum LandStatus {
    Pending,
    Verified,
    Rejected,
    ForSale,
    Sold,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone)]
pub struct LandTransfer {
    pub from: Principal,
    pub to: Principal,
    pub timestamp: u64,
    pub verified_by: Option<Principal>,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone)]
pub struct LandParcel {
    pub id: u64,
    pub owner: Principal,
    pub coordinates: String, // GPS or VR coordinates
    pub size: f64, // Size in square meters or virtual units
    pub description: String,
    pub status: LandStatus,
    pub verified_by: Option<Principal>,
    pub created_at: u64,
    pub updated_at: u64,
    pub history: Vec<LandTransfer>,
    pub price: Option<u64>, // Optional price if for sale
    pub metadata: String, // Additional metadata like zoning, usage rights
    pub preview_image_url: Option<String>,
}

impl Storable for LandParcel {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for LandStatus {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded { max_size: 32, is_fixed_size: false };
}

#[derive(CandidType, Serialize, SerdeDeserialize)]
pub struct LandInput {
    pub coordinates: String,
    pub size: f64,
    pub description: String,
    pub metadata: String,
    pub price: Option<u64>,
}

#[derive(CandidType, Serialize, SerdeDeserialize, Clone)]
pub struct UserWallet {
    pub principal: Principal,
    pub balance: u64, // Balance in e8s (1 ICP = 100,000,000 e8s)
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static LANDS: RefCell<LandStore> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    static LAND_ID_COUNTER: RefCell<LandIdCounter> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        )
    );

    static VERIFIERS: RefCell<VerifierStore> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
        )
    );

    static WALLETS: RefCell<WalletStore> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        )
    );
}

fn get_next_land_id() -> u64 {
    LAND_ID_COUNTER.with(|counter| {
        let mut counter = counter.borrow_mut();
        let current_id = counter.get(&0).unwrap_or(0);
        let next_id = current_id + 1;
        counter.insert(0, next_id);
        next_id
    })
}

fn is_verifier(principal: &Principal) -> bool {
    VERIFIERS.with(|verifiers| {
        verifiers.borrow().get(principal).unwrap_or(false)
    })
}

#[update]
fn register_land(land_input: LandInput) -> Result<LandParcel, String> {
    let principal = caller();
    
    if principal == Principal::anonymous() {
        return Err("Anonymous users cannot register land".to_string());
    }

    let land_id = get_next_land_id();
    let current_time = time();

    let land_parcel = LandParcel {
        id: land_id,
        owner: principal,
        coordinates: land_input.coordinates,
        size: land_input.size,
        description: land_input.description,
        status: LandStatus::Pending,
        verified_by: None,
        created_at: current_time,
        updated_at: current_time,
        history: vec![LandTransfer {
            from: Principal::anonymous(), // Initial registration
            to: principal,
            timestamp: current_time,
            verified_by: None,
        }],
        price: land_input.price,
        metadata: land_input.metadata,
        preview_image_url: None,
    };

    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        lands.insert(land_id, land_parcel.clone());
    });

    Ok(land_parcel)
}

#[query]
fn get_land_details(land_id: u64) -> Option<LandParcel> {
    LANDS.with(|lands| {
        lands.borrow().get(&land_id)
    })
}

#[query]
fn get_user_lands(owner: Principal) -> Vec<LandParcel> {
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .filter(|(_, land)| land.owner == owner)
            .map(|(_, land)| land)
            .collect()
    })
}

#[query]
fn get_all_lands() -> Vec<LandParcel> {
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .map(|(_, land)| land)
            .collect()
    })
}

#[query]
fn get_lands_for_sale() -> Vec<LandParcel> {
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .filter(|(_, land)| matches!(land.status, LandStatus::ForSale))
            .map(|(_, land)| land)
            .collect()
    })
}

#[query]
fn get_pending_verification_lands() -> Vec<LandParcel> {
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .filter(|(_, land)| matches!(land.status, LandStatus::Pending))
            .map(|(_, land)| land)
            .collect()
    })
}

#[update]
fn verify_land(land_id: u64) -> Result<LandParcel, String> {
    let principal = caller();
    
    if !is_verifier(&principal) {
        return Err("Only verifiers can verify land parcels".to_string());
    }

    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        
        match lands.get(&land_id) {
            Some(mut land) => {
                if !matches!(land.status, LandStatus::Pending) {
                    return Err("Land is not pending verification".to_string());
                }
                
                land.status = LandStatus::Verified;
                land.verified_by = Some(principal);
                land.updated_at = time();
                lands.insert(land_id, land.clone());
                Ok(land)
            },
            None => Err("Land parcel not found".to_string()),
        }
    })
}

#[update]
fn reject_land_verification(land_id: u64) -> Result<LandParcel, String> {
    let principal = caller();
    
    if !is_verifier(&principal) {
        return Err("Only verifiers can reject land verification".to_string());
    }

    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        
        match lands.get(&land_id) {
            Some(mut land) => {
                if !matches!(land.status, LandStatus::Pending) {
                    return Err("Land is not pending verification".to_string());
                }
                
                land.status = LandStatus::Rejected;
                land.verified_by = Some(principal);
                land.updated_at = time();
                lands.insert(land_id, land.clone());
                Ok(land)
            },
            None => Err("Land parcel not found".to_string()),
        }
    })
}

#[update]
fn set_land_for_sale(land_id: u64, price: u64) -> Result<LandParcel, String> {
    let principal = caller();
    
    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        
        match lands.get(&land_id) {
            Some(mut land) => {
                if land.owner != principal {
                    return Err("Only the owner can set land for sale".to_string());
                }
                
                if !matches!(land.status, LandStatus::Verified) {
                    return Err("Only verified land can be put for sale".to_string());
                }
                
                land.status = LandStatus::ForSale;
                land.price = Some(price);
                land.updated_at = time();
                lands.insert(land_id, land.clone());
                Ok(land)
            },
            None => Err("Land parcel not found".to_string()),
        }
    })
}

#[update]
fn transfer_ownership(land_id: u64, new_owner: Principal) -> Result<LandParcel, String> {
    let principal = caller();
    
    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        
        match lands.get(&land_id) {
            Some(mut land) => {
                if land.owner != principal {
                    return Err("Only the owner can transfer ownership".to_string());
                }
                
                let transfer = LandTransfer {
                    from: principal,
                    to: new_owner,
                    timestamp: time(),
                    verified_by: land.verified_by,
                };
                
                land.owner = new_owner;
                land.status = LandStatus::Verified; // Reset to verified after transfer
                land.price = None; // Remove price after transfer
                land.updated_at = time();
                land.history.push(transfer);
                
                lands.insert(land_id, land.clone());
                Ok(land)
            },
            None => Err("Land parcel not found".to_string()),
        }
    })
}

#[update]
fn add_verifier(verifier: Principal) -> Result<String, String> {
    let principal = caller();
    
    // For now, anyone can add verifiers. In production, this should be restricted to admins
    VERIFIERS.with(|verifiers| {
        let mut verifiers = verifiers.borrow_mut();
        verifiers.insert(verifier, true);
    });
    
    Ok("Verifier added successfully".to_string())
}

#[update]
fn remove_verifier(verifier: Principal) -> Result<String, String> {
    let principal = caller();
    
    // For now, anyone can remove verifiers. In production, this should be restricted to admins
    VERIFIERS.with(|verifiers| {
        let mut verifiers = verifiers.borrow_mut();
        verifiers.remove(&verifier);
    });
    
    Ok("Verifier removed successfully".to_string())
}

#[query]
fn is_user_verifier(user: Principal) -> bool {
    is_verifier(&user)
}

#[query]
fn search_lands(query: String) -> Vec<LandParcel> {
    let query_lower = query.to_lowercase();
    
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .filter(|(_, land)| {
                land.description.to_lowercase().contains(&query_lower) ||
                land.coordinates.to_lowercase().contains(&query_lower) ||
                land.metadata.to_lowercase().contains(&query_lower)
            })
            .map(|(_, land)| land)
            .collect()
    })
}

#[query]
fn get_lands_by_status(status: LandStatus) -> Vec<LandParcel> {
    LANDS.with(|lands| {
        lands
            .borrow()
            .iter()
            .filter(|(_, land)| std::mem::discriminant(&land.status) == std::mem::discriminant(&status))
            .map(|(_, land)| land)
            .collect()
    })
}

#[query]
fn get_total_lands() -> u64 {
    LANDS.with(|lands| {
        lands.borrow().len()
    })
}

#[query]
fn get_land_history(land_id: u64) -> Option<Vec<LandTransfer>> {
    LANDS.with(|lands| {
        lands.borrow().get(&land_id).map(|land| land.history)
    })
}

#[update]
fn initialize_sample_data() -> String {
    let principal = caller();
    
    // Only allow initialization if no lands exist yet
    let land_count = LANDS.with(|lands| lands.borrow().len());
    if land_count > 0 {
        return "Sample data already exists".to_string();
    }
    
    let current_time = time();
    
    // Create mock users for demo purposes
    let mock_user_1 = Principal::from_text("rdmx6-jaaaa-aaaah-qcaiq-cai").unwrap_or(Principal::anonymous());
    let mock_user_2 = Principal::from_text("rrkah-fqaaa-aaaah-qcaiq-cai").unwrap_or(Principal::anonymous());
    
    // Initialize wallets for mock users with demo funds
    WALLETS.with(|wallets| {
        let mut wallets = wallets.borrow_mut();
        wallets.insert(mock_user_1, 100_000_000_000u64); // 1000 ICP
        wallets.insert(mock_user_2, 150_000_000_000u64); // 1500 ICP
        wallets.insert(principal, 200_000_000_000u64); // 2000 ICP for current user
    });
    
    // Create sample lands with different owners
    let sample_lands = vec![
        // Land owned by current user
        LandParcel {
            id: get_next_land_id(),
            owner: principal,
            coordinates: "40.7128, -74.0060".to_string(), // New York coordinates
            size: 1000.0,
            description: "Prime Manhattan virtual land parcel with stunning city views".to_string(),
            status: LandStatus::Verified,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: principal,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: None,
            metadata: "Commercial zoning, high traffic area".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9".to_string()),
        },
        // Land owned by mock user 1 - FOR SALE
        LandParcel {
            id: get_next_land_id(),
            owner: mock_user_1,
            coordinates: "34.0522, -118.2437".to_string(), // Los Angeles coordinates
            size: 2500.0,
            description: "Luxury beachfront property in virtual Malibu - Ready for purchase!".to_string(),
            status: LandStatus::ForSale,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: mock_user_1,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: Some(5_000_000_000u64), // 50 ICP in e8s
            metadata: "Residential zoning, beachfront access".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1469474968028-56623f02e42e".to_string()),
        },
        // Land owned by mock user 2 - FOR SALE
        LandParcel {
            id: get_next_land_id(),
            owner: mock_user_2,
            coordinates: "37.7749, -122.4194".to_string(), // San Francisco coordinates
            size: 800.0,
            description: "Tech district land perfect for virtual offices and startups - Available now!".to_string(),
            status: LandStatus::ForSale,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: mock_user_2,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: Some(7_500_000_000u64), // 75 ICP in e8s
            metadata: "Commercial zoning, tech district".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1574949645342-19a5733c3e7b".to_string()),
        },
        // Another land owned by current user
        LandParcel {
            id: get_next_land_id(),
            owner: principal,
            coordinates: "51.5074, -0.1278".to_string(), // London coordinates
            size: 1200.0,
            description: "Historic London virtual district with heritage buildings".to_string(),
            status: LandStatus::Verified,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: principal,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: None,
            metadata: "Mixed-use zoning, historic district".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1513635269975-59663e0ac1ad".to_string()),
        },
    ];
    
    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        for land in sample_lands {
            lands.insert(land.id, land);
        }
    });
    
    "Successfully initialized 4 sample land parcels with demo wallets".to_string()
}

#[update]
fn add_more_sample_lands() -> String {
    let principal = caller();
    let current_time = time();
    
    // Create mock users for demo purposes
    let mock_user_1 = Principal::from_text("rdmx6-jaaaa-aaaah-qcaiq-cai").unwrap_or(Principal::anonymous());
    let mock_user_2 = Principal::from_text("rrkah-fqaaa-aaaah-qcaiq-cai").unwrap_or(Principal::anonymous());
    
    // Additional sample lands for sale
    let additional_lands = vec![
        // Miami Beach land for sale
        LandParcel {
            id: get_next_land_id(),
            owner: mock_user_1,
            coordinates: "25.7617, -80.1918".to_string(), // Miami coordinates
            size: 1500.0,
            description: "Stunning Miami Beach virtual property with ocean views and nightlife access".to_string(),
            status: LandStatus::ForSale,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: mock_user_1,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: Some(12_000_000_000u64), // 120 ICP in e8s  
            metadata: "Entertainment district, beach access".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1506905925346-21bda4d32df4".to_string()),
        },
        // Tokyo Downtown land for sale
        LandParcel {
            id: get_next_land_id(),
            owner: mock_user_2,
            coordinates: "35.6762, 139.6503".to_string(), // Tokyo coordinates
            size: 600.0,
            description: "Premium Tokyo downtown virtual space in the heart of the financial district".to_string(),
            status: LandStatus::ForSale,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: mock_user_2,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: Some(8_500_000_000u64), // 85 ICP in e8s
            metadata: "Financial district, high-rise development".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1540959733332-eab4deabeeaf".to_string()),
        },
        // Las Vegas Strip land for sale
        LandParcel {
            id: get_next_land_id(),
            owner: mock_user_1,
            coordinates: "36.1699, -115.1398".to_string(), // Las Vegas coordinates
            size: 2000.0,
            description: "Virtual Las Vegas Strip property perfect for entertainment venues and casinos".to_string(),
            status: LandStatus::ForSale,
            verified_by: Some(principal),
            created_at: current_time,
            updated_at: current_time,
            history: vec![LandTransfer {
                from: Principal::anonymous(),
                to: mock_user_1,
                timestamp: current_time,
                verified_by: Some(principal),
            }],
            price: Some(15_000_000_000u64), // 150 ICP in e8s
            metadata: "Entertainment zoning, casino district".to_string(),
            preview_image_url: Some("https://images.unsplash.com/photo-1605833556294-ea9d2d702878".to_string()),
        },
    ];
    
    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        for land in additional_lands {
            lands.insert(land.id, land);
        }
    });
    
    "Successfully added 3 additional land parcels for sale (Miami Beach $12K, Tokyo Downtown $8.5K, Las Vegas Strip $15K)".to_string()
}

// Clear all data for demo purposes
#[update]
fn clear_all_data() -> String {
    LANDS.with(|lands| {
        lands.replace(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        ));
    });
    
    LAND_ID_COUNTER.with(|counter| {
        counter.replace(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        ));
    });
    
    WALLETS.with(|wallets| {
        wallets.replace(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        ));
    });
    
    "All data cleared successfully".to_string()
}

// Wallet management functions
#[query]
fn get_wallet_balance(user: Principal) -> u64 {
    WALLETS.with(|wallets| {
        wallets.borrow().get(&user).unwrap_or(0)
    })
}

#[update]
fn add_funds_to_wallet(amount: u64) -> Result<u64, String> {
    let user = caller();
    
    if user == Principal::anonymous() {
        return Err("Anonymous users cannot have wallets".to_string());
    }
    
    WALLETS.with(|wallets| {
        let mut wallets = wallets.borrow_mut();
        let current_balance = wallets.get(&user).unwrap_or(0);
        let new_balance = current_balance + amount;
        wallets.insert(user, new_balance);
        Ok(new_balance)
    })
}

#[update]
fn initialize_user_wallet() -> Result<u64, String> {
    let user = caller();
    
    if user == Principal::anonymous() {
        return Err("Anonymous users cannot have wallets".to_string());
    }
    
    WALLETS.with(|wallets| {
        let mut wallets = wallets.borrow_mut();
        
        // Give new users 50,000,000,000 e8s (500 ICP) as starting balance
        let starting_balance = 50_000_000_000u64; // 500 ICP in e8s
        
        // Only initialize if wallet doesn't exist
        if wallets.get(&user).is_none() {
            wallets.insert(user, starting_balance);
            Ok(starting_balance)
        } else {
            let current_balance = wallets.get(&user).unwrap_or(0);
            Ok(current_balance)
        }
    })
}

#[update]
fn buy_land(land_id: u64) -> Result<LandParcel, String> {
    let buyer = caller();
    
    if buyer == Principal::anonymous() {
        return Err("Anonymous users cannot buy land".to_string());
    }
    
    LANDS.with(|lands| {
        let mut lands = lands.borrow_mut();
        
        match lands.get(&land_id) {
            Some(mut land) => {
                if !matches!(land.status, LandStatus::ForSale) {
                    return Err("Land is not for sale".to_string());
                }
                
                if land.owner == buyer {
                    return Err("You cannot buy your own land".to_string());
                }
                
                let price = land.price.ok_or("Price not set for this land")?;
                
                // Handle wallet transaction
                WALLETS.with(|wallets| {
                    let mut wallets = wallets.borrow_mut();
                    
                    // Check buyer's balance
                    let buyer_balance = wallets.get(&buyer).unwrap_or(0);
                    if buyer_balance < price {
                        return Err(format!("Insufficient funds. You have {} e8s but need {} e8s", buyer_balance, price));
                    }
                    
                    // Get seller's current balance
                    let seller_balance = wallets.get(&land.owner).unwrap_or(0);
                    
                    // Deduct from buyer
                    wallets.insert(buyer, buyer_balance - price);
                    
                    // Credit seller
                    wallets.insert(land.owner, seller_balance + price);
                    
                    // Transfer ownership
                    let transfer = LandTransfer {
                        from: land.owner,
                        to: buyer,
                        timestamp: time(),
                        verified_by: land.verified_by,
                    };
                    
                    land.owner = buyer;
                    land.status = LandStatus::Verified; // Change back to verified after purchase
                    land.price = None; // Remove price after sale
                    land.updated_at = time();
                    land.history.push(transfer);
                    
                    lands.insert(land_id, land.clone());
                    Ok(land)
                })
            },
            None => Err("Land parcel not found".to_string()),
        }
    })
}

// Export candid interface
ic_cdk::export_candid!();
