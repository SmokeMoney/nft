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
} from "../utils/chainMapping";
import lendingRawAbi from "../abi/CrossChainLendingContract.abi.json";

import { NFT } from "@/CrossChainLendingApp";
import { Button } from "./ui/button";
import { ChevronDownCircle, ChevronUpCircle } from "lucide-react";
interface ChainBorrowPositions {
  chainId: string;
  totalAmount: string;
  wallets: {
    address: string;
    amount: string;
  }[];
}
const RepayTab: React.FC<{ selectedNFT: NFT | undefined }> = ({
  selectedNFT,
}) => {
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [selectedWallets, setSelectedWallets] = useState<{
    [chainId: string]: string[];
  }>({});
  const [expandedChains, setExpandedChains] = useState<string[]>([]);
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
    console.log(amounts);
    console.log(parseEther(repayAmount));

    if (nftIds.length === 1) {
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: lendingRawAbi,
        functionName: "repay",
        args: [nftIds[0], wallets[0], address],
        value: parseEther(repayAmount),
      });
    } else {
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: lendingRawAbi,
        functionName: "repayMultiple",
        args: [nftIds, wallets, amounts, address],
        value: parseEther(repayAmount),
      });
    }
  };

  const handleWalletSelection = (chainId: string, walletAddress: string) => {
    setSelectedWallets((prev) => {
      const updatedWallets = { ...prev };
      if (chainId !== selectedChainId) {
        // Clear previous selections and set the new chain
        updatedWallets[chainId] = [walletAddress];
        setSelectedChainId(chainId);
      } else {
        if (!updatedWallets[chainId]) {
          updatedWallets[chainId] = [];
        }
        if (updatedWallets[chainId].includes(walletAddress)) {
          updatedWallets[chainId] = updatedWallets[chainId].filter(
            (addr) => addr !== walletAddress
          );
        } else {
          updatedWallets[chainId].push(walletAddress);
        }
        if (updatedWallets[chainId].length === 0) {
          setSelectedChainId(null);
        }
      }
      return updatedWallets;
    });
  };

  const handleChainSelection = (chainId: string) => {
    setSelectedWallets((prev) => {
      const updatedWallets = { ...prev };
      const chainPosition = chainBorrowPositions.find(
        (p) => p.chainId === chainId
      );
      if (chainPosition) {
        if (chainId !== selectedChainId) {
          // Clear previous selections and select all wallets for the new chain
          updatedWallets[chainId] = chainPosition.wallets.map((w) => w.address);
          setSelectedChainId(chainId);
        } else {
          if (
            updatedWallets[chainId]?.length === chainPosition.wallets.length
          ) {
            // Deselect all wallets for this chain
            delete updatedWallets[chainId];
            setSelectedChainId(null);
          } else {
            // Select all wallets for this chain
            updatedWallets[chainId] = chainPosition.wallets.map(
              (w) => w.address
            );
          }
        }
      }
      return updatedWallets;
    });
  };

  const toggleChainExpansion = (chainId: string) => {
    setExpandedChains((prev) =>
      prev.includes(chainId)
        ? prev.filter((id) => id !== chainId)
        : [...prev, chainId]
    );
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
            (w) => w.address === walletAddress
          );
          if (wallet) {
            totalRepayAmount += parseFloat(formatEther(BigInt(wallet.amount)));
          }
        });
      }
    }
    setRepayAmount(totalRepayAmount.toFixed(18));
  }, [selectedWallets, chainBorrowPositions, selectedChainId]);

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
        direction={{ base: "column", md: "row" }}
        justify="center"
        align="stretch"
        gap={16}
        padding={10}
        w="full"
        px={400}
      >
        <Box flex={1} maxW={{ base: "full", md: "800px" }}>
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
        </Box>
        <Box flex={1.5}>
          <Card>
            <Table className="fontSizeLarge">
              <TableHeader>
                <TableRow>
                  <TableHead>Chain</TableHead>
                  <TableHead>Total Borrow Amount</TableHead>
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
                        {formatEther(BigInt(chainPosition.totalAmount))} ETH
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={
                            selectedWallets[chainPosition.chainId]?.length ===
                            chainPosition.wallets.length
                          }
                          onCheckedChange={() =>
                            handleChainSelection(chainPosition.chainId)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          onClick={() =>
                            toggleChainExpansion(chainPosition.chainId)
                          }
                        >
                          {expandedChains.includes(chainPosition.chainId) ? (
                            <ChevronUpCircle className="h-5 w-5" />
                          ) : (
                            <ChevronDownCircle className="h-5 w-5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedChains.includes(chainPosition.chainId) && (
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
                                  <TableCell>{wallet.address}</TableCell>
                                  <TableCell>
                                    {formatEther(BigInt(wallet.amount))} ETH
                                  </TableCell>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedWallets[
                                        chainPosition.chainId
                                      ]?.includes(wallet.address)}
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
        </Box>
      </Flex>
    </div>
  );
};

export default RepayTab;
