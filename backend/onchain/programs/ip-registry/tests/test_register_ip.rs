use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{clock::Clock, instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const FIXED_TIMESTAMP: i64 = 1_700_000_000;

fn content_hash(seed: u8) -> [u8; 32] {
    [seed; 32]
}

#[test]
fn test_register_ip() {
    let program_id = ip_registry::id();
    let payer = Keypair::new();
    let content_hash = content_hash(7);
    let (ip_record, bump) = Pubkey::find_program_address(
        &[
            ip_registry::constants::IP_RECORD_SEED,
            content_hash.as_ref(),
        ],
        &program_id,
    );
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/ip_registry.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = FIXED_TIMESTAMP;
    svm.set_sysvar(&clock);

    let instruction = Instruction::new_with_bytes(
        program_id,
        &ip_registry::instruction::RegisterIp {
            params: ip_registry::state::RegisterIpParams {
                asset_type: ip_registry::state::AssetType::Patent,
                title: "Whitepaper v1".to_string(),
                content_hash,
                uri: "ipfs://bafy example".to_string(),
            },
        }
        .data(),
        ip_registry::accounts::RegisterIp {
            payer: payer.pubkey(),
            ip_record,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    let account = svm.get_account(&ip_record).unwrap();
    let mut data: &[u8] = &account.data;
    let state = ip_registry::state::IpRecord::try_deserialize(&mut data).unwrap();
    assert_eq!(state.owner, payer.pubkey());
    assert_eq!(state.asset_type, ip_registry::state::AssetType::Patent);
    assert_eq!(state.content_hash, content_hash);
    assert_eq!(state.title, "Whitepaper v1");
    assert_eq!(state.uri, "ipfs://bafy example");
    assert_eq!(state.registered_at, FIXED_TIMESTAMP);
    assert_eq!(state.bump, bump);
}

#[test]
fn test_register_ip_rejects_zero_content_hash() {
    let program_id = ip_registry::id();
    let payer = Keypair::new();
    let content_hash = [0u8; 32];
    let (ip_record, _bump) = Pubkey::find_program_address(
        &[
            ip_registry::constants::IP_RECORD_SEED,
            content_hash.as_ref(),
        ],
        &program_id,
    );
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/ip_registry.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &ip_registry::instruction::RegisterIp {
            params: ip_registry::state::RegisterIpParams {
                asset_type: ip_registry::state::AssetType::Patent,
                title: "Whitepaper v1".to_string(),
                content_hash,
                uri: "ipfs://bafy example".to_string(),
            },
        }
        .data(),
        ip_registry::accounts::RegisterIp {
            payer: payer.pubkey(),
            ip_record,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_err());
    assert!(svm.get_account(&ip_record).is_none());
}
