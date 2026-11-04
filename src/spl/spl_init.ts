import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

//import your wallet
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const mint = await generateKeyPairSigner();
    const mintSize = getMintSize();
    const rentLamports = await rpc
      .getMinimumBalanceForRentExemption(BigInt(mintSize))
      .send();

    const createMintAccountInstruction = getCreateAccountInstruction({
      payer: signer,
      newAccount: mint,
      lamports: rentLamports,
      space: mintSize,
      programAddress: TOKEN_PROGRAM_ADDRESS,
    });

    const initializeMintInstruction = getInitializeMintInstruction({
      mint: mint.address,
      decimals: 6,
      mintAuthority: signer.address,
      freezeAuthority: null,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const transactionMessage = appendTransactionMessageInstructions(
      [createMintAccountInstruction, initializeMintInstruction],
      setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        setTransactionMessageFeePayerSigner(
          signer,
          createTransactionMessage({ version: 0 }),
        ),
      ),
    );

    const signedTransaction =
      await signTransactionMessageWithSigners(transactionMessage);
    assertIsTransactionWithBlockhashLifetime(signedTransaction);

    const signature = getSignatureFromTransaction(signedTransaction);
    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });
    await sendAndConfirm(signedTransaction, { commitment: "confirmed" });

    console.log(`Mint address: ${mint.address}`);
    console.log(`Mint transaction signature: ${signature}`);
  } catch (error) {
    console.error("Failed to create SPL mint:", error);
  }
})();
