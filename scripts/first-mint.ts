import { ethers } from "hardhat";
import * as fs from "fs";
import ipfsClient from "ipfs-http-client";
import { IPFSHTTPClient } from "ipfs-http-client";
import Pinata, { PinataPinByHashPinOptions } from '@pinata/sdk';

import * as dotenv from "dotenv";

dotenv.config();

const params = {
  ASSET_DIR: `nft_metadata/asset`,
  METADATA_DIR: `nft_metadata/metadata`,
  CONTRACT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  prompt: [
    "the woman is standing in the Tokyo filled with building forest, trending on pixiv",
    "A woman wearing a fedora with a pink rose ribbon"
  ],
}

const {
  POLYGON_RPC_URL,
  PRIVATE_KEY,
  INFURA_PROJECT_ID,
  INFURA_SECRET_KEY,
  PINATA_API_KEY,
  PINATA_SECRET_KEY
} = process.env;

async function uploadAssetsAndMetadata(ipfs: IPFSHTTPClient, pinata: Pinata, prompt: string[]) {
  
  // Pre-conditions
  const assetDir = params.ASSET_DIR;
  const assetFiles: string[] = await fs.promises.readdir(assetDir);
  const metadataDir = params.METADATA_DIR;
  const metadataFiles: string[] = await fs.promises.readdir(metadataDir);
  const tokenIds: string[] = [];

  if(assetFiles.length !== metadataFiles.length || assetFiles.length === 0) {
    throw new Error("The number of asset and metadata are not matched.");
  }
    
  // Upload the assets to IPFS via Pinata
  const assetPromises = assetFiles.map(async (fileName) => {
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
    await pinata.pinByHash(assetCID.path, pinataOptions);
  
    return assetCID.path;
  });
  const assetCIDs = await Promise.all(assetPromises);

  // Update the metadata files with the asset CIDs
  const metadataPromises = metadataFiles.map(async (fileName, index) => {
    const assetCID = assetCIDs[index];
    const metadataPath = `${metadataDir}/${fileName}`;
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

console.log(`Token IDs: ${tokenIds}`);
console.log(`Asset CIDs: ${assetCIDs}`);
console.log(`Metadata CIDs: ${metadataCIDs}`);
return [tokenIds, assetCIDs, metadataCIDs];

}

async function main() {

  // Connect to Polygon network and its contract
  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
  // const provider = new ethers.providers.JsonRpcProvider();
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
  const [tokenIds, _, metadataCIDs] = await uploadAssetsAndMetadata(ipfs, pinata, params.prompt);

  // Call the contract function to store the generative AI result
  for (const [index, tokenId] of tokenIds.entries()) {
    const cid = metadataCIDs[index];

    //mint
    const mint_tx = await contract.connect(signer).mint(signer.getAddress(), tokenId);
    
    //setTokenURI
    const setTokenURI_tx = await contract.setTokenURI(tokenId, "ipfs://"+cid);
    await mint_tx.wait(1);
    await setTokenURI_tx.wait(1);
    console.log(`TokenID #${tokenId} mint tx        :`, mint_tx.hash);
    console.log(`TokenID #${tokenId} setTokenURI tx : `, setTokenURI_tx.hash);
  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
