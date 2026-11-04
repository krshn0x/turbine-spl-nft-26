import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2Args,
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";

//paste your mint address got from spl_init.ts
const mint = publicKey(" 255s4TXMgvK3FQoPbQ7iyxjyKKgoU3pmpbiGTHnC9Qv8");

const umi = createUmi("https://api.devnet.solana.com");

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

(async () => {
  try {
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint,
      mintAuthority: signer,
    };

    //change the metadata
    const data: DataV2Args = {
      name : "SUS NATE Token",
      symbol :"1",
      uri : "https://gateway.irys.xyz/9NcEenG6Ezy84oYQThqdkqSHs6RrYcfvh1Ku6apGa2Sp",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,

    }


    const args: CreateMetadataAccountV3InstructionArgs = {
      data ,
      isMutable : true,
      collectionDetails : null,

    }

    const tx = createMetadataAccountV3(umi, {
      ...accounts,
      ...args,
    });

    const result = await tx.sendAndConfirm(umi);
    console.log("signature: ", bs58.encode(Buffer.from(result.signature)));
  } catch (error) {
    console.log("error", error);
  }
})();


// SIgnature - 5Kcp22PH7hTuukE1GH3sY62hifraWXLJcFHigiECiKVoXorGsW3fWDDPiiruMLoM9xhTbLbYVBXfa7hUtJ4iz2Hh