# 🚀 How to Restart DFX Without Losing Data

## ⚠️ IMPORTANT: Do NOT use `dfx start --clean`

Using `dfx start --clean` will wipe ALL your data and create new canister IDs, which will break your app!

## ✅ Correct Way to Restart DFX

### To restart DFX while preserving data:

```bash
# Stop DFX
dfx stop

# Start DFX (without --clean flag)
dfx start --background

# If you need to redeploy after making changes:
dfx deploy
```

### To completely reset and start fresh (⚠️ This will lose all data):

```bash
# Stop DFX
dfx stop

# Start fresh (this creates new canister IDs)
dfx start --clean --background

# Deploy all canisters
dfx deploy

# Update .env file with new canister IDs
# You'll need to copy the new canister IDs from the deploy output into frontend/.env
```

## 🔧 Current Canister IDs

Your current canister IDs are:
- **Asset Canister (Land Registry)**: `uxrrr-q7777-77774-qaaaq-cai`
- **Auth Canister**: `u6s2n-gx777-77774-qaaba-cai`
- **Marketplace Canister**: `ulvla-h7777-77774-qaacq-cai`
- **Internet Identity**: `umunu-kh777-77774-qaaca-cai`
- **Frontend**: `uzt4z-lp777-77774-qaabq-cai`

## 🌐 App URLs

- **Frontend App**: http://uzt4z-lp777-77774-qaabq-cai.localhost:8000/
- **Internet Identity**: http://umunu-kh777-77774-qaaca-cai.localhost:8000/

## 🗂️ Data Persistence

The app uses **stable storage** which means:
- ✅ Your land data persists across normal restarts
- ✅ Authentication works correctly
- ✅ No need to re-register lands

## 🐛 Troubleshooting

### If you see "Canister not found" errors:
1. Check that DFX is running: `dfx ping`
2. Verify canister IDs match between `.env` file and deployed canisters
3. Redeploy if needed: `dfx deploy`

### If authentication doesn't work:
1. Clear browser cache for localhost:8000
2. Make sure Internet Identity canister is deployed
3. Check that the correct Internet Identity URL is being used

### If you accidentally used `--clean`:
1. Update the canister IDs in `frontend/.env` with the new ones from deploy output
2. Rebuild and redeploy: `dfx deploy`
3. Use the "Create Sample Lands" button in the "My Lands" section to add demo data
