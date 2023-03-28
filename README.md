# Example Deploy Ainft Polygon

*This README is written by chatGPT.*

This repository contains the necessary code to deploy an ERC721 contract on the Polygon testnet and mint generative AI art as non-fungible tokens (NFTs). It also includes scripts to upload the art to IPFS using IPFS-http-client and pinata, and to change the NFT metadata URI.

## Installation
Before running the deployment and minting scripts, you will need to install the following dependencies:

- Node.js v14 or higher
- Hardhat
- IPFS-http-client
- Pinata SDK
You can install the dependencies using the following command:

```
yarn install
```

## Configuration
Before deploying the contract and minting the NFTs, you need to configure the deployment and minting scripts. You can refer the configuration template `env.template`.

In the configuration file, you need to provide the following information:

```
POLYGON_RPC_URL=
PRIVATE_KEY=

INFURA_PROJECT_ID=
INFURA_SECRET_KEY=

PINATA_API_KEY=
PINATA_SECRET_KEY=
```

You can obtain the necessary information by following the instructions provided by Infura, IPFS, and Pinata. When using Infura, you must initialize IPFS project first.

## Deployment
To deploy the ERC721 contract on the Polygon testnet, run the following command:

```
# for mumbai testnet
npx hardhat run scripts/deploy-contract.ts --network polygon
# for local
npx hardhat run scripts/deploy-contract.ts --network hardhat
```
This will deploy the contract to the Polygon testnet using the specified configuration.

## Upload Assets & Mint & Metadatas
To mint generative AI art as NFTs, you need to provide the image files and metadata files in the art directory. You can then run the following command to upload the art to IPFS and mint the NFTs:

```
# for mumbai testnet
npx hardhat run scripts/upload-assets.ts --network polygon
# for local
npx hardhat run scripts/upload-assets.ts --network hardhat
```
This will upload the art files to IPFS using IPFS-http-client and pinata, and then mint the NFTs using the deployed contract on the Polygon network.