#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

#[test]
fn init_and_vote_updates_results() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(LivePoll, ());
    let client = LivePollClient::new(&env, &contract_id);
    let voter = Address::generate(&env);

    client.init();
    assert_eq!(client.get_results(), (0, 0));

    client.vote(&voter, &Symbol::new(&env, "yes"));
    assert_eq!(client.get_results(), (1, 0));

    client.vote(&voter, &Symbol::new(&env, "no"));
    assert_eq!(client.get_results(), (1, 1));
}
