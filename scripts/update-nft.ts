import { ethers } from "hardhat";
import * as fs from "fs";
import ipfsClient, {IPFSHTTPClient} from "ipfs-http-client";
import Pinata, { PinataPinByHashPinOptions } from '@pinata/sdk';

import Ain from "@ainblockchain/ain-js";
const ain = new Ain("https://testnet-api.ainetwork.ai", 0);

import * as dotenv from "dotenv";
import { Signer } from "ethers";

dotenv.config();

interface Attribute {
  trait_type: string;
  value: string;
}

const params = {
  ASSET_DIR: `nft_metadata/updated_asset`,
  METADATA_DIR: `nft_metadata/metadata`,
  CONTRACT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  prompt: [
    "Inside the shrine where the cherry blossoms are scattered",
    "A woman wearing a gorgeous royal golden crown"
  ],
  OLD_METADATA: [
    "ipfs://QmVkmWwjHSXRL2rV4j48VYgFbm5fS3YwJ9zZS5CedMbkKe",
    "ipfs://Qmbt6epQdw1GFwfuiWuWPucxNM3fBqDUyAPwMUZfAF6Vai"
  ] // put the metadata cid with prefix "ipfs://" returned by executing first-mint.ts 
}

const {
  POLYGON_RPC_URL,
  PRIVATE_KEY,
  INFURA_PROJECT_ID,
  INFURA_SECRET_KEY,
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  AIN_PRIVATE_KEY
} = process.env;

async function updateAssets(ipfs: IPFSHTTPClient, pinata: Pinata) {
    // Pre-conditions
    const assetDir = params.ASSET_DIR;
    const assetFiles: string[] = await fs.promises.readdir(assetDir);
    const tokenIds: string[] = [];
  
    if(assetFiles.length === 0) {
      throw new Error("The asset file does not exist.");
    }
      
    // Upload the assets to IPFS via Pinata
    const assetPromises = assetFiles.map(async (fileName) => {
      const tokenId = fileName.split(".")[0];
      const filePath = `${assetDir}/${fileName}`;
      const fileContent = await fs.promises.readFile(filePath);
      const assetCID = await ipfs.add(fileContent);
      
      // Pin the asset to Pinata
      const pinataOptions: PinataPinByHashPinOptions = {
        pinataMetadata: {
          name: fileName
        },
        pinataOptions: {
          cidVersion: 1
        }
      };
      tokenIds.push(tokenId);
      await pinata.pinByHash(assetCID.path, pinataOptions);
    
      return assetCID.path;
    });
    const assetCIDs = await Promise.all(assetPromises);

    return [tokenIds, assetCIDs];
  
  }

async function updateMetadata(ipfs: IPFSHTTPClient, pinata: Pinata, assetCIDs: string[], ainTxs: string[]) {
  
  // Pre-conditions
  const assetDir = params.ASSET_DIR;
  const metadataDir = params.METADATA_DIR;
  const metadataFiles: string[] = await fs.promises.readdir(metadataDir);
  const tokenIds: string[] = [];

  if(metadataFiles.length === 0) {
    throw new Error("The metadata does not exist.");
  }
    

  // Update the metadata files with the asset CIDs
  const metadataPromises = metadataFiles.map(async (fileName, index) => {
    const assetCID = assetCIDs[index];
    const metadataPath = `${metadataDir}/${fileName}`;
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    
    // Update the images value with the asset CID
    metadata.image = 'ipfs://'+assetCID;
    metadata.namespaces.ainetwork.ain_tx = ainTxs[index];
    metadata.namespaces.ainetwork.prompt = params.prompt[index];
    metadata.namespaces.ainetwork.old_metadata = params.OLD_METADATA[index];
    metadata.namespaces.ainetwork.updated_at = new Date().getTime().toString();


    const updatedMetadataContent = JSON.stringify(metadata, null, 2);
    await fs.promises.writeFile(metadataPath, updatedMetadataContent);
  });

  await Promise.all(metadataPromises);

  // Upload the metadata to IPFS and Pinata
  const updatedMetadataFiles = await fs.promises.readdir(metadataDir);
  const updatedMetadataPromises = updatedMetadataFiles.map(async (fileName) => {
    const tokenId = fileName.split(".")[0];
    const filePath = `${metadataDir}/${fileName}`;
    const fileContent = await fs.promises.readFile(filePath);
    const metadataCID = await ipfs.add(fileContent);
    
    // Upload the metadata to Pinata
    const pinataOptions: PinataPinByHashPinOptions = {
      pinataMetadata: {
        name: fileName
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    await pinata.pinByHash(metadataCID.path, pinataOptions);
    tokenIds.push(tokenId);
    return metadataCID.path;
});

const metadataCIDs = await Promise.all(updatedMetadataPromises);

// console.log(`Token IDs: ${tokenIds}`);
// console.log(`Metadata CIDs: ${metadataCIDs}`);
return [tokenIds, metadataCIDs];

}

// send SET_VALUE transaction in AI Network testnet
const ainSetValue = async (prompt: string, tokenId: number, signer: Signer) => {
  const appPath="temp_ainft_polygon";
  const model="sd_inpainting_v1";
//   const appPath="ainftize_trigger_app";
//   const model="sd_inpainting";
  const uid = ain.wallet.addAndSetDefaultAccount(AIN_PRIVATE_KEY!); // AIN WALLET ACCOUNT
  
  const oldMetadataContents = await fs.promises.readFile(`${params.METADATA_DIR}/${tokenId}.json`, 'utf-8');
  const oldMetadata = JSON.parse(oldMetadataContents);
  const oldMeatadataAttr: Attribute[] = oldMetadata.attributes;
  const oldAttributes:{[index: string]: Attribute} = {};
  oldMeatadataAttr.forEach((attr, index) => {
    oldAttributes[index.toString()] = attr;
  })

  for (const [index, elem] of oldMetadata.attributes.entries()) {
    const indexToStr = index.toString();
    oldAttributes[indexToStr] = elem;
  }
  const updatedTime = new Date().getTime();


  const message = {
      "params": { 
         "service_name": "AINFTize-parts-generation",
         "task_id": "<TASK_ID>",
         "model": "sd_inpainting_v1",
         "prompt": prompt,
         "tempImageUrl": "<temporary GOOGLE_STORAGE_URL that generative AI model has made>",
         "old_attributes": oldAttributes,
         "old_description": oldMetadata.description, 
         "old_image": oldMetadata.image, 
         "old_name": oldMetadata.name
       },
      "contract": { // related to the NFT contract & its metadata
          "network": "mumbai", // polygon mumbai testnet (polygon mainnet: polygon)
          "chain_id": 80001, // polygon mumbai testnet (polygon mainnet: 137)
          "account": params.CONTRACT_ADDRESS,
          "token_id": tokenId,
          "old_metadata" : params.OLD_METADATA[tokenId],
      },
      "updated_at": updatedTime,
      "sender": await signer.getAddress()
  }

  const userMessagePath = `/apps/${appPath}/${model}/${uid}/${tokenId}/${updatedTime}/input`;
  const res = await ain.db.ref(`${userMessagePath}`).setValue({
    value: message,
    nonce: -1,
    gas_price: 500
  });

  console.log(res);
  if (res) {
    console.log(`Set Value at Target Path Succeeded.\nCheck TX in https://testnet-insight.ainetwork.ai/transactions/${res.tx_hash}`);
  }
  return res.tx_hash;
};


async function main() {

  // Connect to Polygon network and its contract
//   const provider = new ethers.providers.JsonRpcProvider();
  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY!, provider);
  const address = params.CONTRACT_ADDRESS;
  const contract = await ethers.getContractAt("GenerativeAINFT", address, signer);


  // Upload the assets to IPFS via pinata
  const ipfs = ipfsClient.create({ 
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${INFURA_PROJECT_ID}:${INFURA_SECRET_KEY}`).toString('base64')
    }
  });
  const pinata = new Pinata(PINATA_API_KEY, PINATA_SECRET_KEY);
  // upload evolved images
  const [tokenIds, assetCIDs] = await updateAssets(ipfs, pinata);
  const ainTxs = [];
  for (const [index, tokenId] of tokenIds.entries()) {
    //SET_VALUE the transitions on AI Network
    const ainTx = await ainSetValue(params.prompt[index], parseInt(tokenId), signer);
    ainTxs.push(`https://testnet-insight.ainetwork.ai/transactions/${ainTx}`);
    console.log(ainTxs);
  }
  // pin newly updated metadata
  const [_, metadataCIDs] = await updateMetadata(ipfs, pinata, assetCIDs, ainTxs);

  // Call the contract function to store the generative AI result
  for (const [index, tokenId] of tokenIds.entries()) {
    if(index > 0) break;
    const cid = metadataCIDs[index];    
    //setTokenURI to newly updated metadata CID
    const setTokenURITx = await contract.setTokenURI(tokenId, "ipfs://"+cid);
    await setTokenURITx.wait(1);
    console.log(`TokenID #${tokenId} update tokenURI tx : https://mumbai.polygonscan.com/tx/${setTokenURITx.hash}`);
    

  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
