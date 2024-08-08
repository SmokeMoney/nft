import React, { FormEvent, useCallback, useEffect, useState } from "react";
import {
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContracts,
  useReadContract,
} from "wagmi";
import { Address, parseEther } from "viem";
import { arbitrumSepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

import { Flex, HStack, Spinner, VStack } from "@chakra-ui/react";

// You'll need to import your ABI here\
import coreNFTRawAbi from "../abi/CoreNFTContract.abi.json";
import parseDumbAbis from "../abi/parsedCoreNFTAbi";
import { AlignJustify, Bold, ChevronDownIcon } from "lucide-react";
import { Separator } from "./ui/separator";
import { backendUrl, NFT_CONTRACT_ADDRESS } from "@/CrossChainLendingApp";
import axios from "axios";
import { getChainExplorer, getLZId } from "@/utils/chainMapping";
import FAQContent from "./custom/FAQ";
const coreNFTAbi = parseDumbAbis(coreNFTRawAbi);

const MintNFTComp: React.FC<{
  ethBalance: string;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({ ethBalance, updateDataCounter, setUpdateDataCounter }) => {
  const chainId = useChainId();
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const [faucetHash, setFaucetHash] = useState<string>("");
  const [oldBalance, setOldBalance] = useState<number>(0);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const switchToAdminChain = async () => {
    switchChain({ chainId: arbitrumSepolia.id });
  };

  async function handleMint(e: any) {
    e.preventDefault();
    setOldBalance(balance);
    writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: coreNFTAbi,
      functionName: "mint",
      args: [],
      value: parseEther("0.02"),
    });
  }
  const getTestnetETH = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/testnet-faucet`, {
        walletAddress: address,
      });
      if (response.data.status === "funding_successful") {
        setFaucetHash(response.data.transactionHash);
      } else if (response.data.status === "has_sufficient_balance") {
        setFaucetHash("0x");
      }
    } catch (error) {
      console.error("Error fetching borrow signature:", error);
      return null;
    }
  };

  const handleBridgeClick = (source: string) => {
    const url =
      source === "ethereum"
        ? "https://bridge.arbitrum.io/"
        : "https://jumper.exchange/?toChain=42161&toToken=0x0000000000000000000000000000000000000000";
    window.open(url, "_blank");
  };

  const updateNFTDataBackend = async (nftId: string) => {
    const response = await axios.post(`${backendUrl}/api/updatenft`, {
      nftId: nftId,
      chainId: getLZId(chainId).toString(),
    });
    console.log(response);
    return response.data.status === "update_successful";
  };

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: coreNFTAbi,
    functionName: "balanceOf",
    args: [address as Address],
  });
  const balance = balanceData ? Number(balanceData) : 0;

  const { data: nftId, refetch: refetchNftId } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: coreNFTAbi,
    functionName: "tokenOfOwnerByIndex",
    args: [address as Address, balance - 1],
  });

  const updateBackend = useCallback(async () => {
    if (isConfirmed && nftId && balanceData) {
      if (balance !== oldBalance) {
        try {
          const status = await updateNFTDataBackend(nftId.toString());
          if (status) {
            setUpdateDataCounter(updateDataCounter + 1);
          }
        } catch (error) {
          console.error("Failed to update backend:", error);
        }
      }
    }
  }, [isConfirmed, nftId, balanceData, balance]);

  useEffect(() => {
    if (isConfirmed) {
      const pollInterval = setInterval(() => {
        refetchBalance();
        refetchNftId();
        if (nftId) {
          updateBackend();
          return () => clearInterval(pollInterval);
        }
      }, 4200); // Poll every 4.20 seconds

      return () => clearInterval(pollInterval);
    }
  }, [isConfirmed, refetchBalance, refetchNftId, updateBackend]);

  useEffect(() => {
    if (error) {
      console.error("Mint error:", error.message);
    }
  }, [error]);

  return (
    <div>
      <Flex justify="center" align="stretch" w="full" px={4}>
        <Flex justify="space-between" align="start" w="full" maxW="900px">
          <VStack spacing={4} width="50%" align="stretch">
            <Card>
              <CardHeader>
                <CardTitle>Mint NFT</CardTitle>
                <CardDescription className="fontSizeLarge">
                  Your NFT is your credit card
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div></div>
                Mint Price: 0.02 ETH
                <div></div>
                <HoverCard>
                  <HoverCardTrigger>
                    Extra Credit: 0.01 ETH (!)
                  </HoverCardTrigger>
                  <HoverCardContent>
                    This is the extra limit you get that you can spend.
                  </HoverCardContent>
                </HoverCard>
              </CardContent>
              <CardFooter>
                <VStack>
                  <HStack>
                    {arbitrumSepolia.id === chainId ? (
                      <Button
                        onClick={handleMint}
                        disabled={isPending || isConfirming}
                      >
                        {isPending
                          ? "Confirming..."
                          : isConfirming
                          ? "Processing..."
                          : "Mint"}
                      </Button>
                    ) : (
                      <Button onClick={switchToAdminChain}>
                        Switch to Arbitrum
                      </Button>
                    )}
                    <Separator orientation="vertical" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Bridge to Arbitrum{" "}
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleBridgeClick("ethereum")}
                        >
                          Bridge from Ethereum
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBridgeClick("anywhere")}
                        >
                          Bridge from anywhere
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </HStack>
                </VStack>
              </CardFooter>

              {error && (
                <div>
                  Error:{" "}
                  {error.message.includes(
                    "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account"
                  )
                    ? "Not enough balance to mint"
                    : error.message}
                </div>
              )}
              {isConfirmed && (
                <div>
                  Transaction confirmed! Indexing, pls wait...
                  <Spinner color="red.500" size="xl" />
                </div>
              )}
            </Card>
            <Card style={{ flex: 1, padding: 12 }}>
              <CardHeader>
                <CardTitle>Arbitrum Testnet Faucet</CardTitle>
              </CardHeader>
              <CardContent>
                <div color="grey">(Balance: {ethBalance ?? 0} ETH)</div>
              </CardContent>
              <CardFooter>
                <Flex>
                  <VStack>
                    <Button onClick={getTestnetETH}>Get 0.021 ETH</Button>
                    <div>
                      {faucetHash == "0x" ? (
                        "Already Funded."
                      ) : faucetHash == "" ? (
                        ""
                      ) : (
                        <>
                          {"You've been"}{" "}
                          <a
                            href={
                              getChainExplorer(getLZId(chainId)) +
                              "tx/" +
                              faucetHash
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "blue",
                              textDecoration: "underline",
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent toast from closing
                          >
                            Funded.
                          </a>
                        </>
                      )}
                    </div>
                  </VStack>
                </Flex>
              </CardFooter>
            </Card>
          </VStack>

          {/* <div className="w-full max-w-full overflow-hidden"> */}
          <Card style={{ width: "49%" }}>
            <FAQContent />
          </Card>
          {/* </div> */}
        </Flex>
      </Flex>
    </div>
  );
};

export default MintNFTComp;
