import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import parseDumbAbis from "@/abi/parsedSpendingAbi";

import spendingRawAbi from "../abi/SmokeSpendingContract.abi.json";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSignTypedData,
} from "wagmi";
import { NFT } from "@/types";
import { getBorrowSignature, requestGaslessMinting } from "@/utils/borrowUtils";
import { addressToBytes32 } from "@/utils/addressConversion";
import { parseEther } from "viem";
import {
  getChainExplorer,
  getChainLendingAddress,
  getLZId,
  getNftAddress,
} from "@/utils/chainMapping";
import { useWriteContracts } from "wagmi/experimental";
import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { useToast } from "./ui/use-toast";
import { ToastAction } from "./ui/toast";

interface NFTDemo {
  id: string;
  name: string;
  image: string;
  chain: string;
}

const NFTList: React.FC<{
  nfts: NFTDemo[];
  selectedNFT: NFT | undefined;
  updateDataCounter: number;
  setUpdateDataCounter: any;
  borrowNonce: bigint | undefined;
}> = ({
  nfts,
  selectedNFT,
  updateDataCounter,
  setUpdateDataCounter,
  borrowNonce,
}) => {
  const [customMessage, setCustomMessage] = useState<string>("");

  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<string | null>(null);

  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const mintCost = "0.002";
  const { writeContractsAsync } = useWriteContracts();
  const { signTypedDataAsync } = useSignTypedData();
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

  const spendingAbi = parseDumbAbis(spendingRawAbi);
  const handleMint = async () => {
    console.log("asdf");
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
    <Box>
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
      {customMessage !== "" && (
        <Text color="red.500">Error: {customMessage}</Text>
      )}
      <SimpleGrid columns={3} spacing={4}>
        {nfts.map((nft) => (
          // <Box key={nft.id} borderWidth={1} borderRadius="lg" overflow="hidden">
          <div
            key={nft.id}
            className="flex items-center flex-col p-4 border rounded-lg"
            style={{ justifyContent: "space-evenly" }}
          >
            <img
              src={nft.image}
              alt={nft.name}
              // style={{ width: "100%", height: "200px", objectFit: "cover" }}
              className="w-64 h-64 rounded-lg"
            />
            <Text fontSize="sm" mb={2} p={6}>
              Smoke on {nft.chain}
            </Text>
            <Button onClick={() => handleMint()}>Mint</Button>
          </div>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default NFTList;
