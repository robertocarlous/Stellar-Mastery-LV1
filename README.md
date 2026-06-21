# Stellar Mastery — Level 1 White Belt + Level 2 Yellow Belt

A Stellar testnet dApp that grows from **Level 1 (White Belt)** payment basics to **Level 2 (Yellow Belt)** multi-wallet integration, Soroban smart contracts, and real-time event handling.

## Project description

### Level 1 — White Belt (Simple Payment dApp)
- Freighter / multi-wallet connection on testnet
- XLM balance display
- Send testnet XLM payments with success/failure feedback

### Level 2 — Yellow Belt (Live Poll dApp)
- **StellarWalletsKit** — Freighter, xBull, Albedo, LOBSTR, Hana, and more
- **Soroban smart contract** — deployed poll contract on testnet
- **Read/write contract data** — fetch yes/no totals, submit votes
- **Real-time events** — poll vote activity feed (RPC polling every 5s)
- **Transaction status** — pending / success / failed with explorer links
- **Error handling** — wallet not found, connection rejected, insufficient balance

**Project idea:** Live Poll — one-question poll with real-time vote results.

## Tech stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| `@creit.tech/stellar-wallets-kit` | Multi-wallet integration |
| `@stellar/stellar-sdk` | Horizon, Soroban RPC, contract calls, events |
| Soroban (Rust) | On-chain poll contract with events |

## Deployed contract (testnet)

| Field | Value |
|-------|-------|
| Contract ID | `CAYIMSMU3DJRHUG5NUOJNO6BIBPQT7LMVPCO5JNOIGQRNPHBA7WWIIG7` |
| Network | Stellar Testnet |
| Explorer | [View contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAYIMSMU3DJRHUG5NUOJNO6BIBPQT7LMVPCO5JNOIGQRNPHBA7WWIIG7) |
| Deploy tx | [8aa728926050c577fcececb8a54bb9d97935e1869d734db238670d053eeddaa8](https://stellar.expert/explorer/testnet/tx/8aa728926050c577fcececb8a54bb9d97935e1869d734db238670d053eeddaa8) |
| Contract call — vote (YES) | [2eb40475b12ad34ac8757d6d9e4c653937b608f70b457f52b7bf88ebbeb319d6](https://stellar.expert/explorer/testnet/tx/2eb40475b12ad34ac8757d6d9e4c653937b608f70b457f52b7bf88ebbeb319d6) |

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- A Stellar wallet (Freighter, xBull, Albedo, LOBSTR, etc.)
- Wallet set to **Testnet**
- (Optional, for redeploy) [Stellar CLI](https://developers.stellar.org/docs/tools/cli) + Rust

## Setup instructions (run locally)

```bash
git clone https://github.com/robertocarlous/Stellar-Mastery-LV1.git
cd Stellar-Mastery-LV1

npm install

# Copy env and use the deployed contract ID (or redeploy your own)
cp .env.example .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Fund your testnet wallet

1. Connect a wallet from the multi-wallet picker.
2. If balance is `0 XLM`, use **Fund with Friendbot** in the balance card.
3. Click **Refresh**.

### Vote on the live poll (Level 2)

1. Stay on the **Live Poll** tab.
2. Click **Vote Yes** or **Vote No**.
3. Approve the Soroban transaction in your wallet.
4. Watch the transaction status (pending → success) and the live event feed update.

### Send XLM (Level 1)

Switch to the **XLM Payment** tab to use the original White Belt payment flow.

## Redeploy the contract (optional)

```bash
# Build Soroban contract
npm run contract:build

# Generate & fund a deployer key
stellar keys generate deployer --network testnet
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"

# Deploy (writes NEXT_PUBLIC_POLL_CONTRACT_ID to .env.local)
DEPLOYER_SECRET=$(stellar keys show deployer) npm run contract:deploy
```

## Project structure

```
├── app/                    # Next.js pages
├── components/
│   ├── WalletConnection.tsx   # Multi-wallet picker (StellarWalletsKit)
│   ├── PollPanel.tsx          # Contract read/write + tx status
│   ├── EventFeed.tsx          # Real-time vote events
│   ├── TransactionStatus.tsx  # Pending/success/failed UI
│   └── PaymentForm.tsx        # Level 1 XLM payments
├── contracts/
│   └── contracts/live_poll/   # Soroban Rust poll contract
├── hooks/useWalletKit.ts      # Multi-wallet hook + error handling
├── lib/
│   ├── wallets-kit.ts         # StellarWalletsKit init
│   ├── contract/poll.ts       # Contract invoke helpers
│   └── contract/events.ts     # RPC event polling
└── scripts/deploy-contract.mjs
```

## Screenshots (Level 1)

### Wallet connected state

![Wallet connected](./public/screenshots/wallet-connected.png)

### Balance displayed

![Balance displayed](./public/screenshots/balance-displayed.png)

### Successful testnet transaction

![Successful transaction](./public/screenshots/transaction-success.png)

### Sample Level 1 payment tx

| Field | Value |
|-------|-------|
| Transaction hash | `38f8edc4020cbe20b7983dfff746a3caf9a843960642b24d912e8340372d78db` |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/38f8edc4020cbe20b7983dfff746a3caf9a843960642b24d912e8340372d78db) |

## Screenshots (Level 2)

### Wallet options available

Multi-wallet picker via StellarWalletsKit — Freighter, xBull, Albedo, LOBSTR, Hana, and more.

![Wallet options](./public/screenshots/wallet-options.png)

### Wallet connected + Live Poll

Freighter connected on testnet with XLM balance and the Live Poll tab active.

![Poll connected](./public/screenshots/poll-connected.png)

### Successful poll vote + live event feed

Vote recorded on testnet with transaction hash, success feedback, and real-time vote events.

![Poll vote success](./public/screenshots/poll-vote-success.png)

### Sample Level 2 poll vote tx

| Field | Value |
|-------|-------|
| Network | Stellar Testnet |
| Action | `vote` (YES) on poll contract |
| Transaction hash | `2eb40475b12ad34ac8757d6d9e4c653937b608f70b457f52b7bf88ebbeb319d6` |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/2eb40475b12ad34ac8757d6d9e4c653937b608f70b457f52b7bf88ebbeb319d6) |

## Level 2 checklist

- [x] StellarWalletsKit multi-wallet integration
- [x] Error: wallet not found
- [x] Error: connection rejected
- [x] Error: insufficient balance
- [x] Contract deployed on testnet
- [x] Contract called from frontend (vote + get_results)
- [x] Read/write contract data
- [x] Event listening + state sync (RPC polling)
- [x] Transaction status visible (pending/success/failed)
- [x] Screenshot: wallet options available
- [ ] Live demo link (optional — deploy to Vercel)
- [ ] Minimum 2+ meaningful commits on GitHub

## Deployment (Vercel)

```bash
npm run build
```

Set environment variable in Vercel:
```
NEXT_PUBLIC_POLL_CONTRACT_ID=CAYIMSMU3DJRHUG5NUOJNO6BIBPQT7LMVPCO5JNOIGQRNPHBA7WWIIG7
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No wallets shown | Install Freighter or another supported extension |
| Connection rejected | Approve the connection prompt in your wallet |
| Insufficient balance | Fund with Friendbot — contract txs need ~1+ XLM |
| Contract not configured | Set `NEXT_PUBLIC_POLL_CONTRACT_ID` in `.env.local` |
| Vote fails | Ensure wallet is on Testnet and has XLM for fees |

## License

MIT
