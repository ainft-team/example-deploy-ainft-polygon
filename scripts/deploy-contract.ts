import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

async function main() {

  // Connect to Polygon network
  const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  // const provider = new ethers.providers.JsonRpcProvider(); // localhost for test(hardhat local node)

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Get the contract factory and connect to the deployed contract
  const contractFactory = await ethers.getContractFactory("GenerativeAINFT", signer);
  const contract = await contractFactory.deploy("Generative AINFT", "GA");
  await contract.deployed();

  const contractAddress = contract.address; // ERC721 contract address
  console.log("ERC721 contract deployed on polygon: ", contractAddress); 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
