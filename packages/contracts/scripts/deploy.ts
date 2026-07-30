import "dotenv/config";

import { ethers } from "ethers";

import hre from "hardhat";

import artifact from "../artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json" with { type: "json" };

import { POLYGON_AMOY_EXPLORER_URL } from "../src/index.js";

type CredentialRegistryContract = ethers.Contract & {
  authorizeIssuer: (
    issuer: string
  ) => Promise<ethers.ContractTransactionResponse>;
  authorizeIssuerWithName: (
    issuer: string,
    issuerName: string,
  ) => Promise<ethers.ContractTransactionResponse>;
};

async function main() {
  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;

  if (!rpcUrl) {
    throw new Error("Missing POLYGON_AMOY_RPC_URL");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY");
  }

  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying with:", wallet.address);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet,
  );

  const contract =
    (await factory.deploy()) as CredentialRegistryContract;

  const deploymentTx = contract.deploymentTransaction();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentReceipt = deploymentTx
    ? await deploymentTx.wait()
    : null;

  const issuerAddress = process.env.ISSUER_WALLET?.trim() || wallet.address;
  const issuerName = process.env.ISSUER_NAME?.trim();

  const addIssuerTx = issuerName
    ? await contract.authorizeIssuerWithName(issuerAddress, issuerName)
    : await contract.authorizeIssuer(issuerAddress);

  const addIssuerReceipt = await addIssuerTx.wait();

  console.log("Contract Name: CredentialRegistry");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction Hash: ${deploymentTx?.hash ?? "unavailable"}`);
  console.log(`Block Number: ${deploymentReceipt?.blockNumber ?? "unavailable"}`);
  console.log("Network: Polygon Amoy");

  console.log(`Authorized issuer added: ${issuerAddress}`);
  console.log(`Issuer name: ${issuerName || "not configured"}`);
  console.log(`Issuer authorization tx: ${addIssuerReceipt?.hash ?? addIssuerTx.hash}`);

  console.log(
    `Explorer: ${POLYGON_AMOY_EXPLORER_URL}/address/${contractAddress}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
