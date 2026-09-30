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

fn new_svm() -> LiteSVM {
    let program_id = ip_registry::id();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/ip_registry.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = FIXED_TIMESTAMP;
    svm.set_sysvar(&clock);
    svm
}

fn send(svm: &mut LiteSVM, signer: &Keypair, ix: Instruction) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}", e))
}

fn ip_record_address(content_seed: u8) -> Pubkey {
    let content_hash = [content_seed; 32];
    Pubkey::find_program_address(
        &[
            ip_registry::constants::IP_RECORD_SEED,
            content_hash.as_ref(),
        ],
        &ip_registry::id(),
    )
    .0
}

fn license_address(ip_record: &Pubkey, licensee: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            ip_registry::constants::LICENSE_SEED,
            ip_record.as_ref(),
            licensee.as_ref(),
        ],
        &ip_registry::id(),
    )
    .0
}

fn exclusive_license_address(ip_record: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            ip_registry::constants::EXCLUSIVE_LICENSE_SEED,
            ip_record.as_ref(),
        ],
        &ip_registry::id(),
    )
    .0
}

fn sale_address(ip_record: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[ip_registry::constants::SALE_SEED, ip_record.as_ref()],
        &ip_registry::id(),
    )
    .0
}

fn fund(svm: &mut LiteSVM, pubkey: &Pubkey) {
    svm.airdrop(pubkey, 1_000_000_000).unwrap();
}

fn register_ip_ix(payer: Pubkey, ip_record: Pubkey, content_seed: u8) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::RegisterIp {
            params: ip_registry::state::RegisterIpParams {
                asset_type: ip_registry::state::AssetType::Copyright,
                title: "Asset".to_string(),
                content_hash: [content_seed; 32],
                uri: "ipfs://asset".to_string(),
            },
        }
        .data(),
        ip_registry::accounts::RegisterIp {
            payer,
            ip_record,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn register_ip(svm: &mut LiteSVM, owner: &Keypair, content_seed: u8) -> Pubkey {
    let ip_record = ip_record_address(content_seed);
    let ix = register_ip_ix(owner.pubkey(), ip_record, content_seed);
    send(svm, owner, ix).unwrap();
    ip_record
}

fn issue_non_exclusive_ix(
    payer: Pubkey,
    ip_record: Pubkey,
    license: Pubkey,
    licensee: Pubkey,
    royalty_bps: u16,
    expires_at: i64,
) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::IssueNonExclusiveLicense {
            params: ip_registry::state::IssueLicenseParams {
                licensee,
                royalty_bps,
                expires_at,
            },
        }
        .data(),
        ip_registry::accounts::IssueNonExclusiveLicense {
            payer,
            ip_record,
            license,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn issue_exclusive_ix(
    payer: Pubkey,
    ip_record: Pubkey,
    license: Pubkey,
    licensee: Pubkey,
    royalty_bps: u16,
    expires_at: i64,
) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::IssueExclusiveLicense {
            params: ip_registry::state::IssueLicenseParams {
                licensee,
                royalty_bps,
                expires_at,
            },
        }
        .data(),
        ip_registry::accounts::IssueExclusiveLicense {
            payer,
            ip_record,
            license,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn list_for_sale_ix(payer: Pubkey, ip_record: Pubkey, sale: Pubkey, price: u64) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::ListForSale {
            params: ip_registry::state::ListForSaleParams {
                price_lamports: price,
            },
        }
        .data(),
        ip_registry::accounts::ListForSale {
            payer,
            ip_record,
            sale_listing: sale,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn cancel_sale_ix(seller: Pubkey, sale: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::CancelSale {}.data(),
        ip_registry::accounts::CancelSale {
            seller,
            sale_listing: sale,
        }
        .to_account_metas(None),
    )
}

fn buy_ip_ix(buyer: Pubkey, ip_record: Pubkey, sale: Pubkey, seller: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        ip_registry::id(),
        &ip_registry::instruction::BuyIp {}.data(),
        ip_registry::accounts::BuyIp {
            buyer,
            ip_record,
            sale_listing: sale,
            seller,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn read_license(svm: &LiteSVM, address: &Pubkey) -> ip_registry::state::LicenseRecord {
    let account = svm.get_account(address).unwrap();
    let mut data: &[u8] = &account.data;
    ip_registry::state::LicenseRecord::try_deserialize(&mut data).unwrap()
}

fn read_listing(svm: &LiteSVM, address: &Pubkey) -> ip_registry::state::SaleListing {
    let account = svm.get_account(address).unwrap();
    let mut data: &[u8] = &account.data;
    ip_registry::state::SaleListing::try_deserialize(&mut data).unwrap()
}

fn read_ip_record(svm: &LiteSVM, address: &Pubkey) -> ip_registry::state::IpRecord {
    let account = svm.get_account(address).unwrap();
    let mut data: &[u8] = &account.data;
    ip_registry::state::IpRecord::try_deserialize(&mut data).unwrap()
}

#[test]
fn test_issue_non_exclusive_license() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    let licensee = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 1);
    let license = license_address(&ip_record, &licensee.pubkey());

    let ix = issue_non_exclusive_ix(
        owner.pubkey(),
        ip_record,
        license,
        licensee.pubkey(),
        500,
        0,
    );
    assert!(send(&mut svm, &owner, ix).is_ok());

    let state = read_license(&svm, &license);
    assert_eq!(state.ip_record, ip_record);
    assert_eq!(state.issuer, owner.pubkey());
    assert_eq!(state.licensee, licensee.pubkey());
    assert_eq!(
        state.license_type,
        ip_registry::state::LicenseType::NonExclusive
    );
    assert_eq!(state.royalty_bps, 500);
    assert_eq!(state.expires_at, 0);
    assert_eq!(state.issued_at, FIXED_TIMESTAMP);
}

#[test]
fn test_duplicate_non_exclusive_license_rejected() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    let licensee = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 2);
    let license = license_address(&ip_record, &licensee.pubkey());

    assert!(send(
        &mut svm,
        &owner,
        issue_non_exclusive_ix(
            owner.pubkey(),
            ip_record,
            license,
            licensee.pubkey(),
            100,
            0
        )
    )
    .is_ok());
    assert!(send(
        &mut svm,
        &owner,
        issue_non_exclusive_ix(
            owner.pubkey(),
            ip_record,
            license,
            licensee.pubkey(),
            200,
            0
        )
    )
    .is_err());
}

#[test]
fn test_exclusive_license_is_unique_per_ip() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    let licensee_a = Keypair::new();
    let licensee_b = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 3);
    let exclusive = exclusive_license_address(&ip_record);

    assert!(send(
        &mut svm,
        &owner,
        issue_exclusive_ix(
            owner.pubkey(),
            ip_record,
            exclusive,
            licensee_a.pubkey(),
            1000,
            0
        )
    )
    .is_ok());

    let state = read_license(&svm, &exclusive);
    assert_eq!(state.licensee, licensee_a.pubkey());
    assert_eq!(
        state.license_type,
        ip_registry::state::LicenseType::Exclusive
    );

    assert!(send(
        &mut svm,
        &owner,
        issue_exclusive_ix(
            owner.pubkey(),
            ip_record,
            exclusive,
            licensee_b.pubkey(),
            1000,
            0
        )
    )
    .is_err());

    let non_exclusive = license_address(&ip_record, &licensee_b.pubkey());
    assert!(send(
        &mut svm,
        &owner,
        issue_non_exclusive_ix(
            owner.pubkey(),
            ip_record,
            non_exclusive,
            licensee_b.pubkey(),
            100,
            0
        )
    )
    .is_ok());
}

#[test]
fn test_issue_license_requires_ip_owner() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    let attacker = Keypair::new();
    let licensee = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    fund(&mut svm, &attacker.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 4);
    let license = license_address(&ip_record, &licensee.pubkey());

    assert!(send(
        &mut svm,
        &attacker,
        issue_non_exclusive_ix(
            attacker.pubkey(),
            ip_record,
            license,
            licensee.pubkey(),
            100,
            0
        )
    )
    .is_err());
    assert!(svm.get_account(&license).is_none());
}

#[test]
fn test_issue_license_rejects_high_royalty() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    let licensee = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 5);
    let license = license_address(&ip_record, &licensee.pubkey());

    assert!(send(
        &mut svm,
        &owner,
        issue_non_exclusive_ix(
            owner.pubkey(),
            ip_record,
            license,
            licensee.pubkey(),
            10_001,
            0
        )
    )
    .is_err());
    assert!(svm.get_account(&license).is_none());
}

#[test]
fn test_list_for_sale_and_reject_double_listing() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 6);
    let sale = sale_address(&ip_record);

    assert!(send(
        &mut svm,
        &owner,
        list_for_sale_ix(owner.pubkey(), ip_record, sale, 1_000_000)
    )
    .is_ok());

    let listing = read_listing(&svm, &sale);
    assert_eq!(listing.ip_record, ip_record);
    assert_eq!(listing.seller, owner.pubkey());
    assert_eq!(listing.price_lamports, 1_000_000);
    assert_eq!(listing.status, ip_registry::state::SaleStatus::Open);
    assert_eq!(listing.buyer, Pubkey::default());

    assert!(send(
        &mut svm,
        &owner,
        list_for_sale_ix(owner.pubkey(), ip_record, sale, 2_000_000)
    )
    .is_err());
}

#[test]
fn test_cancel_sale_and_relist() {
    let mut svm = new_svm();
    let owner = Keypair::new();
    fund(&mut svm, &owner.pubkey());
    let ip_record = register_ip(&mut svm, &owner, 7);
    let sale = sale_address(&ip_record);

    assert!(send(
        &mut svm,
        &owner,
        list_for_sale_ix(owner.pubkey(), ip_record, sale, 1_000_000)
    )
    .is_ok());
    assert!(send(&mut svm, &owner, cancel_sale_ix(owner.pubkey(), sale)).is_ok());

    let listing = read_listing(&svm, &sale);
    assert_eq!(listing.status, ip_registry::state::SaleStatus::Cancelled);

    assert!(send(
        &mut svm,
        &owner,
        list_for_sale_ix(owner.pubkey(), ip_record, sale, 2_000_000)
    )
    .is_ok());
    let listing = read_listing(&svm, &sale);
    assert_eq!(listing.status, ip_registry::state::SaleStatus::Open);
    assert_eq!(listing.price_lamports, 2_000_000);
    assert_eq!(listing.buyer, Pubkey::default());
}

#[test]
fn test_buy_ip_transfers_ownership_and_funds() {
    let mut svm = new_svm();
    let seller = Keypair::new();
    let buyer = Keypair::new();
    fund(&mut svm, &seller.pubkey());
    fund(&mut svm, &buyer.pubkey());
    let ip_record = register_ip(&mut svm, &seller, 8);
    let sale = sale_address(&ip_record);
    let price: u64 = 1_000_000;

    assert!(send(
        &mut svm,
        &seller,
        list_for_sale_ix(seller.pubkey(), ip_record, sale, price)
    )
    .is_ok());

    let seller_before = svm.get_account(&seller.pubkey()).unwrap().lamports;
    assert!(send(
        &mut svm,
        &buyer,
        buy_ip_ix(buyer.pubkey(), ip_record, sale, seller.pubkey())
    )
    .is_ok());
    let seller_after = svm.get_account(&seller.pubkey()).unwrap().lamports;
    assert_eq!(seller_after - seller_before, price);

    let record = read_ip_record(&svm, &ip_record);
    assert_eq!(record.owner, buyer.pubkey());

    let listing = read_listing(&svm, &sale);
    assert_eq!(listing.status, ip_registry::state::SaleStatus::Completed);
    assert_eq!(listing.buyer, buyer.pubkey());

    assert!(send(
        &mut svm,
        &buyer,
        buy_ip_ix(buyer.pubkey(), ip_record, sale, seller.pubkey())
    )
    .is_err());
}

#[test]
fn test_buy_cancelled_listing_rejected() {
    let mut svm = new_svm();
    let seller = Keypair::new();
    let buyer = Keypair::new();
    fund(&mut svm, &seller.pubkey());
    fund(&mut svm, &buyer.pubkey());
    let ip_record = register_ip(&mut svm, &seller, 9);
    let sale = sale_address(&ip_record);

    assert!(send(
        &mut svm,
        &seller,
        list_for_sale_ix(seller.pubkey(), ip_record, sale, 1_000)
    )
    .is_ok());
    assert!(send(&mut svm, &seller, cancel_sale_ix(seller.pubkey(), sale)).is_ok());
    assert!(send(
        &mut svm,
        &buyer,
        buy_ip_ix(buyer.pubkey(), ip_record, sale, seller.pubkey())
    )
    .is_err());

    let record = read_ip_record(&svm, &ip_record);
    assert_eq!(record.owner, seller.pubkey());
}

#[test]
fn test_self_purchase_rejected() {
    let mut svm = new_svm();
    let seller = Keypair::new();
    fund(&mut svm, &seller.pubkey());
    let ip_record = register_ip(&mut svm, &seller, 10);
    let sale = sale_address(&ip_record);

    assert!(send(
        &mut svm,
        &seller,
        list_for_sale_ix(seller.pubkey(), ip_record, sale, 1_000)
    )
    .is_ok());
    assert!(send(
        &mut svm,
        &seller,
        buy_ip_ix(seller.pubkey(), ip_record, sale, seller.pubkey())
    )
    .is_err());
}
