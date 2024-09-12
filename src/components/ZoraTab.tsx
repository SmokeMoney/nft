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

import {
  CollectorClientConfig,
  createCollectorClient,
  createCreatorClient,
  CreatorClientConfig,
} from "@zoralabs/protocol-sdk";
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

const ZoraTab: React.FC<{
  selectedNFT: NFT | undefined;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter }) => {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [mintParameters, setMintParameters] = useState<any>(null);
  const [mintOrCreate, setMintOrCreate] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");

  const { writeContractAsync } = useWriteContract();
  const { writeContractsAsync } = useWriteContracts();
  const { address } = useAccount();
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
  const create1155sSmoke = async () => {
    // set to the chain you want to interact with
    const creatorClient = createCreatorClient({
      chainId,
      publicClient,
    } as CreatorClientConfig);

    const { parameters, contractAddress } = await creatorClient.create1155({
      // the contract will be created at a deterministic address
      contract: {
        // contract name
        name: "testContract",
        // contract metadata uri
        uri: "ipfs://DUMMY/contract.json",
      },
      token: {
        tokenMetadataURI: "ipfs://DUMMY/token.json",
      },
      // account to execute the transaction (the creator)
      account: address!,
    });

    console.log(parameters);
    setMintParameters(parameters);
    console.log("THE CONTRAC TDD Y IS : ", contractAddress);
  };

  const initializeCollectorClient = async () => {
    console.log("Minting");
    // set to the chain you want to interact with
    const collectorClient = createCollectorClient({
      chainId,
      publicClient,
    } as CollectorClientConfig);
    if (!address) return;

    const { parameters } = await collectorClient.mint({
      // collection address to mint
      tokenContract: "0x42F843A68c204884599439480FcFEB937f0C84E7",
      // quantity of tokens to mint
      quantityToMint: 1,
      // can be set to 1155, 721, or premint
      mintType: "1155",
      minterAccount: address,

      mintReferral: "0x0C8596Ee50e06Ce710237c9c905D4aB63A132207",
      tokenId: 1n,
    });
    console.log(parameters);

    setMintParameters(parameters);
  };

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
      await writeContractsAsync({
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
            address: chainId == 84532? "0x4cC92E7cB498be8C66Fcc1e3d6C8763508E48635" : "0x6eA21415e845c323a98d2D7cbFEf65A285080361",
            abi,
            functionName: "mint",
            args: [],
          },
        ],
      });
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

  useEffect(() => {
    if (mintOrCreate) {
      initializeCollectorClient();
    } else {
      create1155sSmoke();
    }
  }, [chainId, publicClient, mintOrCreate]);

  const handleCreate = async () => {
    if (mintParameters) {
      try {
        await writeContractAsync(mintParameters);
        setError(null); // Clear any previous errors
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === "string") {
          setError(err);
        } else {
          setError("An unknown error occurred during the transaction");
        }
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
            <Switch checked={mintOrCreate} onCheckedChange={setMintOrCreate} />
            <Text>ETH</Text>
            <Text>USD</Text>
            <Text>( ETH: $5000 )</Text>
            <Button onClick={handleCreate} disabled={!mintParameters}>
              {mintOrCreate ? "Mint" : "Create"}
            </Button>
            <Button onClick={handleMint}>
              {true ? "Mint NFT" : "Create"}
            </Button>
            
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

export default ZoraTab;
