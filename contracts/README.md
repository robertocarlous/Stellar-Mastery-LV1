# Soroban Contracts — Level 3

Two Soroban contracts with inter-contract communication:

| Contract | Purpose |
|----------|---------|
| `poll_registry` | Admin-managed poll registry — registers polls, tracks status, validates votes |
| `live_poll` | On-chain yes/no poll — calls registry via cross-contract invoke on each vote |

## Architecture

```
┌─────────────┐     is_open()      ┌─────────────────┐
│  live_poll  │ ─────────────────► │  poll_registry  │
│  (vote)     │     notify_vote()  │  (admin, status) │
└─────────────┘ ◄───────────────── └─────────────────┘
```

## Build & test

```bash
cd contracts
cargo test          # 8 tests (5 live_poll + 3 poll_registry)
stellar contract build
```

## Contract API

### poll_registry

| Function | Auth | Description |
|----------|------|-------------|
| `init(admin)` | admin | Initialize registry |
| `register_poll(admin, poll, question)` | admin | Register a poll contract |
| `is_open(poll)` | — | Returns whether voting is open |
| `notify_vote(poll)` | poll contract | Increment vote count (called by live_poll) |
| `close_poll(admin, poll)` | admin | Close voting |
| `get_poll(poll)` | — | Read poll metadata |

### live_poll

| Function | Auth | Description |
|----------|------|-------------|
| `init()` | — | Initialize vote counters |
| `configure(admin, registry)` | admin | Link to registry contract |
| `vote(voter, choice)` | voter | Cast yes/no vote (checks registry if configured) |
| `get_results()` | — | Returns (yes, no) totals |
| `get_registry()` | — | Returns linked registry address |

## Events

- `VoteEvent` — emitted by live_poll on each vote
- `PollRegisteredEvent` — emitted by poll_registry when a poll is registered
- `PollClosedEvent` — emitted when admin closes a poll
