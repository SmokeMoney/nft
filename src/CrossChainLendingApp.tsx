import React, { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useSwitchChain,
  useReadContract,
  useReadContracts,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
  type BaseError,
} from "wagmi";
import { getBalance } from "@wagmi/core";
import { formatEther, formatUnits, parseEther } from "viem";
import { arbitrumSepolia } from "wagmi/chains";
import { Address } from "viem";
import { ChevronDownCircle, ChevronUpCircle } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DepositTabComp from "@/components/DepositTab"; // Adjust the import path as necessary

import * as Popover from "@radix-ui/react-popover";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import "./CrossChainLendingApp.css";
import parseDumbAbis from "./abi/parsedCoreNFTAbi";
import coreNFTRawAbi from "./abi/CoreNFTContract.abi.json";
import { getChainName, getLZId } from "./utils/chainMapping";
import HandleBorrow from "./components/HandleBorrow";

import { Box, Flex, VStack, HStack, Text } from "@chakra-ui/react";
import { ModeToggle } from "./components/mode-toggle";
import { config } from "./wagmi";

const NFT_CONTRACT_ADDRESS =
  "0x9C2e3e224F0f5BFaB7B3C454F0b4357d424EF030" as Address;
const backendUrl = "http://localhost:3000";
const coreNFTAbi = parseDumbAbis(coreNFTRawAbi);

interface WalletConfig {
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
  extraLimit: string;
}

const CrossChainLendingApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("withdraw");
  const [ethPrice, setEthPrice] = useState<string>("");
  const [ethBalance, setEthBalance] = useState<string>("");
  const [ethOrUSD, setEthOrUSD] = useState<boolean>(false);
  const [wstETHRatio, setWstethRatio] = useState<string>("");
  const [listNFTs, setListNFTs] = useState<NFT[]>([]);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);

  const [chainList2, setChainList2] = useState<string[]>([]);
  const { address, isConnected } = useAccount();
  const [selectedNFT, setSelectedNFT] = useState<NFT>();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const { data: balanceData } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: coreNFTAbi,
    functionName: "balanceOf",
    args: [address as Address],
  });

  const balance = balanceData ? Number(balanceData) : 0;

  const blankNFT = (tokenId: bigint) => {
    return {
      id: formatUnits(tokenId, 0).toString(),
      owner: true,
      wethDeposits: [],
      wstEthDeposits: [],
      borrowPositions: [],
      totalBorrowPosition: "0",
      chainLimits: {},
      extraLimit: "0",
    };
  };

  const { data: nftData } = useReadContracts({
    contracts: Array.from({ length: balance }, (_, i) => ({
      address: NFT_CONTRACT_ADDRESS,
      abi: coreNFTAbi,
      functionName: "tokenOfOwnerByIndex",
      args: [address, BigInt(i)],
    })),
  });

  useEffect(() => {
    if (nftData && chainId === arbitrumSepolia.id) {
      const nfts: NFT[] = nftData
        .map((item) => item.result)
        .filter((tokenId): tokenId is bigint => tokenId !== undefined)
        .map((tokenId) => blankNFT(tokenId));
      setListNFTs((prevNFTs) => mergeAndDeduplicateNFTs(prevNFTs, nfts));
      if (nfts.length > 0 && !selectedNFT) {
        setSelectedNFT(nfts[0]);
      }
    }
  }, [nftData]);

  const { data: fetchedChainList } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: coreNFTAbi,
    functionName: "getChainList",
  }) as { data: bigint[] | undefined };

  const { data: walletList } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: coreNFTAbi,
    functionName: "getWallets",
    args: selectedNFT ? [BigInt(selectedNFT?.id)] : undefined,
  }) as { data: Address[] | undefined };

  useEffect(() => {
    if (fetchedChainList) {
      setChainList2(fetchedChainList.map((chain) => formatUnits(chain, 0)));
    }
  }, [fetchedChainList]);

  const fetchWalletData = async (address: string) => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/walletdata/${address}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  };

  const fetchOracleData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/oracle-data`);
      return response.data;
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  };

  const mergeAndDeduplicateNFTs = (
    existingNFTs: NFT[],
    newNFTs: NFT[]
  ): NFT[] => {
    const combinedNFTs = [...existingNFTs, ...newNFTs];

    const nftMap = new Map<string, NFT>();

    combinedNFTs.forEach((nft) => {
      if (!nftMap.has(nft.id) || nft.owner) {
        nftMap.set(nft.id, nft);
      }
    });

    return Array.from(nftMap.values());
  };

  const { data: walletConfigs } = useReadContracts({
    contracts:
      walletList && selectedNFT
        ? walletList
            .map((wallet) => [
              {
                address: NFT_CONTRACT_ADDRESS,
                abi: coreNFTAbi,
                functionName: "getLimitsConfig",
                args: [BigInt(selectedNFT.id), wallet],
              },
              {
                address: NFT_CONTRACT_ADDRESS,
                abi: coreNFTAbi,
                functionName: "getAutogasConfig",
                args: [BigInt(selectedNFT.id), wallet],
              },
            ])
            .flat()
        : [],
  });

  useEffect(() => {
    if (walletList && walletConfigs && selectedNFT) {
      const configs = walletList.map((wallet, index) => {
        const limitsData = walletConfigs[index * 2]?.result as
          | bigint[]
          | undefined;
        const autogasData = walletConfigs[index * 2 + 1]?.result as
          | boolean[]
          | undefined;
        return {
          address: wallet,
          autogasEnabled: autogasData || [],
          limits: limitsData
            ? limitsData.map((limit) => formatEther(limit))
            : [],
          isModified: false,
          isExpanded: false,
          transactionHash: null,
        };
      });
      setWallets(configs);
    } else {
      const emptyConfigs: WalletConfig[] = [];
      setWallets(emptyConfigs);
    }
  }, [walletList, walletConfigs, selectedNFT]);

  useEffect(() => {
    const fetchNFTsAndBalance = async () => {
      if (isConnected && address) {
        const fetchedNFTs: NFT[] = await fetchWalletData(address);
        const oracleData: { eth: string; wsteth: string } =
          await fetchOracleData();
        setEthPrice(oracleData.eth);
        const wstETHRatio =
          (parseEther(oracleData.wsteth) * parseEther("1")) /
          parseEther(oracleData.eth);
        setWstethRatio(wstETHRatio.toString());

        setListNFTs((prevNFTs) =>
          mergeAndDeduplicateNFTs(prevNFTs, fetchedNFTs)
        );

        if (
          fetchedNFTs.length > 0 &&
          (!selectedNFT || selectedNFT.id === "0")
        ) {
          console.log("Setting new selected NFT:", fetchedNFTs[0]);
          setSelectedNFT(fetchedNFTs[0]);
        }
      }
      if (address) {
        const freshBalance = await getBalance(config, { address: address });
        setEthBalance(Number(formatEther(freshBalance.value)).toPrecision(4));
      }
    };
    fetchNFTsAndBalance();
  }, [isConnected, address, selectedNFT]);

  useEffect(() => {
    const balanceUpdate = async () => {
      if (address) {
        const freshBalance = await getBalance(config, { address: address });
        setEthBalance(Number(formatEther(freshBalance.value)).toPrecision(4));
      }
    };
    balanceUpdate();
  }, [isConnected, address, chainId]);

  useEffect(() => {
    setListNFTs([]);
    setSelectedNFT(undefined);
  }, [address]);

  const switchToAdminChain = async () => {
    switchChain({ chainId: arbitrumSepolia.id });
  };

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  const NFTSelector: React.FC = () => {
    if (listNFTs.length === 0) {
      return <MintNFTButton />;
    }
    return (
      <DropdownMenu>
        Selected:<> </>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            NFT ID: {selectedNFT?.id.toString()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Select NFT</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={selectedNFT?.id.toString()}
            onValueChange={(newValue) => {
              const selectedNFTObject = listNFTs.find(
                (nft) => nft.id === newValue
              );
              if (selectedNFTObject) {
                setSelectedNFT(selectedNFTObject);
              }
            }}
          >
            {listNFTs.map((nft) => (
              <DropdownMenuRadioItem key={nft.id} value={nft.id}>
                NFT ID: {nft.id} {nft.owner ? "(owner)" : ""}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const MintNFTButton: React.FC = () => {
    const { data: hash, error, isPending, writeContract } = useWriteContract();

    async function submit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: coreNFTAbi,
        functionName: "mint",
        args: [],
        value: BigInt(parseEther("0.02")),
      });
    }

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
      useWaitForTransactionReceipt({
        hash,
      });

    return (
      <div>
        <h2>Mint NFT</h2>
        {chainId === arbitrumSepolia.id ? (
          <form onSubmit={submit}>
            <h3>Mint for: 0.02 ETH</h3>
            You don't own a card yet.
            <Button disabled={isPending} type="submit">
              {isPending ? "Confirming..." : "Mint"}
            </Button>
          </form>
        ) : (
          <Button onClick={switchToAdminChain}>Switch to Arbitrum</Button>
        )}
        {hash && <div>Transaction Hash: {hash}</div>}
        {isConfirming && "Waiting for confirmation..."}
        {isConfirmed && "Transaction confirmed."}
        {error && (
          <div>Error: {(error as BaseError).shortMessage || error.message}</div>
        )}
      </div>
    );
  };

  const ManageTab: React.FC = () => {
    const [newWalletAddress, setNewWalletAddress] = useState<string>("");


    const handleWalletAutogasToggle = (index: number, chainIndex?: number) => {
      setWallets((prev) => {
        const newWallets = [...prev];
        const targetWallet = { ...newWallets[index] };
        let isChanged = false;

        if (chainIndex !== undefined) {
          // Toggle for specific chain
          const newValue = !targetWallet.autogasEnabled[chainIndex];
          if (targetWallet.autogasEnabled[chainIndex] !== newValue) {
            targetWallet.autogasEnabled = [...targetWallet.autogasEnabled];
            targetWallet.autogasEnabled[chainIndex] = newValue;
            isChanged = true;
          }
        } else {
          // Toggle for all chains
          const allTrue = targetWallet.autogasEnabled.every(Boolean);
          const newValue = !allTrue;
          if (targetWallet.autogasEnabled.some((value) => value !== newValue)) {
            targetWallet.autogasEnabled = targetWallet.autogasEnabled.map(
              () => newValue
            );
            isChanged = true;
          }
        }

        if (isChanged) {
          targetWallet.isModified = true;
          newWallets[index] = targetWallet;
          return newWallets;
        }

        return prev;
      });
    };

    const handleWalletLimitChange = (
      index: number,
      value: string,
      chainIndex?: number
    ) => {
      const sanitizedValue = value.replace(/[^0-9.]/g, "");
      const parts = sanitizedValue.split(".");
      const formattedValue =
        parts[0] + (parts.length > 1 ? "." + parts[1] : "");

      setWallets((prev) => {
        const newWallets = [...prev];
        const targetWallet = { ...newWallets[index] };
        const newLimits = [...targetWallet.limits];

        try {
          if (chainIndex !== undefined) {
            newLimits[chainIndex] = formattedValue;
          } else {
            newLimits.fill(formattedValue);
          }
        } catch (error) {
          if (chainIndex !== undefined) {
            newLimits[chainIndex] = formattedValue;
          } else {
            newLimits.fill(formattedValue);
          }
        }

        targetWallet.limits = newLimits;
        targetWallet.isModified = true;
        newWallets[index] = targetWallet;
        return newWallets;
      });
    };

    const handleAddWallet = () => {
      if (newWalletAddress) {
        setWallets((prev) => [
          ...prev,
          {
            address: newWalletAddress,
            autogasEnabled: chainList2.map(() => false),
            limits: chainList2.map(() => "0"),
            isModified: true,
            isExpanded: false,
            transactionHash: null,
          },
        ]);
        setNewWalletAddress("");
      }
    };

    const saveChanges = (wallet: WalletConfig, index: number) => {
      const {
        data: hash,
        isPending,
        error,
        writeContract,
      } = useWriteContract();

      const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
          hash,
        });

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedNFT || chainList2.length === 0) {
          return;
        }

        const newLimits = wallet.limits.map((limit) =>
          BigInt(parseEther(limit))
        );
        writeContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: coreNFTAbi,
          functionName: "setHigherBulkLimits",
          args: [
            BigInt(selectedNFT.id),
            wallet.address as Address,
            chainList2.map(BigInt),
            newLimits,
            wallet.autogasEnabled,
          ],
        });
      };

      React.useEffect(() => {
        if (isConfirmed) {
          setWallets((prev) => {
            const newWallets = [...prev];
            newWallets[index] = {
              ...newWallets[index],
              isModified: false,
              transactionHash: null,
            };
            return newWallets;
          });
        }
      }, [isConfirmed]);

      return (
        <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <form onSubmit={handleSubmit}>
            <Button
              type="submit"
              disabled={!wallet.isModified || isConfirming || isPending}
            >
              {isPending
                ? "Waiting..."
                : isConfirming
                ? "Confirming..."
                : wallet.isModified
                ? "Save Changes"
                : "No Changes"}
            </Button>
            {error && (
              <div>
                Error: {(error as BaseError).shortMessage || error.message}
              </div>
            )}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Changes saved successfully!</div>}
          </form>
          <Button size="icon" onClick={() => toggleExpand(index)}>
            {wallet.isExpanded ? (
              <ChevronUpCircle className="h-5 w-5" />
            ) : (
              <ChevronDownCircle className="h-5 w-5" />
            )}
          </Button>
        </div>
      );
    };

    const toggleExpand = (index: number) => {
      setWallets((prev) => {
        const newWallets = [...prev];
        const targetWallet = newWallets[index];
        const newIsExpanded = !targetWallet.isExpanded;
        // Only update if the state is actually changing
        if (targetWallet.isExpanded !== newIsExpanded) {
          newWallets[index] = { ...targetWallet, isExpanded: newIsExpanded };
          return newWallets;
        }
        newWallets[index].isExpanded = !newWallets[index].isExpanded;
        // If no change is needed, return the previous state
        return prev;
      });
    };

    const WalletConfigTable: React.FC = () => {
      const getAutogasDisplay = (wallet: WalletConfig, chainIndex?: number) => {
        if (chainIndex !== undefined) {
          const autogasConfig: boolean = wallet.autogasEnabled[chainIndex];
          return (
            <Checkbox
              disabled={!selectedNFT?.owner}
              checked={autogasConfig}
              onCheckedChange={() =>
                handleWalletAutogasToggle(wallets.indexOf(wallet), chainIndex)
              }
            />
          );
        } else {
          const allTrue = wallet.autogasEnabled.every(Boolean);
          const allFalse = wallet.autogasEnabled.every((value) => !value);

          if (!allTrue && !allFalse) {
            return <span>&#9646;</span>; // Display a dash for mixed state
          }
          return (
            <Checkbox
              disabled={!selectedNFT?.owner}
              checked={allTrue}
              onCheckedChange={() =>
                handleWalletAutogasToggle(wallets.indexOf(wallet))
              }
            />
          );
        }
      };

      const getEditButton = (
        wallet: WalletConfig,
        index: number,
        chainIndex?: number
      ) => {
        const [currentLimit, setCurrentLimit] = useState<string>(
          wallet.limits[chainIndex ? chainIndex : 0]
        );
        const [alertLowerLimit, setAlertLowerLimit] = useState<boolean>(false);
        const modifyLimit = () => {
          if (currentLimit < wallet.limits[chainIndex ?? 0]) {
            setAlertLowerLimit(true);
            setCurrentLimit(wallet.limits[chainIndex ?? 0]);
          } else {
            handleWalletLimitChange(index, currentLimit, chainIndex);
          }
        };
        return (
          <>
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  disabled={
                    !selectedNFT?.owner ||
                    (wallet.isExpanded && chainIndex === undefined)
                  }
                >
                  Edit
                </Button>
              </Popover.Trigger>

              <Popover.Content sideOffset={5}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <Input
                    value={currentLimit}
                    onChange={(e) => setCurrentLimit(e.target.value)}
                    placeholder="Enter new limit"
                  />
                  <Button onClick={() => modifyLimit()}>Accept</Button>
                  <Popover.Close asChild>
                    <Button>Close</Button>
                  </Popover.Close>
                  <Popover.Arrow className="PopoverArrow" />
                  {alertLowerLimit ? (
                    <Alert>
                      <AlertTitle>Heads up!</AlertTitle>
                      <AlertDescription>
                        For now you can only increase the limit.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <></>
                  )}
                </div>
              </Popover.Content>
            </Popover.Root>
          </>
        );
      };

      return (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Autogas</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <Input
                      type="text"
                      value={newWalletAddress}
                      onChange={(e) => setNewWalletAddress(e.target.value)}
                      placeholder="Enter new wallet address"
                    />
                    <Button onClick={handleAddWallet}>Add Wallet</Button>
                  </div>
                </TableCell>
              </TableRow>
              {wallets.map((wallet, index) => (
                <React.Fragment key={wallet.address}>
                  <TableRow>
                    <TableCell>{wallet.address}</TableCell>
                    <TableCell>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 10,
                          alignItems: "center",
                          textAlign: "right",
                        }}
                      >
                        {wallet.limits.every(
                          (limit) => limit === wallet.limits[0]
                        )
                          ? wallet.isExpanded
                            ? "Being Configured"
                            : `${wallet.limits[0]} ETH`
                          : "Different limits"}
                        {getEditButton(wallet, index)}
                      </div>
                    </TableCell>
                    <TableCell>{getAutogasDisplay(wallet)}</TableCell>
                    <TableCell>{saveChanges(wallet, index)}</TableCell>
                  </TableRow>
                  {wallet.isExpanded && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Chain ID</TableHead>
                              <TableHead>Autogas</TableHead>
                              <TableHead>Limit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {chainList2.map((chainId, chainIndex) => (
                              <TableRow key={chainId.toString()}>
                                <TableCell>
                                  {getChainName(Number(chainId))}
                                </TableCell>
                                <TableCell>
                                  {getAutogasDisplay(wallet, chainIndex)}
                                </TableCell>
                                <TableCell>
                                  {wallet.limits[chainIndex]} ETH
                                  {getEditButton(wallet, index, chainIndex)}
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
        </div>
      );
    };

    return (
      <div className="tab-content">
        {chainId === arbitrumSepolia.id ? (
          <>
            {listNFTs.length > 0 && (
              <div>
                <WalletConfigTable />
              </div>
            )}
          </>
        ) : (
          <Button onClick={switchToAdminChain}>Switch to Arbitrum</Button>
        )}
      </div>
    );
  };

  const WithdrawTab: React.FC = () => {
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [walletBorrowPositions, setWalletBorrowPositions] = useState<
      PositionData[]
    >([]);
    const chainId = useChainId();
    const [selectChain, setSelectedChain] = useState<string>(
      getLZId(chainId).toString() ?? "1"
    );
    useEffect(() => {
      setWalletBorrowPositions(
        selectedNFT?.borrowPositions?.find(
          (position) => position.walletAddress === address
        )?.borrowPositions ?? []
      );
    }, [selectedNFT]);

    return (
      <div className="tab-content">
        <VStack align="stretch" spacing={6}>
          {selectedNFT && (
            <div>
              <div>
                <Separator className="my-4" />

                <HStack justify="stretch">
                  <Separator orientation="vertical" />
                  <Text>
                    <HoverCard>
                      <HoverCardTrigger>
                        Total Deposits:{" "}
                        {ethOrUSD
                          ? Number(
                              formatEther(
                                (parseEther(ethPrice) *
                                  (BigInt(
                                    selectedNFT?.wethDeposits?.reduce(
                                      (sum, deposit) =>
                                        sum + parseFloat(deposit.amount),
                                      0
                                    ) ?? 0
                                  ) +
                                    (BigInt(
                                      selectedNFT?.wstEthDeposits?.reduce(
                                        (sum, deposit) =>
                                          sum + parseFloat(deposit.amount),
                                        0
                                      ) ?? 0
                                    ) *
                                      BigInt(wstETHRatio)) /
                                      parseEther("1"))) /
                                  parseEther("1")
                              )
                            ).toPrecision(6)
                          : Number(
                              formatEther(
                                BigInt(
                                  selectedNFT?.wethDeposits?.reduce(
                                    (sum, deposit) =>
                                      sum + parseFloat(deposit.amount),
                                    0
                                  ) ?? 0
                                ) +
                                  (BigInt(
                                    selectedNFT?.wstEthDeposits?.reduce(
                                      (sum, deposit) =>
                                        sum + parseFloat(deposit.amount),
                                      0
                                    ) ?? 0
                                  ) *
                                    BigInt(wstETHRatio)) /
                                    parseEther("1")
                              )
                            ).toPrecision(5)}
                        {ethOrUSD ? " USD" : " ETH"}
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <p>
                          ETH Deposits:{" "}
                          {formatEther(
                            BigInt(
                              selectedNFT?.wethDeposits?.reduce(
                                (sum, deposit) =>
                                  sum + parseFloat(deposit.amount),
                                0
                              ) ?? 0
                            )
                          )}{" "}
                          ETH
                        </p>
                        <p>
                          wstETH Deposits:{" "}
                          {formatEther(
                            BigInt(
                              selectedNFT?.wstEthDeposits?.reduce(
                                (sum, deposit) =>
                                  sum + parseFloat(deposit.amount),
                                0
                              ) ?? 0
                            )
                          )}{" "}
                          wstETH
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  </Text>
                  <Separator orientation="vertical" />
                  <Text>
                    Total Borrowed:{" "}
                    {ethOrUSD
                      ? Number(
                          formatEther(
                            (parseEther(ethPrice) *
                              BigInt(selectedNFT.totalBorrowPosition)) /
                              parseEther("1")
                          )
                        ).toPrecision(5)
                      : Number(
                          formatEther(BigInt(selectedNFT.totalBorrowPosition))
                        ).toPrecision(5)}
                    {ethOrUSD ? " USD" : " ETH"}
                  </Text>
                  <Separator orientation="vertical" />
                  <Text as="b">
                    Available to Borrow:{" "}
                    {ethOrUSD
                      ? Number(
                          formatEther(
                            (parseEther(ethPrice) *
                              (((BigInt(
                                selectedNFT?.wethDeposits?.reduce(
                                  (sum, deposit) =>
                                    sum + parseFloat(deposit.amount),
                                  0
                                ) ?? 0
                              ) +
                                BigInt(
                                  selectedNFT?.wstEthDeposits?.reduce(
                                    (sum, deposit) =>
                                      sum + parseFloat(deposit.amount),
                                    0
                                  ) ?? 0
                                ) *
                                  BigInt(wstETHRatio)) *
                                BigInt(90)) /
                                (parseEther("1") * BigInt(100)) -
                                BigInt(selectedNFT.totalBorrowPosition))) /
                              parseEther("1")
                          )
                        ).toPrecision(5)
                      : Number(
                          formatEther(
                            BigInt(
                              selectedNFT?.wethDeposits?.reduce(
                                (sum, deposit) =>
                                  sum + parseFloat(deposit.amount),
                                0
                              ) ?? 0
                            ) +
                              (BigInt(
                                selectedNFT?.wstEthDeposits?.reduce(
                                  (sum, deposit) =>
                                    sum + parseFloat(deposit.amount),
                                  0
                                ) ?? 0
                              ) *
                                BigInt(wstETHRatio) *
                                BigInt(90)) /
                                (parseEther("1") * BigInt(100)) -
                              BigInt(selectedNFT.totalBorrowPosition)
                          )
                        ).toPrecision(5)}
                    {ethOrUSD ? " USD" : " ETH"}
                  </Text>
                  <Separator orientation="vertical" />
                  <HStack>
                    <Text>ETH</Text>
                    <Switch
                      checked={ethOrUSD}
                      onCheckedChange={(e) => {
                        setEthOrUSD(e);
                      }}
                    />
                    <Text>USD</Text>
                  </HStack>
                </HStack>
                <Separator className="my-4" />
              </div>
              <Flex justify="center" align="stretch" w="full" px={4}>
                <VStack spacing={8} align="stretch" maxW="1200px" w="full">
                  <Flex
                    direction={{ base: "column", md: "row" }}
                    justify="center"
                    align="stretch"
                    gap={8}
                  >
                    <Box flex={1} maxW={{ base: "full", md: "400px" }}>
                      <Card>
                        <CardHeader>
                          <CardTitle>Withdraw</CardTitle>
                          <CardDescription>
                            Withdraw ETH on {getChainName(Number(selectChain))}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                          />
                        </CardContent>
                        <CardFooter>
                          <HandleBorrow
                            selectedNFT={selectedNFT}
                            withdrawAmount={withdrawAmount}
                            chainId={chainId}
                            selectedChain={selectChain}
                          />
                        </CardFooter>
                      </Card>
                    </Box>
                    <Box flex={2}>
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Chain</TableHead>
                              <TableHead>Available</TableHead>
                              <TableHead>Interest</TableHead>
                              <TableHead>Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(selectedNFT.chainLimits).map(
                              ([chainId2, limit]) => (
                                <TableRow
                                  key={chainId2}
                                  className={
                                    selectChain === chainId2
                                      ? "SelectedBorRow"
                                      : ""
                                  }
                                  onClick={() => setSelectedChain(chainId2)}
                                >
                                  <TableCell>
                                    {getChainName(Number(chainId2))}
                                  </TableCell>
                                  <TableCell>
                                    {Number(
                                      formatEther(
                                        BigInt(limit) -
                                          BigInt(
                                            walletBorrowPositions.find(
                                              (position) =>
                                                position.chainId === chainId2
                                            )?.amount ?? "0"
                                          )
                                      )
                                    ).toPrecision(5)}{" "}
                                    ETH
                                  </TableCell>
                                  <TableCell>5%</TableCell>
                                  <TableCell>
                                    {chainId2 === getLZId(chainId).toString()
                                      ? ethBalance
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </Card>
                    </Box>
                  </Flex>
                </VStack>
              </Flex>
              {/* </div> */}
            </div>
          )}
        </VStack>
      </div>
    );
  };

  const DepositTab: React.FC = () => {
    return (
      <DepositTabComp
        selectedNFT={selectedNFT ?? blankNFT(BigInt(0))}
      />
    );
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <Flex
          width="100%"
          justifyContent="space-between"
          alignItems="center"
          p={4}
        >
          <HStack spacing={4}>
            <Button onClick={() => setActiveTab("manage")}>Manage</Button>
            <Button onClick={() => setActiveTab("withdraw")}>Smoke</Button>
            <Button onClick={() => setActiveTab("deposit")}>Deposit</Button>
            {<NFTSelector />}
          </HStack>
          <HStack spacing={4}>
            <ConnectButton />
            <ModeToggle />
          </HStack>
        </Flex>
        {activeTab === "manage" && <ManageTab />}
        {activeTab === "withdraw" && <WithdrawTab />}
        {activeTab === "deposit" && <DepositTab />}
      </div>
    </div>
  );
};

export default CrossChainLendingApp;
