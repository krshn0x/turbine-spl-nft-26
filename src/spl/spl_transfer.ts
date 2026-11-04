import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import wallet from "../../devnet-wallet.json";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

//paste your mint address got from spl_init.ts
const mint = address("255s4TXMgvK3FQoPbQ7iyxjyKKgoU3pmpbiGTHnC9Qv8");

//paste the address of the recipient
const to = address("9EUd4VNcjMAysd7zQk3Q1a4tb28BYndLNBAQDiYnHJ64");
const amount = 1_000_000n;
const decimals = 6;

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const [fromAta] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your fromAta is : ${fromAta}`);

    const [toAta] = await findAssociatedTokenPda({
      mint,
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log(`Your toAta is : ${toAta}`);

    const createAtaIx =
      await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: signer,
        ata: toAta,
        owner: to,
        mint,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      });

    const transferTx = getTransferCheckedInstruction({
      source: fromAta,
      mint,
      destination: toAta,
      authority: signer,
      amount,
      decimals,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer,
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, transferTx],
      msgWithLiftime,
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });
    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    console.log(`transfer txid: ${signature}`);
  } catch (error) {
    console.error("Failed to transfer tokens:", error);
  }
})();
// Your fromAta is : 46GXmQYwzquF8rJ3tjySUPuRQc7xiSRUFTxZP4sHxK4Y
// Your toAta is : BxWgoF9ZbAYeFxyhJMh8KMfKmbRdhh93iBCkZ7W8dShh
// transfer txid: 4k8GZvYoEoiS41U5ZxbSNXfZ2AXrN2Keae1vuJi3fVdSKCXyabJzu1qFM9M2CNcyDRrCDcNTDYhpdUuGEARjvsUv