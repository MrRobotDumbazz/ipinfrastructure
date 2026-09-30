#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
RPC="http://127.0.0.1:8899"
PORT=3999
BASE="http://127.0.0.1:${PORT}/api/v1"
LEDGER="$(mktemp -d /tmp/ip-api-smoke-ledger.XXXXXX)"
WORK="$(mktemp -d /tmp/ip-api-smoke-work.XXXXXX)"
VALIDATOR_PID=""
API_PID=""

cleanup() {
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "$VALIDATOR_PID" ] && kill "$VALIDATOR_PID" 2>/dev/null || true
  sleep 1
  rm -rf "$LEDGER" "$WORK"
}
trap cleanup EXIT

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }

echo "[1/7] starting validator"
solana-test-validator --ledger "$LEDGER" --rpc-port 8899 >"$WORK/validator.log" 2>&1 &
VALIDATOR_PID=$!
for i in $(seq 1 60); do
  if solana cluster-version --url "$RPC" >/dev/null 2>&1; then break; fi
  sleep 1
  [ "$i" == 60 ] && fail "validator did not start"
done

echo "[2/7] wallet + airdrop"
WALLET="$WORK/wallet.json"
solana-keygen new --no-bip39-passphrase --force -o "$WALLET" >/dev/null
solana airdrop --url "$RPC" 10 "$(solana-keygen pubkey "$WALLET")" >/dev/null
solana balance --url "$RPC" "$(solana-keygen pubkey "$WALLET")" | rg -q "10 SOL" || fail "airdrop"

echo "[3/7] deploying ip_registry"
solana program deploy \
  --url "$RPC" \
  --keypair "$WALLET" \
  --program-id "$REPO_ROOT/backend/onchain/target/deploy/ip_registry-keypair.json" \
  "$REPO_ROOT/backend/onchain/target/deploy/ip_registry.so" >"$WORK/deploy.log" 2>&1 \
  || { cat "$WORK/deploy.log"; fail "deploy"; }

echo "[4/7] starting ip-api"
PORT=$PORT SOLANA_RPC_URL=$RPC SERVER_KEYPAIR_PATH="$WALLET" \
  cargo run --quiet --manifest-path "$REPO_ROOT/backend/api/Cargo.toml" >"$WORK/api.log" 2>&1 &
API_PID=$!
for i in $(seq 1 120); do
  if curl -sf "$BASE/ip/assets" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$API_PID" 2>/dev/null; then cat "$WORK/api.log"; fail "api died"; fi
  sleep 1
  [ "$i" == 120 ] && { cat "$WORK/api.log"; fail "api did not start"; }
done

echo "[5/7] register + list assets"
HASH=$(python3 -c 'print("ab"*32)')
REGISTER=$(curl -s -w '\n%{http_code}' -X POST "$BASE/ip/register" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke Asset\",\"type\":\"patent\",\"contentHash\":\"$HASH\",\"uri\":\"ipfs://smoke\"}")
BODY=$(echo "$REGISTER" | head -n -1); CODE=$(echo "$REGISTER" | tail -n1)
[ "$CODE" == "201" ] || fail "register: $CODE $BODY"
ASSET_ID=$(echo "$BODY" | jq -r '.id')
echo "$BODY" | jq -e '.type=="patent" and (.txSignature|length)>=64 and (.contentHash|length)==64 and (.registeredAt|length)>=20' >/dev/null || fail "register body: $BODY"

ASSETS=$(curl -s "$BASE/ip/assets")
echo "$ASSETS" | jq -e 'length==1 and .[0].id=="'$ASSET_ID'"' >/dev/null || fail "assets: $ASSETS"

BAD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/ip/register" \
  -H 'Content-Type: application/json' \
  -d '{"title":"x","type":"patent","contentHash":"zz"}')
[ "$BAD" == "400" ] || fail "bad hash expected 400, got $BAD"

echo "[6/7] licenses"
LICENSE=$(curl -s -w '\n%{http_code}' -X POST "$BASE/ip/licenses" \
  -H 'Content-Type: application/json' \
  -d "{\"ipAssetId\":\"$ASSET_ID\",\"licenseType\":\"non-exclusive\",\"royaltyBps\":500}")
BODY=$(echo "$LICENSE" | head -n -1); CODE=$(echo "$LICENSE" | tail -n1)
[ "$CODE" == "201" ] || fail "license: $CODE $BODY"
echo "$BODY" | jq -e '.licenseType=="non-exclusive" and .royaltyBps==500 and .ipAssetId=="'$ASSET_ID'"' >/dev/null || fail "license body: $BODY"

LICENSES=$(curl -s "$BASE/ip/licenses")
echo "$LICENSES" | jq -e 'length==1' >/dev/null || fail "licenses list: $LICENSES"

BAD_LIC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/ip/licenses" \
  -H 'Content-Type: application/json' \
  -d "{\"ipAssetId\":\"$ASSET_ID\",\"licenseType\":\"exclusive\",\"royaltyBps\":20000}")
[ "$BAD_LIC" == "400" ] || fail "bad royalty expected 400, got $BAD_LIC"

echo "[7/7] trade orders"
ORDER=$(curl -s -w '\n%{http_code}' -X POST "$BASE/trade/orders" \
  -H 'Content-Type: application/json' \
  -d "{\"ipAssetId\":\"$ASSET_ID\",\"priceInSol\":1.5}")
BODY=$(echo "$ORDER" | head -n -1); CODE=$(echo "$ORDER" | tail -n1)
[ "$CODE" == "201" ] || fail "order: $CODE $BODY"
echo "$BODY" | jq -e '.status=="open" and .priceInSol==1.5 and .buyer==null and (.seller|length)>32' >/dev/null || fail "order body: $BODY"

ORDERS=$(curl -s "$BASE/trade/orders")
echo "$ORDERS" | jq -e 'length==1 and .[0].status=="open"' >/dev/null || fail "orders list: $ORDERS"

BAD_TRD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/trade/orders" \
  -H 'Content-Type: application/json' \
  -d "{\"ipAssetId\":\"$ASSET_ID\",\"priceInSol\":0}")
[ "$BAD_TRD" == "400" ] || fail "bad price expected 400, got $BAD_TRD"

echo "SMOKE OK: 6 endpoints verified against localnet"
