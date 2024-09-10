import React, { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Box, Flex, Text, VStack, HStack } from "@chakra-ui/react";
import {
  getChainLendingAddress,
  getChainName,
  getLegacyId,
  getLZId,
  getNftAddress,
} from "../utils/chainMapping";
import spendingRawAbi from "../abi/SmokeSpendingContract.abi.json";

import { NFT, backendUrl } from "@/CrossChainLendingApp";
import { Button } from "./ui/button";
import { ChevronDownCircle, ChevronUpCircle } from "lucide-react";
import { bytes32ToAddress } from "@/utils/addressConversion";
import axios from "axios";
interface ChainBorrowPositions {
  chainId: string;
  totalAmount: string;
  wallets: {
    address: string;
    amount: string;
  }[];
}
const RepayTab: React.FC<{
  selectedNFT: NFT | undefined;
  updateDataCounter: number;
  setUpdateDataCounter: any;
  isMobile: boolean;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter, isMobile }) => {
  const [repayAmount, setRepayAmount] = useState<string>("0.0000");
  const [selectedWallets, setSelectedWallets] = useState<{
    [chainId: string]: string[];
  }>({});
  // const [expandedChains, setExpandedChains] = useState<string[]>([]);
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [chainBorrowPositions, setChainBorrowPositions] = useState<
    ChainBorrowPositions[]
  >([]);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (selectedNFT) {
      const positions: ChainBorrowPositions[] = [];
      selectedNFT.borrowPositions.forEach((walletPosition) => {
        walletPosition.borrowPositions.forEach((position) => {
          let chainPosition = positions.find(
            (p) => p.chainId === position.chainId
          );
          if (!chainPosition) {
            chainPosition = {
              chainId: position.chainId,
              totalAmount: "0",
              wallets: [],
            };
            positions.push(chainPosition);
          }
          chainPosition.totalAmount = (
            BigInt(chainPosition.totalAmount) + BigInt(position.amount)
          ).toString();
          if (position.amount !== "0") {
            chainPosition.wallets.push({
              address: walletPosition.walletAddress,
              amount: position.amount,
            });
          }
        });
      });
      setChainBorrowPositions(positions);
    }
  }, [selectedNFT]);

  const handleRepay = async () => {
    if (!selectedNFT || !address || !selectedChainId) return;

    const nftIds: bigint[] = [];
    const wallets: `0x${string}`[] = [];
    const amounts: bigint[] = [];

    selectedWallets[selectedChainId].forEach((walletAddress) => {
      nftIds.push(BigInt(selectedNFT.id));
      wallets.push(walletAddress as `0x${string}`);
      const position = chainBorrowPositions
        .find((pos) => pos.chainId === selectedChainId)
        ?.wallets.find((w) => w.address === walletAddress);
      amounts.push(BigInt(position?.amount || "0"));
    });

    if (nftIds.length === 1) {
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: spendingRawAbi,
        functionName: "repay",
        args: [getNftAddress(), nftIds[0], wallets[0], address],
        value: parseEther(repayAmount),
      });
    } else {
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: spendingRawAbi,
        functionName: "repayMultiple",
        args: [getNftAddress(), nftIds, wallets, amounts, address],
        value: parseEther(repayAmount),
      });
    }
  };
  const handleWalletSelection = (
    chainId: string,
    walletAddressOriginal: string
  ) => {
    setSelectedWallets((prev) => {
      const updatedWallets: { [chainId: string]: string[] } = {};
      const walletAddress = bytes32ToAddress(
        walletAddressOriginal as `0x${string}`
      );

      if (chainId !== selectedChainId) {
        // Clear previous selections and set the new chain
        updatedWallets[chainId] = [walletAddress];
        setSelectedChainId(chainId);
      } else {
        // Update selections for the current chain
        const currentChainWallets = prev[chainId] || [];
        if (currentChainWallets.includes(walletAddress)) {
          updatedWallets[chainId] = currentChainWallets.filter(
            (addr) => addr !== walletAddress
          );
        } else {
          updatedWallets[chainId] = [...currentChainWallets, walletAddress];
        }

        // If no wallets are selected for this chain, set selectedChainId to null
        if (updatedWallets[chainId].length === 0) {
          setSelectedChainId(null);
        }
      }

      return updatedWallets;
    });
  };

  const handleChainSelection = (chainId: string) => {
    setSelectedWallets((prev) => {
      const updatedWallets: { [chainId: string]: string[] } = {};
      const chainPosition = chainBorrowPositions.find(
        (p) => p.chainId === chainId
      );

      if (chainPosition) {
        if (
          chainId !== selectedChainId ||
          !prev[chainId] ||
          prev[chainId].length !== chainPosition.wallets.length
        ) {
          // Select all wallets for the new chain
          updatedWallets[chainId] = chainPosition.wallets.map((w) =>
            bytes32ToAddress(w.address as `0x${string}`)
          );
          setSelectedChainId(chainId);
          if (expandedChain && expandedChain !== chainId) {
            toggleChainExpansion(expandedChain);
          }
        } else {
          // Deselect all wallets if all were previously selected
          setSelectedChainId(null);
        }
      }

      return updatedWallets;
    });
  };

  const toggleChainExpansion = (chainId: string) => {
    setExpandedChain((prev) => (prev === chainId ? null : chainId));
  };

  useEffect(() => {
    let totalRepayAmount = 0;
    if (selectedChainId) {
      const chainPosition = chainBorrowPositions.find(
        (p) => p.chainId === selectedChainId
      );
      if (chainPosition) {
        selectedWallets[selectedChainId].forEach((walletAddress) => {
          const wallet = chainPosition.wallets.find(
            (w) =>
              bytes32ToAddress(w.address as `0x${string}`) === walletAddress
          );
          if (wallet) {
            totalRepayAmount += parseFloat(formatEther(BigInt(wallet.amount)));
          }
        });
      }
    }
    setRepayAmount(
      totalRepayAmount == 0 ? "0.0" : totalRepayAmount.toFixed(18)
    );
  }, [selectedWallets, chainBorrowPositions, selectedChainId]);

  const updateBorrow = async (nftId: string) => {
    const response = await axios.post(`${backendUrl}/api/updateborrow`, {
      nftId: nftId,
      chainId: getLZId(chainId).toString(),
    });
    return response.data.status === "update_successful";
  };

  useEffect(() => {
    const updateBackend = async () => {
      if (isConfirmed && selectedNFT) {
        const updateStatus = await updateBorrow(selectedNFT.id);
        if (updateStatus) {
          setUpdateDataCounter(updateDataCounter + 1);
        }
      }
    };
    updateBackend();
  }, [isConfirmed, isConfirming]);

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  const handleSwitchChain = () => {
    if (selectedChainId) {
      const targetChainId = getLegacyId(Number(selectedChainId));
      if (targetChainId) {
        switchToChain(targetChainId);
      }
    }
  };

  if (!selectedNFT) {
    return <div>Please select an NFT first.</div>;
  }

  const isCorrectChain = selectedChainId === getLZId(chainId).toString();

  return (
    <div className="tab-content">
      <Flex
        direction={isMobile ? "column" : "row"}
        justify="center"
        gap={16}
        padding={10}
        alignItems={isMobile ? "stretch" : ""}
        w="full"
        // px={400}
      >
        <Card className="fontSizeLarge">
          <CardHeader>
            <CardTitle>Repay</CardTitle>
            <CardDescription className="fontSizeLarge">
              Repay ETH for selected wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              className="fontSizeLarge"
              type="number"
              placeholder="Amount"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            {isCorrectChain ? (
              <Button
                onClick={handleRepay}
                disabled={
                  !repayAmount || repayAmount === "0" || !selectedChainId
                }
              >
                Repay
              </Button>
            ) : (
              <Button onClick={handleSwitchChain} disabled={!selectedChainId}>
                Switch Chain
              </Button>
            )}
            {error && <div>Error: {error.message}</div>}
            {isConfirmed && <div>Transaction confirmed!</div>}
          </CardFooter>
        </Card>
        <Card>
          <Table className="fontSizeLarge">
            <TableHeader>
              <TableRow>
                <TableHead>Chain</TableHead>
                <TableHead>Total Borrow Amount</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Select All</TableHead>
                <TableHead>Expand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chainBorrowPositions.map((chainPosition) => (
                <React.Fragment key={chainPosition.chainId}>
                  <TableRow>
                    <TableCell>
                      {getChainName(Number(chainPosition.chainId))}
                    </TableCell>
                    <TableCell>
                      {Number(
                        formatEther(BigInt(chainPosition.totalAmount))
                      ).toPrecision(4)}{" "}
                      ETH
                    </TableCell>
                    <TableCell>5%</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={
                          selectedWallets[chainPosition.chainId]?.length ===
                          chainPosition.wallets.length
                        }
                        onCheckedChange={() =>
                          handleChainSelection(chainPosition.chainId)
                        }
                        disabled={chainPosition.wallets.length == 0}
                      />
                    </TableCell>
                    {chainPosition.wallets.length == 0 ? (
                      ""
                    ) : (
                      <TableCell>
                        <Button
                          size="icon"
                          onClick={() =>
                            toggleChainExpansion(chainPosition.chainId)
                          }
                        >
                          {expandedChain === chainPosition.chainId ? (
                            <ChevronUpCircle className="h-5 w-5" />
                          ) : (
                            <ChevronDownCircle className="h-5 w-5" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedChain === chainPosition.chainId && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Wallet</TableHead>
                              <TableHead>Borrow Amount</TableHead>
                              <TableHead>Select</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {chainPosition.wallets.map((wallet) => (
                              <TableRow key={wallet.address}>
                                <TableCell>
                                  {bytes32ToAddress(
                                    wallet.address as `0x${string}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatEther(BigInt(wallet.amount))} ETH
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={
                                      selectedWallets[chainPosition.chainId] &&
                                      selectedWallets[
                                        chainPosition.chainId
                                      ]?.includes(
                                        bytes32ToAddress(
                                          wallet.address as `0x${string}`
                                        )
                                      )
                                    }
                                    onCheckedChange={() =>
                                      handleWalletSelection(
                                        chainPosition.chainId,
                                        wallet.address
                                      )
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Flex>
    </div>
  );
};

export default RepayTab;
