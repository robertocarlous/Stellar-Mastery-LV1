#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, Symbol};

const YES: &str = "yes";
const NO: &str = "no";

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    YesVotes,
    NoVotes,
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

    /// Cast a vote. `choice` must be the symbol `yes` or `no`.
    pub fn vote(env: Env, voter: Address, choice: Symbol) {
        voter.require_auth();

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
}

mod test;
