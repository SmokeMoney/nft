export interface WalletConfig {
  address: string;
  autogasEnabled: boolean[];
  limits: string[];
  isModified: boolean;
  isExpanded: boolean;
  transactionHash: string | null;
}

export interface PositionData {
  chainId: string;
  amount: string;
}

export interface WalletBorrowPosition {
  walletAddress: string;
  borrowPositions: PositionData[];
}

export interface NFT {
  id: string;
  owner: boolean;
  wethDeposits: PositionData[];
  wstEthDeposits: PositionData[];
  borrowPositions: WalletBorrowPosition[];
  totalBorrowPosition: string;
  chainLimits: { [chainId: string]: string };
  nativeCredit: string;
}
