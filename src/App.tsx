import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button, Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import {
  useChainId,
  useSwitchChain,
  useAccount,
  usePublicClient,
  useSignTypedData,
} from "wagmi";
import spendingRawAbi from "./abi/SmokeSpendingContract.abi.json";
import parseDumbAbis from "@/abi/parsedSpendingAbi";
import { config } from "./wagmi";
import axios from "axios";
import { addressToBytes32 } from "./utils/addressConversion";
import { getBalance } from "@wagmi/core";
import { formatEther, formatUnits, parseEther } from "viem";
import { getBorrowSignature, requestGaslessMinting } from "@/utils/borrowUtils";
import {
  getChainExplorer,
  getChainLendingAddress,
  getLZId,
  getNftAddress,
} from "@/utils/chainMapping";
import {
  useWriteContracts,
  useCallsStatus,
  useShowCallsStatus,
} from "wagmi/experimental";
import DataNonce from "./components/DataNonce";
import { useToast } from "@chakra-ui/react";

export const backendUrl = import.meta.env.VITE_BACKEND_URL!;

const nfts = [
  {
    id: "1",
    name: "BASE NFT",
    image: "/smoke_base.png",
    chain: "Base",
    nftAddress: "0x3bcd37Ea3bB69916F156CB0BC954309bc7B7b4AC",
    chainId: 84532,
  },
  {
    id: "2",
    name: "ARB NFT",
    image: "/smoke_arb.png",
    chain: "Arbitrum",
    nftAddress: "0x475A999e1D6A50D483A207fC8D52B583669DB90c",
    chainId: 421614,
  },
  {
    id: "3",
    name: "OPT NFT",
    image: "/smoke_opt.png",
    chain: "Optimism",
    nftAddress: "0x269488db82d434dC2E08e3B6f428BD1FF90C4325",
    chainId: 11155420,
  },
  {
    id: "4",
    name: "ETH NFT",
    image: "/smoke_eth.png",
    chain: "Ethereum",
    nftAddress: "0xe06883A0caaFe865F23597AdEDC7af4cBEaBA7E2",
    chainId: 11155111,
  },
  {
    id: "5",
    name: "ZORA 3NFT",
    image: "/smoke_zora.png",
    chain: "Zora",
    nftAddress: "0x9b6f6F895a011c2C90857596A1AE2f537B097f52",
    chainId: 999999999,
  },
  {
    id: "6",
    name: "BLAST NFT",
    image: "/smoke_blast.png",
    chain: "Blast",
    nftAddress: "0x244a4b538171D0b5b7f8Ff70812CaE1d43886183",
    chainId: 168587773,
  },
];

const borrowAndMintAddresses = [
  { id: "1", address: "0xA27aA06097Bc9276dCA245C66911A238498445F5" },
  { id: "2", address: "0x0B3dc9af23C391Ca43061b6A5ECDD67c4abA2C0e" },
  { id: "3", address: "0xBF9CB56e2e927AEF651723d07e1eC95dC3F9764d" },
  { id: "4", address: "0x30C0fFa5eC03E33F8c60e2d62f97A0d03bE4aFcf" },
  { id: "5", address: "0x3a771f2D212979363715aB06F078F0Fb4d6e96Cb" },
  { id: "6", address: "0x3431a7631d6fee6a16E10ef3cCd8aAb06E58D555" },
];

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

export interface PositionData {
  chainId: string;
  amount: string;
}

export interface WalletBorrowPosition {
  walletAddress: string;
  borrowPositions: PositionData[];
}

const fetchWalletData = async (address: string) => {
  try {
    const response = await axios.get(`${backendUrl}/api/walletdata/${address}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error === "Wallet not found") {
        console.log("Wallet not found");
        return [];
      }
    }
    console.error("Error fetching wallet data:", error);
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

function areNFTsDifferent(nft1: NFT, nft2: NFT): boolean {
  return JSON.stringify(nft1) !== JSON.stringify(nft2);
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

function App() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const toast = useToast();

  const { signTypedDataAsync } = useSignTypedData();
  const {
    data: hash,
    isPending,
    error,
    writeContractsAsync,
  } = useWriteContracts();

  const [walletActionNeeded, setWalletActionNeeded] = useState<false | number>(
    false
  );

  const [addressType, setAddressType] = useState<string | null>(null);
  const [recentHash, setRecentHash] = useState<string>("");
  const [listNFTs, setListNFTs] = useState<NFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFT>();
  const [ethBalance, setEthBalance] = useState<string>("");
  const [supportedChain, setSupportedChain] = useState<boolean>(false);
  const [updateDataCounter, setUpdateDataCounter] = useState<number>(0);
  const [minting, setMinting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [borrowNonce, setBorrowNonce] = useState<bigint | undefined>(undefined);
  const [lendingAddress, setLendingAddress] = useState<
    `0x${string}` | undefined
  >(undefined);

  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  const mintCost = "0.002";
  const spendingAbi = parseDumbAbis(spendingRawAbi);

  useEffect(() => {
    const checkAddressType = async () => {
      console.log("checking address type");
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
    setRecentHash("");
  }, [address, chainId, publicClient]);

  useEffect(() => {
    const fetchNFTsAndBalance = async () => {
      console.log("fetching");
      if (isConnected && address) {
        const fetchedNFTs: NFT[] = await fetchWalletData(
          addressToBytes32(address)
        );
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
        if (
          selectedNFT &&
          fetchedNFTs.length > 0 &&
          areNFTsDifferent(
            selectedNFT,
            fetchedNFTs.find((nft) => nft.id === selectedNFT.id) as NFT
          )
        ) {
          console.log("Setting new selected NFT: ASFbsajidfb", fetchedNFTs);
          setSelectedNFT(fetchedNFTs.find((nft) => nft.id === selectedNFT.id));
        }
      } else {
        console.log("Conditions not met for setting NFT");
      }
      if (address) {
        const freshBalance = await getBalance(config, { address: address });
        setEthBalance(Number(formatEther(freshBalance.value)).toPrecision(4));
      }
    };
    fetchNFTsAndBalance();
  }, [isConnected, address, selectedNFT, updateDataCounter]);

  useEffect(() => {
    const balanceUpdate = async () => {
      if (address) {
        const freshBalance = await getBalance(config, { address: address });
        setEthBalance(Number(formatEther(freshBalance.value)).toPrecision(4));
      }
    };
    balanceUpdate();
  }, [isConnected, address, chainId]);

  const handleMint = async (index: number) => {
    console.log("handling mint, index:", index);
    setWalletActionNeeded(index);
    console.log("asdf");

    if (addressType === "Smart Contract" && chainId == 84532) {
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
                address: nfts[0]["nftAddress"] as `0x${string}`,
                abi,
                functionName: "mint",
                args: [],
                value: parseEther("0.002"),
              },
            ],
          });
          const { data: callsStatus } = useCallsStatus({
            result,
            query: {
              refetchInterval: (data) =>
                data.state.data?.status === "CONFIRMED" ? false : 1000,
            },
          });
          console.log(callsStatus);
          setMinting(true);
        } catch (err: unknown) {
          console.log(err);
          console.log("in here");
          if (err instanceof Error) {
            setErrorMessage(err.message);
          } else if (typeof err === "string") {
            setErrorMessage(err);
          } else {
            setErrorMessage("An unknown error occurred during the transaction");
          }
        }
        setUpdateDataCounter(updateDataCounter + 1);
      } else if (status === "not_enough_limit") {
        console.error("Borrow limit reached");
        toast({
          title: "error",
          description: "You don't have enough limit to borrow",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
        return;
      } else {
        setCustomMessage("Unknown error, reach out to us on Discord");
        toast({
          title: "error",
          description: "Unknown error, reach out to us on Discord",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
        return;
      }
    } else if (addressType === "EOA (Externally Owned Account)") {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      // const borrowAndMintAddress = "0xA27aA06097Bc9276dCA245C66911A238498445F5";
      // const simpleNFTAddress = "0x3bcd37Ea3bB69916F156CB0BC954309bc7B7b4AC";
      console.log("indnex", index);
      const simpleNFTAddress = nfts[index]["nftAddress"];
      const borrowAndMintAddress = borrowAndMintAddresses[index][
        "address"
      ] as `0x${string}`;
      console.log(borrowAndMintAddress);
      console.log("simpleNFTAddress", simpleNFTAddress);
      const signatureValidity = BigInt(1200); // 2 minutes
      console.log("signatureValidity", signatureValidity);
      try {
        console.log("borrowNonce", borrowNonce);
        console.log("address", address);
        console.log("selectedNFT", selectedNFT);
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
            recipient: borrowAndMintAddress,
          },
        });
        if (typeof signature === "string") {
          if (!address || !selectedNFT) return null;
          setMinting(true);
          const result = await requestGaslessMinting(
            address,
            selectedNFT.id,
            parseEther(mintCost).toString(),
            timestamp.toString(),
            getLZId(chainId).toString(),
            borrowAndMintAddress,
            signature,
            false,
            0,
            simpleNFTAddress
          );
          console.log("MINTING IS HARD", result);
          if (result) {
            console.log("Gasless borrow transaction hash:", result);

            if (result.status === "borrow_approved") {
              console.log("walletActionNeeded", walletActionNeeded);
              setCustomMessage("");
              setRecentHash(result.hash);
              setTxHashes({
                ...txHashes,
                [chainId]: result.hash,
              });
            } else {
              const description =
                result.status === "not_enough_limit" //1
                  ? "Borrow Failed: You don't have enough borrow limit" //1
                  : result.status === "insufficient_issuer_balance" //2
                  ? "Borrow unavailable right now" //2
                  : result.status === "invalid_signature" //3
                  ? "Your previous txn was still processing, try again. If it repeats, reach out via Discord. " //3
                  : "Unknown error, please reach out via Discord";
              toast({
                title: "Something went wrong",
                description,
                status: "error",
                duration: 9000,
                isClosable: true,
                variant: "subtle",
                position: "bottom-right",
              });
            }
          } else {
            throw new Error(
              "Failed to get transaction hash from gasless borrow"
            );
          }
        }
      } catch (e) {
        console.log("error asdf", e);
        toast({
          title: "Something went wrong",
          status: "error",
          duration: 9000,
          isClosable: true,
          variant: "subtle",
          position: "bottom-right",
        });
      } finally {
        setMinting(false);
        setWalletActionNeeded(false);
      }
    }
  };

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  const getButtonText = (index: number) => {
    if (txHashes[nfts[index].chainId]) {
      return "view tx";
    } else {
      return walletActionNeeded === index
        ? minting
          ? "minting..."
          : "confirm in wallet"
        : "mint";
    }
  };

  const getExplorerLink = (index: number) => {
    window.open(
      getChainExplorer(getLZId(nfts[index].chainId)) +
        "tx/" +
        txHashes[nfts[index].chainId],
      "_blank"
    );
  };

  return (
    <Box p="6" bg="gray.800">
      <Flex
        justifyContent={["center", "space-between"]}
        alignItems="center"
        maxW={["100%", "720px", "1120px", "1400px"]}
        margin="0 auto"
        mb="6"
        flexDirection={["column", "row"]}
      >
        <Box color="whitesmoke" mb={["6", 0]}>
          <Text
            fontWeight="600"
            fontSize="3xl"
            as="h1"
            textAlign={["center", "initial"]}
          >
            Smoke NFTs
          </Text>
          <Text fontSize="xl" textAlign={["center", "initial"]}>
            mint without gas or funds on any chain
          </Text>
        </Box>
        <ConnectButton />
      </Flex>
      <SimpleGrid
        columns={[1, 3, 3]}
        spacing="6"
        maxW={["100%", "720px", "1120px", "1400px"]}
        margin="0 auto"
      >
        {nfts.map((nft, index) => (
          <Box
            key={nft.id}
            className="flex items-center flex-col bg-black rounded-xl"
            p="3"
            style={{ justifyContent: "space-evenly" }}
          >
            <img
              src={nft.image}
              alt={nft.name}
              style={{ objectFit: "cover" }}
              className="w-fit h-fit rounded-lg"
            />
            <Flex
              mt={2}
              alignItems="center"
              justifyContent="space-between"
              width="full"
            >
              <Text color="whitesmoke" fontSize={["lg", "xl"]} fontWeight={600}>
                Smoke on <i>{nft.chain}</i>
              </Text>
              {nft.chainId === chainId || txHashes[nft.chainId] ? (
                <Button
                  onClick={() =>
                    txHashes[nft.chainId]
                      ? getExplorerLink(index)
                      : handleMint(index)
                  }
                  isDisabled={
                    nft.chainId == 11155111 || walletActionNeeded === index
                  }
                  colorScheme="yellow"
                >
                  {getButtonText(index)}
                </Button>
              ) : (
                <Button
                  className="fontSizeLarge"
                  onClick={() => switchToChain(nft.chainId)}
                  isDisabled={nft.chainId === 11155111}
                  colorScheme="whiteAlpha"
                  opacity="0.6"
                >
                  switch chain
                </Button>
              )}
            </Flex>
          </Box>
        ))}
      </SimpleGrid>
      <DataNonce
        selectedNFT={selectedNFT}
        lendingAddress={lendingAddress}
        setLendingAddress={setLendingAddress}
        setBorrowNonce={setBorrowNonce}
      />
    </Box>
  );
}

export default App;
