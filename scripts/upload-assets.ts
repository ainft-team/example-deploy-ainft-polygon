import { ethers } from "hardhat";
import * as fs from "fs";
import { GenerativeAINFT } from "../typechain-types";
import ipfsClient from "ipfs-http-client";
import { IPFSHTTPClient } from "ipfs-http-client";
import IpfsDeployer from "ipfs-deploy";
import Ain from "@ainblockchain/ain-js";
import Pinata from '@pinata/sdk';

import * as dotenv from "dotenv";

dotenv.config();
const ain = new Ain("https://testnet-api.ainetwork.ai", 0);

const params = {
  ASSET_DIR: `nft_metadata/asset`,
  METADATA_DIR: `nft_metadata/metadata`,
  CONTRACT_ADDRESS: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
}

async function uploadAssetsAndMetadata(ipfs: IPFSHTTPClient, pinata: Pinata, prompt: string[]) {
  // Upload the asset and metadata files to IPFS
  const assetDir = params.ASSET_DIR;
  const assetFiles = await fs.promises.readdir(assetDir);
  const numbers = assetFiles.length;
  const metadataDir = params.METADATA_DIR;
    
  // Upload the assets to IPFS and Pinata
  const assetPromises = assetFiles.map(async (fileName) => {
    const filePath = `${assetDir}/${fileName}`;
    const fileContent = await fs.promises.readFile(filePath);
    const assetCID = await ipfs.add(fileContent);
    
    // Upload the asset to Pinata
    const pinataOptions = {
      pinataMetadata: {
        name: fileName
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    await pinata.pinByHash(assetCID.path, pinataOptions);
  
    return assetCID.path;
  });
  const assetCIDs = await Promise.all(assetPromises);

// Update the metadata files with the asset CIDs
const metadataPromises = assetFiles.map(async (fileName, index) => {
  const assetCID = assetCIDs[index];
  const metadataPath = `${metadataDir}/${fileName.replace('.png', '.json')}`;
  const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metadataContent);
  
  // Update the images value with the asset CID
  metadata.image = 'ipfs://'+assetCID;
  metadata.namespaces.ainetwork.prompt = prompt[index];
  const updatedMetadataContent = JSON.stringify(metadata, null, 2);
  await fs.promises.writeFile(metadataPath, updatedMetadataContent);
});

await Promise.all(metadataPromises);

// Upload the metadata to IPFS and Pinata
const updatedMetadataFiles = await fs.promises.readdir(metadataDir);
const updatedMetadataPromises = updatedMetadataFiles.map(async (fileName) => {
  const filePath = `${metadataDir}/${fileName}`;
  const fileContent = await fs.promises.readFile(filePath);
  const metadataCID = await ipfs.add(fileContent);
  
  // Upload the metadata to Pinata
  const pinataOptions = {
    pinataMetadata: {
      name: fileName
    },
    pinataOptions: {
      cidVersion: 1
    }
  };
  await pinata.pinByHash(metadataCID.path, pinataOptions);
  
  return metadataCID.path;
});

const metadataCIDs = await Promise.all(updatedMetadataPromises);

console.log(`Asset CIDs: ${assetCIDs}`);
console.log(`Metadata CIDs: ${metadataCIDs}`);
return [assetCIDs, metadataCIDs]
}

// const ainSetValue = async (prompt, tokenId) => {
//   const uid = ain.wallet.addAndSetDefaultAccount(process.env.AIN_PRIVATE_KEY!);

//   const appPath="temp_ainft_polygon";
//   const model="Stable Diffusion Inpainting v1.0";
//   const message = {
//       "params": { 
//          "service_name": "AINFTize-parts-generation",
//          "task_id": "ajeifjlefef-3kfn-efiefj-ejfienfa",
//          "model": "Stable Diffusion Inpainting v1.0",
//          "prompt": "A howling wolf by Banksy, trending on artstation",
//          "tempImageUrl": "https://strorage.googleapis.com/snfij3fji..",
//          "old_attributes": {
//            "0" : { "trait_type": "Original attributes 1", "value": "Original values 1" },
//            "1" : { "trait_type": "Original attributes 2", "value": "Original values2 " }
//          },
//          "old_description": "Description", 
//          "old_image": "${ipfs://(Generated Image IPFS CID)}", 
//          "old_name": "${NFT Name}"
//        },
//       "contract": { // related to the NFT contract & its metadata
//           "network": "homestead", // ethereum mainnet
//           "chain_id": 42, 
//           "account": "0x1234....567", // NFT collection's contract address
//           "token_id": tokenId,
//           "old_metadata" : "null",
//       },
//       "updated_at": 1678866478968, // proxy server에서 전달
//       "sender": "0x4E4447767245eBBACdec885bC20CAB5add2eD3a3"
//   }

  
//   {
//     task_id: "359f6368-df09-5d72-a69d-15ba1c67f6f3",
//     prompt,
//     parts: "background",
//     seed: 42,
//     guidance_scale: 7.5,
//     origin: "https://www.ainetwork.ai/",
//     result: "https://testnet-insight.ainetwork.ai/",
//     updated_at: "1673510381814",
//     public_key: `313327d1d0fa2fa32319ecf3dc787c28d5757a44d95fddd67c686ed4aea404451a5a08dc2f1824a7fba2ffa3346b0c448b18b420812ae982eb6fd480f12cb378`,
//   };

//   const userMessagePath = `${appPath}/${model}/${uid}/${tokenId}/${Date.now()}/input`;
//   const res = await ain.db.ref(`${userMessagePath}`).setValue({
//     value: `${JSON.stringify(message)}`,
//     nonce: -1,
//   });

//   if (res) {
//     console.log(`Set Value at Target Path Succeeded.\nCheck TX in testnet-insight.ainetwork.ai: ${res.tx_hash}`);
//   }
// };


async function main() {

  // Connect to Polygon network and its contract
  const provider = new ethers.providers.JsonRpcProvider();
  // const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const address = params.CONTRACT_ADDRESS;
  const contract = await ethers.getContractAt("GenerativeAINFT", address, signer);


  // Define the generative AI prompt
  const prompt = [
    "the woman is standing in the Tokyo filled with building forest, trending on pixiv",
    "A woman wearing a gorgeous royal golden crown"
  ];
  const ipfs = ipfsClient.create({ 
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_SECRET_KEY}`).toString('base64')
    }
  });
  const pinata = new Pinata(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);
  // const [assetCIDs, metadataCIDs] = await uploadAssetsAndMetadata(ipfs, pinata, prompt);
  const [_, metadataCIDs] = await uploadAssetsAndMetadata(ipfs, pinata, prompt);

  // Call the contract function to store the generative AI result
  for (let i = 0; i < metadataCIDs.length; i++) {
    const cid = metadataCIDs[i];
    const mint_tx = await contract.connect(signer).mint(signer.getAddress(), i);
    const setTokenURI_tx = await contract.setTokenURI(i, cid);
    await mint_tx.wait(1);
    await setTokenURI_tx.wait(1);
    console.log(`TokenID #${i} mint tx        :`, mint_tx.hash);
    console.log(`TokenID #${i} setTokenURI tx : `, setTokenURI_tx.hash);
  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
