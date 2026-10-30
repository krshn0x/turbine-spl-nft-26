import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

(async () => {
  try {
    const metadataUri =
      "https://gateway.irys.xyz/BWxu43qCF7asFLAXsjmnLLRFkCoLS7aTRKd8pZaVdtzV";
    const metadataUrl = new URL(metadataUri);
    if (
      metadataUrl.hostname !== "gateway.irys.xyz" ||
      metadataUrl.pathname.split("/").filter(Boolean).length !== 1
    ) {
      throw new Error("Paste the single metadata URI printed by npm run nft:metadata.");
    }

    const asset = generateSigner(umi);
    const builder = create(umi, {
      asset,
      name: "SUS NATE",
      uri: metadataUri,
    });
    const transaction = await builder.buildWithLatestBlockhash(umi);
    const [simulation, rent, feeQuote] = await Promise.all([
      umi.rpc.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        verifySignatures: false,
      }),
      builder.getRentCreatedOnChain(umi),
      umi.rpc.call<{ value: number | null }>("getFeeForMessage", [
        Buffer.from(transaction.serializedMessage).toString("base64"),
        { commitment: "confirmed" },
      ]),
    ]);

    if (simulation.err) {
      throw new Error(`Mint simulation failed: ${JSON.stringify(simulation.err)}`);
    }
    if (feeQuote.value === null) {
      throw new Error("RPC could not estimate the transaction fee.");
    }

    const estimatedFee = feeQuote.value / 1_000_000_000;
    const rentRequired = Number(rent.basisPoints) / 1_000_000_000;
    console.log("Mint simulation succeeded:");
    console.log(`cluster: ${umi.rpc.getCluster()}`);
    console.log(`fee payer: ${signer.publicKey}`);
    console.log(`new asset: ${asset.publicKey}`);
    console.log(`name: SUS NATE`);
    console.log(`metadata URI: ${metadataUri}`);
    console.log(`estimated network fee: ${estimatedFee} SOL`);
    console.log(`estimated account rent: ${rentRequired} SOL`);
    console.log(`estimated total: ${estimatedFee + rentRequired} SOL`);

    if (!process.argv.includes("--send")) {
      console.log("Not sent. Pass -- --send to submit after reviewing the estimate.");
      return;
    }

    const prompt = createInterface({ input: stdin, output: stdout });
    const approval = await prompt.question(
      "Type yes to submit this exact simulated transaction: ",
    );
    prompt.close();
    if (approval !== "yes") {
      console.log("Mint cancelled; no transaction was sent.");
      return;
    }

    const tx = await builder.sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    console.log(`signature ${signature}, asset: ${asset.publicKey}`);
  } catch (e) {
    console.error("NFT mint failed:", e);
    process.exitCode = 1;
  }
})();
