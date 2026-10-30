import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(
  irysUploader({
    address: "https://devnet.irys.xyz/",
  }),
);

umi.use(signerIdentity(signer));

(async () => {
  try {
    const image =
      "https://gateway.irys.xyz/9NcEenG6Ezy84oYQThqdkqSHs6RrYcfvh1Ku6apGa2Sp";
    const imageUrl = new URL(image);
    if (
      imageUrl.hostname !== "gateway.irys.xyz" ||
      imageUrl.pathname.split("/").filter(Boolean).length !== 1
    ) {
      throw new Error("Paste the single image URI printed by npm run nft:image.");
    }

    const metadata = {
      name: "SUS NATE",
      description: "A funny NFT created on Solana devnet.",
      image,
      attributes: [
        { trait_type: "Collection", value: "Turbine" },
        { trait_type: "Edition", value: "1" },
      ],
    };

    const myUri = await umi.uploader.uploadJson(metadata);
    console.log(`metadata uri: ${myUri}`);
  } catch (error) {
    console.error("Metadata upload failed:", error);
    process.exitCode = 1;
  }
})();
