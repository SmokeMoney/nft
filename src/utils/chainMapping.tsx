// src/utils/chains.ts
export interface Chain {
  id: number;
  legacyId: number;
  name: string;
  rpcUrl: string;
  lendingAddress: string;
  depositAddress: string;
  wethAddress: string;
  wstethAddress: string;
  explorer: string;
}
// src/utils/chains.ts

export const chains: Chain[] = [
  {
    id: 40231,
    legacyId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: import.meta.env.VITE_ARBSEPOLIA_RPC_URL!,
    lendingAddress: import.meta.env.VITE_ARB_LENDING_ADDRESS!,
    depositAddress: import.meta.env.VITE_ARB_DEPOSIT_ADDRESS!,
    wethAddress: import.meta.env.VITE_ARB_WETH_ADDRESS!,
    wstethAddress: import.meta.env.VITE_ARB_WSTETH_ADDRESS!,
    explorer: "https://sepolia.arbiscan.io/",
  },
  {
    id: 40161,
    legacyId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: import.meta.env.VITE_ETHSEPOLIA_RPC_URL!,
    lendingAddress: import.meta.env.VITE_ETH_LENDING_ADDRESS!,
    depositAddress: import.meta.env.VITE_ETH_DEPOSIT_ADDRESS!,
    wethAddress: import.meta.env.VITE_ETH_WETH_ADDRESS!,
    wstethAddress: import.meta.env.VITE_ETH_WSTETH_ADDRESS!,
    explorer: "https://sepolia.etherscan.io/",
  },
  {
    id: 40232,
    legacyId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: import.meta.env.VITE_OPTSEPOLIA_RPC_URL!,
    lendingAddress: import.meta.env.VITE_OPT_LENDING_ADDRESS!,
    depositAddress: import.meta.env.VITE_OPT_DEPOSIT_ADDRESS!,
    wethAddress: import.meta.env.VITE_OPT_WETH_ADDRESS!,
    wstethAddress: import.meta.env.VITE_OPT_WSTETH_ADDRESS!,
    explorer: "https://sepolia-optimism.etherscan.io/",
  },
  {
    id: 40245,
    legacyId: 84532,
    name: "Base Sepolia",
    rpcUrl: import.meta.env.VITE_BASSEPOLIA_RPC_URL!,
    lendingAddress: import.meta.env.VITE_BAS_LENDING_ADDRESS!,
    depositAddress: import.meta.env.VITE_BAS_DEPOSIT_ADDRESS!,
    wethAddress: import.meta.env.VITE_BAS_WETH_ADDRESS!,
    wstethAddress: import.meta.env.VITE_BAS_WSTETH_ADDRESS!,
    explorer: "https://sepolia.basescan.org/",
  },
  // {
  //   id: 40291,
  //   legacyId: 80084,
  //   name: "Berachain Bartio",
  //   rpcUrl: import.meta.env.VITE_BASSEPOLIA_RPC_URL!,
  //   lendingAddress: import.meta.env.VITE_BER_LENDING_ADDRESS!,
  //   depositAddress: import.meta.env.VITE_BER_DEPOSIT_ADDRESS!,
  //   wethAddress: import.meta.env.VITE_BER_WETH_ADDRESS!,
  //   wstethAddress: import.meta.env.VITE_BER_WSTETH_ADDRESS!,
  //   explorer: "https://bartio.beratrail.io/",
  // },
];

// ... (keep the existing functions)

export const chainIds = chains.map((chain) => chain.id);

export function getChainName(chainId: number): string | undefined {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.name;
}

export function getLegacyId(chainId: number): number | undefined {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.legacyId;
}

export function getLZId(chainId: number): number {
  const chain = chains.find((c) => c.legacyId === chainId);
  if (chain?.id) {
    return chain?.id
  }
  else {
    return 0
  }
}

export function getChainRPC(chainId: number): string | undefined {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.rpcUrl;
}

export function getChainLendingAddress(chainId: number): `0x${string}` {
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.lendingAddress) {
    return chain?.lendingAddress as `0x${string}`
  }
  else {
    throw Error('lendingAddress not found');
  }
}

export function getDepositAddress(chainId: number): `0x${string}` {
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.depositAddress) {
    return chain?.depositAddress as `0x${string}`
  }
  else {
    throw Error('deposit address not found');
  }
}

export function getWETHAddress(chainId: number): `0x${string}` {
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.wethAddress) {
    return chain?.wethAddress as `0x${string}`
  }
  else {
    throw Error("WETH Address not found");
  }
}

export function getWstETHAddress(chainId: number): `0x${string}` {
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.wstethAddress) {
    return chain?.wstethAddress as `0x${string}`
  }
  else {
    throw Error('wstETH Address not found');
  }
}

export function getChainExplorer(chainId: number): string {
  const chain = chains.find((c) => c.id === chainId);
  if (chain?.explorer) {
    return chain?.explorer
  }
  else {
    throw Error('wstETH Address not found');
  }
}

export function isValidChainId(chainId: number): boolean {
  return chains.some((chain) => chain.id === chainId);
}

export function getNftAddress(): string {
  if (import.meta.env.VITE_NFT_CONTRACT_ADDRESS !== undefined) {
    return import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
  } else {
    throw Error("NFT Address not found");
  }
}
