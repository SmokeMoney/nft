import React, { useState, useEffect } from "react";
import type { FormEvent } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain, useReadContract, useChainId, useWaitForTransactionReceipt, useWriteContract, type BaseError } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { optimismSepolia, sepolia } from 'wagmi/chains';
import './CrossChainLendingApp.css';
import contractAbi from "./abi/corenft.json";

const CONTRACT_ADDRESS = "0x2Cbe484B1E2fe4ffA28Fef0cAa0C9E0D724Fe183";

interface Chain {
  id: number;
  name: string;
}

interface BorrowHistoryItem {
  chain: string;
  amount: string;
  date: string;
}

const supportedChains: Chain[] = [
  { id: 1, name: "Ethereum" },
  { id: 42161, name: "Arbitrum" },
  { id: 8453, name: "Base" },
  { id: 137, name: "Polygon" },
  { id: 56, name: "BNB" },
];

const CrossChainLendingApp: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const [activeTab, setActiveTab] = useState<string>("withdraw");
  const [nftId, setNftId] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("1");
  const [borrowAmount, setBorrowAmount] = useState<string>("");
  const [nftMinted, setNftMinted] = useState<boolean>(false);
  const [isMintLoading, setMintLoading] = useState<boolean>(false);
  const [isBorrowLoading, setBorrowLoading] = useState<boolean>(false);
  const [isBorrowSuccess, setBorrowSuccess] = useState<boolean>(false);
  const [isMintSuccess, setMintSuccess] = useState<boolean>(false);
  const [borrowHistory, setBorrowHistory] = useState<BorrowHistoryItem[]>([]);


  const { data: availableToBorrow } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'getWalletChainLimit',
    args: [BigInt(nftId || "0"), address || "0x0000000000000000000000000000000000000000", BigInt(selectedChain)],
    // enabled: isConnected && !!nftId && !!address,
  });
  
  // const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
  //   hash: mintData?.hash,
  // });


  // const { isLoading: isBorrowLoading, isSuccess: isBorrowSuccess } = useWaitForTransactionReceipt({
  //   hash: borrowData?.hash,
  // });

  const switchToAdminChain = async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: optimismSepolia.id });
      } catch (error) { 
        console.error("Network switch request failed:", error);
        alert("Failed to switch network.");
      }
    }
  };


  function WriteContract() {
    const { data: hash, error, isPending, writeContract } = useWriteContract()
  
    async function submit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault()
      const formData = new FormData(e.target as HTMLFormElement)
      if (chain?.id !== optimismSepolia.id) {
        await switchToAdminChain();
      }
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'mint',
        args: [],
        value: BigInt(20000000000000000)
      })
    }
  
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
      useWaitForTransactionReceipt({
        hash,
      })
  
    return (
      <div>
        <h2>Write Contract</h2>
        <form onSubmit={submit}>
          <h2>Mint for: 0.02 ETH</h2>
          You don't own a card yet. 
          <h3></h3>
          <button disabled={isPending} type="submit">
            {(chain?.id == optimismSepolia.id ? (isPending ? 'Confirming...' : 'Mint') : 'Switch to Arbitrum')}
          </button>
        </form>
        {hash && <div>Transaction Hash: {hash}</div>}
        {isConfirming && 'Waiting for confirmation...'}
        {isConfirmed && 'Transaction confirmed.'}
        {error && (
          <div>Error: {(error as BaseError).shortMessage || error.message}</div>
        )}
      </div>
    )
  }

  const borrow = async () => {
    if (!nftId || !borrowAmount) return;
    // borrowToken({
    //   args: [BigInt(nftId), BigInt(selectedChain), parseEther(borrowAmount)],
    // });
  };

  React.useEffect(() => {
    if (isMintSuccess) {
      setNftMinted(true);
      alert("Your NFT has been minted successfully!");
    }
  }, [isMintSuccess]);

  React.useEffect(() => {
    if (isBorrowSuccess) {
      alert(`Borrowed ${borrowAmount} ETH on ${supportedChains.find(chain => chain.id === parseInt(selectedChain))?.name}`);
      setBorrowHistory(prev => [
        { 
          chain: supportedChains.find(chain => chain.id === parseInt(selectedChain))?.name || "Unknown", 
          amount: borrowAmount, 
          date: new Date().toLocaleString() 
        },
        ...prev
      ]);
    }
  }, [isBorrowSuccess, borrowAmount, selectedChain]);

  const renderConfigTab = () => (
    <div className="tab-content">
      <h3>Configuration</h3>
      
      {!nftMinted ? (
        <WriteContract/>
      ) : (
        <div>
          <p className="success-message">NFT Minted Successfully!</p>
        </div>
      )}
    </div>
  );

  const renderWithdrawTab = () => (
    <div className="tab-content">
      <h3>Withdraw</h3>
      <div className="input-group">
        <label htmlFor="nftId">NFT ID</label>
        <input
          id="nftId"
          type="number"
          placeholder="Enter NFT ID"
          value={nftId}
          onChange={(e) => setNftId(e.target.value)}
          className="text-input"
        />
      </div>

      <div className="input-group">
        <label htmlFor="chain">Select Chain</label>
        <select
          id="chain"
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="select-input"
        >
          <option value="">Select chain</option>
          {supportedChains.map((chain) => (
            <option key={chain.id} value={chain.id.toString()}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label htmlFor="borrowAmount">Borrow Amount</label>
        <div className="input-with-button">
          <input
            id="borrowAmount"
            type="number"
            placeholder="Enter amount to borrow"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            className="text-input"
          />
          <button 
            className="button secondary" 
            onClick={() => setBorrowAmount(availableToBorrow ? formatEther(BigInt(0)) : '0')}
          >
            Max
          </button>
        </div>
        <div className="available-amount">
          Available: {availableToBorrow ? formatEther(BigInt(0)) : '0'} ETH
        </div>
      </div>

      <button
        className="button primary"
        onClick={borrow}
        disabled={!nftId || !borrowAmount || isBorrowLoading}
      >
        {isBorrowLoading ? 'Borrowing...' : 'Borrow'}
      </button>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="tab-content">
      <h3>Borrow History</h3>
      {borrowHistory.length === 0 ? (
        <p className="info-text">No borrowing history yet.</p>
      ) : (
        <ul className="history-list">
          {borrowHistory.map((borrow, index) => (
            <li key={index} className="history-item">
              <span className="history-date">{borrow.date}</span>
              <span className="history-details">Borrowed {borrow.amount} ETH on {borrow.chain}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Cross-Chain Lending</h1>
        <ConnectButton />
      </div>

      <div className="main-content">
        <div className="tab-container">
          <button 
            className={`tab ${activeTab === 'config' ? 'active' : ''}`} 
            onClick={() => setActiveTab('config')}
          >
            Config
          </button>
          <button 
            className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`} 
            onClick={() => setActiveTab('withdraw')}
          >
            Withdraw
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`} 
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        {activeTab === 'config' && renderConfigTab()}
        {activeTab === 'withdraw' && renderWithdrawTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
      {/* {borrowData?.hash && (
        <div className="transaction-hash">
          <p>
            Transaction Hash:{" "}
            <a href={`https://etherscan.io/tx/${borrowData.hash}`} target="_blank" rel="noopener noreferrer">
              {borrowData.hash}
            </a>
          </p>
        </div>
      )} */}
    </div>
  );
};

export default CrossChainLendingApp;