#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Poll(PollKey),
}

#[contracttype]
#[derive(Clone)]
pub struct PollKey {
    pub contract: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollInfo {
    pub question: String,
    pub active: bool,
    pub total_votes: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollRegisteredEvent {
    #[topic]
    pub poll_contract: Address,
    pub question: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollClosedEvent {
    #[topic]
    pub poll_contract: Address,
}

#[contract]
pub struct PollRegistry;

#[contractimpl]
impl PollRegistry {
    /// Initialize registry with an admin address (called once after deploy).
    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Admin) {
            return;
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Register a poll contract. Admin-only.
    pub fn register_poll(
        env: Env,
        admin: Address,
        poll_contract: Address,
        question: String,
    ) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let key = DataKey::Poll(PollKey {
            contract: poll_contract.clone(),
        });
        let info = PollInfo {
            question: question.clone(),
            active: true,
            total_votes: 0,
        };
        env.storage().instance().set(&key, &info);

        PollRegisteredEvent {
            poll_contract,
            question,
        }
        .publish(&env);
    }

    /// Returns whether voting is open for the given poll contract.
    pub fn is_open(env: Env, poll_contract: Address) -> bool {
        let key = DataKey::Poll(PollKey {
            contract: poll_contract,
        });
        env.storage()
            .instance()
            .get(&key)
            .map(|info: PollInfo| info.active)
            .unwrap_or(false)
    }

    /// Called by a registered poll contract after each vote. Increments total_votes.
    pub fn notify_vote(env: Env, poll_contract: Address) {
        poll_contract.require_auth();

        let key = DataKey::Poll(PollKey {
            contract: poll_contract.clone(),
        });
        let mut info: PollInfo = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("poll not registered"));

        if !info.active {
            panic!("poll is closed");
        }

        info.total_votes += 1;
        env.storage().instance().set(&key, &info);
    }

    /// Close voting for a poll. Admin-only.
    pub fn close_poll(env: Env, admin: Address, poll_contract: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let key = DataKey::Poll(PollKey {
            contract: poll_contract.clone(),
        });
        let mut info: PollInfo = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("poll not registered"));

        info.active = false;
        env.storage().instance().set(&key, &info);

        PollClosedEvent { poll_contract }.publish(&env);
    }

    /// Read poll metadata from the registry.
    pub fn get_poll(env: Env, poll_contract: Address) -> PollInfo {
        let key = DataKey::Poll(PollKey {
            contract: poll_contract,
        });
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("poll not registered"))
    }

    fn require_admin(env: &Env, admin: &Address) {
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("registry not initialized"));
        if stored != *admin {
            panic!("not admin");
        }
    }
}

mod test;
