#![cfg(test)]
extern crate std;

use super::*;
use poll_registry::{PollRegistry, PollRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol};

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

#[test]
#[should_panic(expected = "invalid choice")]
fn invalid_choice_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(LivePoll, ());
    let client = LivePollClient::new(&env, &contract_id);
    let voter = Address::generate(&env);

    client.init();
    client.vote(&voter, &Symbol::new(&env, "maybe"));
}

#[test]
fn init_is_idempotent() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(LivePoll, ());
    let client = LivePollClient::new(&env, &contract_id);

    client.init();
    client.init();
    assert_eq!(client.get_results(), (0, 0));
}

#[test]
fn vote_with_registry_updates_both_contracts() {
    let env = Env::default();
    env.mock_all_auths();

    let registry_id = env.register(PollRegistry, ());
    let poll_id = env.register(LivePoll, ());
    let registry_client = PollRegistryClient::new(&env, &registry_id);
    let poll_client = LivePollClient::new(&env, &poll_id);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);

    registry_client.init(&admin);
    registry_client.register_poll(
        &admin,
        &poll_id,
        &String::from_str(&env, "Cross-contract poll"),
    );

    poll_client.init();
    poll_client.configure(&admin, &registry_id);

    poll_client.vote(&voter, &Symbol::new(&env, "yes"));
    assert_eq!(poll_client.get_results(), (1, 0));

    let info = registry_client.get_poll(&poll_id);
    assert_eq!(info.total_votes, 1);
    assert!(info.active);
}

#[test]
#[should_panic(expected = "poll is closed")]
fn vote_rejected_when_registry_closes_poll() {
    let env = Env::default();
    env.mock_all_auths();

    let registry_id = env.register(PollRegistry, ());
    let poll_id = env.register(LivePoll, ());
    let registry_client = PollRegistryClient::new(&env, &registry_id);
    let poll_client = LivePollClient::new(&env, &poll_id);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);

    registry_client.init(&admin);
    registry_client.register_poll(
        &admin,
        &poll_id,
        &String::from_str(&env, "Closed poll test"),
    );

    poll_client.init();
    poll_client.configure(&admin, &registry_id);
    registry_client.close_poll(&admin, &poll_id);

    poll_client.vote(&voter, &Symbol::new(&env, "yes"));
}
