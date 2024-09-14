import React, { useEffect, useMemo, useState } from "react";
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
  useWriteContract,
} from "wagmi";
import { useWriteContracts } from "wagmi/experimental";

import { Switch } from "./ui/switch";
import {
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

const NFTTab: React.FC<{
  selectedNFT: NFT | undefined;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter }) => {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");

  const { writeContractAsync } = useWriteContract();
  const { writeContractsAsync } = useWriteContracts();
  const { address } = useAccount();
  const [addressType, setAddressType] = useState<string | null>(null);

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

  const getBorrowSignature = async () => {
    if (!address || !selectedNFT) return null;

    try {
      const response = await axios.post(`${backendUrl}/api/borrow`, {
        walletAddress: addressToBytes32(address),
        nftId: selectedNFT.id,
        amount: parseEther(mintCost).toString(),
        chainId: getLZId(chainId).toString(),
      });
      return {
        timestamp: response.data.timestamp,
        nonce: response.data.nonce,
        signature: response.data.signature as `0x${string}`,
        status: response.data.status,
      };
    } catch (error) {
      console.error("Error fetching borrow signature:", error);
      return null;
    }
  };

  const handleMint = async () => {
    if (!selectedNFT) return;
    const signatureData = await getBorrowSignature();
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
      if (addressType === "Smart Contract") {
        console.log("inside ");
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
                  false,
                  signature,
                ],
              },
              {
                address:
                  chainId == 84532
                    ? "0x4cC92E7cB498be8C66Fcc1e3d6C8763508E48635"
                    : "0x6eA21415e845c323a98d2D7cbFEf65A285080361",
                abi,
                functionName: "mint",
                args: [],
                value: parseEther('0.002'),
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
      } else if (addressType === "EOA (Externally Owned Account)") {
        console.log("MINTING IS HARD");
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
      </Flex>
    </div>
  );
};

export default NFTTab;
