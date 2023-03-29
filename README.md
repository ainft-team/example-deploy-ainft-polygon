# Example Deploy Ainft Polygon

*This README is written by chatGPT and revised by human being.*

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

AIN_PRIVATE_KEY=
```

You can obtain the necessary information by following the instructions provided by Infura, IPFS, and Pinata. When using Infura, you must initialize IPFS project first.

*If you feel hard to make AIN account, use this as private key for testing: 4376186267ffc7c8472fa9992a67a4c98db50888e15ed187d53602763e70bbfb. You only use this key for testing, not for commercial use.*

## Deployment
To deploy the ERC721 contract on the Polygon testnet, run the following command:

```
# for mumbai testnet
npx hardhat run scripts/deploy-contract.ts --network polygon
# for local
npx hardhat run scripts/deploy-contract.ts --network hardhat
```
This will deploy the contract to the Polygon testnet using the specified configuration.

## Usages of Scripts

You can try the mint & update scheme of making generative AINFT by following 3 steps:

1. npx hardhat run scripts/deploy-contract.ts --network <NETWORK_NAME>
2. npx hardhat run scripts/first-mint.ts --network <NETWORK_NAME>
3. npx hardhat run scripts/update-nft.ts --network <NETWORK_NAME>

**Step 1. Deploy the ERC721 contract on polygon network**
You can experience AINFT by using sample contract(GenerativeAINFT.sol). Execute on shell:

```
npx hardhat run scripts/deploy-contract.ts --network <NETWORK_NAME>
```
Then, you can get a contract address - <CONTRACT_ADDRESS>.

**Step 2. Mint the generative AI NFT from generated contract**
In scripts/first-mint.ts, you should change the values inside `params`, especially contract address.
Then, execute on shell:
```
npx hardhat run scripts/first-mint.ts --network <NETWORK_NAME>
```
You can get `metadataCIDs`.

**Step 3. Update the metadata and change the appearance**
In scripts/updated-asset.ts, you can update the metadata with newly generated images.
You also change the values in `params` inside script same as Step 2.
```
npx hardhat run scripts/update-nft.ts --network <NETWORK_NAME>
```

The metadata is updated and the changes are all logged to AIN network!