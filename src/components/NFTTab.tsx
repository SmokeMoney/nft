import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Button } from "./ui/button";

import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSignTypedData,
  useWriteContract,
} from "wagmi";
import { useWriteContracts } from "wagmi/experimental";

import { Switch } from "./ui/switch";
import {
  getChainExplorer,
  getChainLendingAddress,
  getLZId,
  getNftAddress,
} from "@/utils/chainMapping";
import spendingRawAbi from "../abi/SmokeSpendingContract.abi.json";
import parseDumbAbis from "../abi/parsedSpendingAbi";
import { backendUrl, NFT } from "@/CrossChainLendingApp";
import { parseEther } from "viem";
import axios from "axios";
import { addressToBytes32 } from "@/utils/addressConversion";
import { useCapabilities } from "wagmi/experimental";
import {
  getBorrowSignature,
  requestGaslessBorrow,
  requestGaslessMinting,
} from "@/utils/borrowUtils";
import { useToast } from "./ui/use-toast";
import { ToastAction } from "./ui/toast";
import { Toaster } from "./ui/toaster";

const NFTTab: React.FC<{
  selectedNFT: NFT | undefined;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter }) => {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [borrowNonce, setBorrowNonce] = useState<bigint | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();
  const { writeContractsAsync } = useWriteContracts();
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [addressType, setAddressType] = useState<string | null>(null);

  const [lendingAddress, setLendingAddress] = useState<
    `0x${string}` | undefined
  >(undefined);

  const mintCost = "0.002";
  const abi = [
    {
      stateMutability: "nonpayable",
      type: "function",
      inputs: [{ name: "to", type: "address" }],
      name: "safeMint",
      outputs: [],
    },
    {
      stateMutability: "payable",
      type: "function",
      inputs: [],
      name: "mint",
      outputs: [],
    },
  ] as const;
  const spendingAbi = parseDumbAbis(spendingRawAbi);
  console.log(addressType);
  useEffect(() => {
    const checkAddressType = async () => {
      try {
        const bytecode = await publicClient.getCode({
          address: address as `0x${string}`,
        });

        if (bytecode && bytecode !== "0x") {
          setAddressType("Smart Contract");
          //   const { data: capabilities } = useCapabilities();
          //   console.log(capabilities);
        } else {
          setAddressType("EOA (Externally Owned Account)");
        }
      } catch (error) {
        console.error("Error checking address type:", error);
        console.log({
          title: "Error",
          description: "Failed to check address type. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    };
    checkAddressType();
  }, [address, chainId, publicClient]);

  useEffect(() => {
    try {
      const address2 = getChainLendingAddress(getLZId(chainId));
      setLendingAddress(address2);
    } catch (error) {
      console.error("Error getting lending address:", error);
      setLendingAddress(undefined);
    }
  }, [chainId]);

  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: lendingAddress,
    abi: spendingRawAbi,
    functionName: "getCurrentNonce",
    args: [
      getNftAddress(),
      selectedNFT?.id ? BigInt(selectedNFT.id) : BigInt(0),
    ],
  });

  useEffect(() => {
    if (nonce !== null && nonce !== undefined) {
      setBorrowNonce(BigInt(nonce.toString()));
    } else {
      setBorrowNonce(undefined);
    }
  }, [nonce]);

  const refreshNonce = useCallback(() => {
    if (selectedNFT?.id && lendingAddress) {
      refetchNonce();
    }
  }, [selectedNFT?.id, lendingAddress, refetchNonce]);

  useEffect(() => {
    // Set up the interval to refresh the nonce every 30 seconds
    const intervalId = setInterval(refreshNonce, 3000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshNonce]);

  useEffect(() => {
    // Initial nonce fetch when component mounts or dependencies change
    refreshNonce();
  }, [refreshNonce]);

  useEffect(() => {
    if (selectedNFT?.id) {
      refetchNonce();
    } else {
      setBorrowNonce(undefined);
    }
  }, [selectedNFT?.id, refetchNonce]);

  const handleMint = async () => {
    if (addressType === "Smart Contract") {
      console.log("inside ");

      if (!address || !selectedNFT) return;
      const signatureData = await getBorrowSignature(
        addressToBytes32(address),
        selectedNFT.id,
        parseEther(mintCost).toString(),
        getLZId(chainId).toString(),
        addressToBytes32(address)
      );
      if (!signatureData) {
        console.error("Failed to get borrow signature");
        return;
      }
      const {
        timestamp,
        nonce: signatureNonce,
        signature,
        status,
      } = signatureData;

      if (status === "borrow_approved") {
        try {
          const result = await writeContractsAsync({
            contracts: [
              {
                address: getChainLendingAddress(getLZId(chainId)),
                abi: spendingAbi,
                functionName: "borrow",
                args: [
                  getNftAddress(),
                  BigInt(selectedNFT.id),
                  parseEther(mintCost),
                  BigInt(timestamp),
                  BigInt(120), // signature validity
                  BigInt(signatureNonce),
                  address,
                  false,
                  signature,
                  0,
                ],
              },
              {
                address:
                  chainId == 84532
                    ? "0xD1F1Fc828205B65290093939c279E21be59c8916"
                    : "0x6eA21415e845c323a98d2D7cbFEf65A285080361",
                abi,
                functionName: "mint",
                args: [],
                value: parseEther("0.002"),
              },
            ],
          });
          console.log(result);
        } catch (err: unknown) {
          console.log(err);
          if (err instanceof Error) {
            setError(err.message);
          } else if (typeof err === "string") {
            setError(err);
          } else {
            setError("An unknown error occurred during the transaction");
          }
        }
        setUpdateDataCounter(updateDataCounter + 1);
      } else if (status === "not_enough_limit") {
        console.error("Borrow limit reached");
        setCustomMessage("You don't have enough limit to borrow");
        return;
      } else {
        setCustomMessage("Unknown error, reach out to us on Discord");
        return;
      }
    } else if (addressType === "EOA (Externally Owned Account)") {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const signatureValidity = BigInt(1200); // 2 minutes
      try {
        if (!address || borrowNonce == undefined || !selectedNFT) return null;
        const signature = await signTypedDataAsync({
          domain: {
            name: "SmokeSpendingContract",
            version: "1",
            chainId: chainId,
            verifyingContract: getChainLendingAddress(getLZId(chainId)),
          },
          types: {
            Borrow: [
              { name: "borrower", type: "address" },
              { name: "issuerNFT", type: "address" },
              { name: "nftId", type: "uint256" },
              { name: "amount", type: "uint256" },
              { name: "timestamp", type: "uint256" },
              { name: "signatureValidity", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "recipient", type: "address" },
            ],
          },
          primaryType: "Borrow",
          message: {
            borrower: address,
            issuerNFT: getNftAddress() as `0x${string}`,
            nftId: BigInt(selectedNFT.id),
            amount: parseEther(mintCost),
            timestamp,
            signatureValidity,
            nonce: borrowNonce,
            recipient: "0x57148278E856654D2930b4BAD7517a3f261cF67c",
          },
        });
        if (typeof signature === "string") {
          if (!address || !selectedNFT) return null;

          const result = await requestGaslessMinting(
            address,
            selectedNFT.id,
            parseEther(mintCost).toString(),
            timestamp.toString(),
            getLZId(chainId).toString(),
            "0x57148278E856654D2930b4BAD7517a3f261cF67c",
            signature,
            false,
            0
          );
          console.log("MINTING IS HARD", result);
          if (result) {
            console.log("Gasless borrow transaction hash:", result);
            if (result.status === "borrow_approved") {
              setCustomMessage("");
              toast({
                description: "Gasless borrow initiated successfully",
                action: (
                  <ToastAction altText="Try again">
                    {" "}
                    <a
                      href={
                        getChainExplorer(getLZId(chainId)) + "tx/" + result.hash
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} // Prevent toast from closing
                    >
                      View on Explorer
                    </a>
                  </ToastAction>
                ),
              });
            } else {
              setCustomMessage(
                result.status === "not_enough_limit" //1
                  ? "Borrow Failed: You don't have enough borrow limit" //1
                  : result.status === "insufficient_issuer_balance" //2
                  ? "Borrow unavailable right now" //2
                  : result.status === "invalid_signature" //3
                  ? "Your previous txn was still processing, try again. If it repeats, reach out via Discord. " //3
                  : "Unknown error, please reach out via Discord"
              ); //0);
            }
          } else {
            throw new Error(
              "Failed to get transaction hash from gasless borrow"
            );
          }
        }
      } catch {
        console.log("asdf");
      }
    }
  };
  return (
    <div className="fontSizeLarge">
      <Flex justify="center" align="stretch" w="full" px={4}>
        <Flex
          direction={true ? "column" : "row"}
          justify="center"
          alignItems="center"
          gap={2}
          w="full"
          px={40}
          py={8}
        >
          <HoverCard>
            <HoverCardTrigger asChild></HoverCardTrigger>
            <HoverCardContent className="hover-card-content"></HoverCardContent>
          </HoverCard>
          <Separator orientation={true ? "horizontal" : "vertical"} />
          <HStack>
            <Text>ETH</Text>
            <Text>USD</Text>
            <Text>( ETH: $5000 )</Text>
            <Button onClick={handleMint}>{true ? "Mint NFT" : "Create"}</Button>
          </HStack>
        </Flex>{" "}
        {error && (
          <Box
            mt={2}
            maxHeight="100px"
            overflowY="auto"
            w="full"
            borderColor="red.500"
            borderWidth={1}
            borderRadius="md"
            p={2}
          >
            <Text color="red.500">Error: {error}</Text>
          </Box>
        )}
        {customMessage !== "" ? <>Error: {customMessage}</> : ""}
        <Toaster />
      </Flex>
    </div>
  );
};
export default NFTTab;
