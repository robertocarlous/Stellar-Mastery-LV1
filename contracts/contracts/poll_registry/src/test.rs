#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn init_and_register_poll() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PollRegistry, ());
    let client = PollRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let poll = Address::generate(&env);

    client.init(&admin);
    client.register_poll(
        &admin,
        &poll,
        &String::from_str(&env, "Should Stellar be your go-to chain?"),
    );

    let info = client.get_poll(&poll);
    assert!(info.active);
    assert_eq!(info.total_votes, 0);
    assert_eq!(
        info.question,
        String::from_str(&env, "Should Stellar be your go-to chain?")
    );
}

#[test]
fn notify_vote_increments_total() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PollRegistry, ());
    let client = PollRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let poll = Address::generate(&env);

    client.init(&admin);
    client.register_poll(
        &admin,
        &poll,
        &String::from_str(&env, "Test poll"),
    );

    client.notify_vote(&poll);
    client.notify_vote(&poll);

    let info = client.get_poll(&poll);
    assert_eq!(info.total_votes, 2);
}

#[test]
#[should_panic(expected = "poll is closed")]
fn closed_poll_rejects_notify_vote() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PollRegistry, ());
    let client = PollRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let poll = Address::generate(&env);

    client.init(&admin);
    client.register_poll(
        &admin,
        &poll,
        &String::from_str(&env, "Test poll"),
    );
    client.close_poll(&admin, &poll);

    client.notify_vote(&poll);
}
