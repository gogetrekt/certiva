import "dotenv/config";
import { configVariable, type HardhatUserConfig } from "hardhat/config";

import { POLYGON_AMOY_CHAIN_ID } from "./src/index.js";

const privateKey = process.env.PRIVATE_KEY?.trim();
const rpcUrl = process.env.POLYGON_AMOY_RPC_URL?.trim();

const config: HardhatUserConfig = {
  plugins: [
    (await import("@nomicfoundation/hardhat-ethers")).default,
    (await import("@nomicfoundation/hardhat-viem")).default,
    (await import("@nomicfoundation/hardhat-verify")).default,
  ],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: rpcUrl
    ? {
        amoy: {
          type: "http",
          chainType: "generic",
          chainId: POLYGON_AMOY_CHAIN_ID,
          url: rpcUrl,
          accounts: privateKey ? [privateKey] : [],
        },
      }
    : {},
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
};

export default config;
