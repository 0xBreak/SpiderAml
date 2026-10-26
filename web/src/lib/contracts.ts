// SpiderSend deployment the /send page talks to. Source of truth: /deployments/421614.json (update both together).
import { parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const SEND_CHAIN = arbitrumSepolia;
export const SEND_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

export const REGISTRY = "0xB7E00e6f9bD10E50F17E12847a83E9dCaA0429E2" as const;
export const SPIDER_SEND = "0xAAd92220c7b1896efDcDc59D73552E7D97A34484" as const;
export const TOKEN = { address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const, symbol: "USDC", decimals: 6, faucet: "https://faucet.circle.com" };

export const registryAbi = parseAbi([
  "function checkTransfer(address from, address to) view returns (bool allowed, address worst, uint8 category, uint8 level)",
]);

export const sendAbi = parseAbi([
  "function send(address to, uint256 amount)",
  "error Blocked(address account, uint8 category, uint8 level)",
  "error ZeroAmount()",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
