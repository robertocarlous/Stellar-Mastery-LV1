#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, IntoVal, Symbol};

const YES: &str = "yes";
const NO: &str = "no";

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    YesVotes,
    NoVotes,
    Registry,
    Admin,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteEvent {
    #[topic]
    pub voter: Address,
    pub choice: Symbol,
    pub yes_total: u32,
    pub no_total: u32,
}

#[contract]
pub struct LivePoll;

#[contractimpl]
impl LivePoll {
    /// Initialize vote counters (called once after deploy).
    pub fn init(env: Env) {
        if env.storage().instance().has(&DataKey::YesVotes) {
            return;
        }
        env.storage().instance().set(&DataKey::YesVotes, &0u32);
        env.storage().instance().set(&DataKey::NoVotes, &0u32);
    }

    /// Link this poll to a registry contract. Admin-only, called once after deploy.
    pub fn configure(env: Env, admin: Address, registry: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
    }

    /// Cast a vote. `choice` must be the symbol `yes` or `no`.
    /// When a registry is configured, checks `is_open` and calls `notify_vote` via cross-contract invoke.
    pub fn vote(env: Env, voter: Address, choice: Symbol) {
        voter.require_auth();

        if let Some(registry) = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Registry)
        {
            let poll_addr = env.current_contract_address();
            let is_open: bool = env.invoke_contract(
                &registry,
                &Symbol::new(&env, "is_open"),
                (poll_addr.clone(),).into_val(&env),
            );
            if !is_open {
                panic!("poll is closed");
            }
        }

        let yes_sym = Symbol::new(&env, YES);
        let no_sym = Symbol::new(&env, NO);

        let mut yes: u32 = env
            .storage()
            .instance()
            .get(&DataKey::YesVotes)
            .unwrap_or(0);
        let mut no: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NoVotes)
            .unwrap_or(0);

        if choice == yes_sym {
            yes += 1;
            env.storage().instance().set(&DataKey::YesVotes, &yes);
        } else if choice == no_sym {
            no += 1;
            env.storage().instance().set(&DataKey::NoVotes, &no);
        } else {
            panic!("invalid choice: use yes or no");
        }

        if let Some(registry) = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Registry)
        {
            let poll_addr = env.current_contract_address();
            let _: () = env.invoke_contract(
                &registry,
                &Symbol::new(&env, "notify_vote"),
                (poll_addr,).into_val(&env),
            );
        }

        VoteEvent {
            voter,
            choice,
            yes_total: yes,
            no_total: no,
        }
        .publish(&env);
    }

    /// Read current yes/no totals from contract storage.
    pub fn get_results(env: Env) -> (u32, u32) {
        let yes: u32 = env
            .storage()
            .instance()
            .get(&DataKey::YesVotes)
            .unwrap_or(0);
        let no: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NoVotes)
            .unwrap_or(0);
        (yes, no)
    }

    /// Returns the linked registry address, if configured.
    pub fn get_registry(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::Registry)
    }
}

mod test;
