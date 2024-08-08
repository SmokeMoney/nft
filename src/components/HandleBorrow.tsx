import React, { useState, useEffect } from "react";
import {
  useAccount,
  useSignMessage,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import {
  parseEther,
  keccak256,
  toBytes,
  encodePacked,
  toHex,
  recoverAddress,
} from "viem";

import {
  getChainExplorer,
  getChainLendingAddress,
  getLegacyId,
  getLZId,
} from "../utils/chainMapping";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import lendingRawAbi from "../abi/CrossChainLendingContract.abi.json";
import { Toaster } from "./ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "./ui/toast";
import "../CrossChainLendingApp.css";
import { VStack, Text, HStack, Flex } from "@chakra-ui/react";
import { NFT, backendUrl } from "@/CrossChainLendingApp";


const HandleBorrow: React.FC<{
  selectedNFT: NFT | undefined;
  withdrawAmount: string;
  chainId: number;
  selectedChain: string;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({
  selectedNFT,
  withdrawAmount,
  chainId,
  selectedChain,
  updateDataCounter,
  setUpdateDataCounter,
}) => {
  const [gaslessBorrow, setGaslessBorrow] = useState<boolean>(false);
  const [recentBorrowAmount, setRecentBorrowAmount] = useState<string>("");
  const [customError, setCustomError] = useState<string>("");
  const [borrowNonce, setBorrowNonce] = useState<bigint | undefined>(undefined);
  const [lendingAddress, setLendingAddress] = useState<`0x${string}` | undefined>(undefined);

  const { address } = useAccount();
  const { toast } = useToast();
  const { chains, switchChain } = useSwitchChain();

  useEffect(() => {
    try {
      const address = getChainLendingAddress(getLZId(chainId));
      setLendingAddress(address);
    } catch (error) {
      console.error("Error getting lending address:", error);
      setLendingAddress(undefined);
      toast({
        title: "Unsupported Chain",
        description: "The selected chain is not supported for borrowing.",
        variant: "destructive",
      });
    }
  }, [chainId]);

  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: lendingAddress,
    abi: lendingRawAbi,
    functionName: "getCurrentNonce",
    args: [selectedNFT?.id ? BigInt(selectedNFT.id) : BigInt(0)],
  });

  useEffect(() => {
    if (nonce !== null && nonce !== undefined) {
      setBorrowNonce(BigInt(nonce.toString()));
    } else {
      setBorrowNonce(undefined);
    }
  }, [nonce]);

  useEffect(() => {
    if (selectedNFT?.id) {
      refetchNonce();
    } else {
      setBorrowNonce(undefined);
    }
  }, [selectedNFT?.id, refetchNonce]);

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  const { data: hash, isPending, error, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  const getBorrowSignature = async () => {
    if (!address || !selectedNFT || !withdrawAmount) return null;

    try {
      const response = await axios.post(`${backendUrl}/api/borrow`, {
        walletAddress: address,
        nftId: selectedNFT.id,
        amount: parseEther(withdrawAmount).toString(),
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

  const requestGaslessBorrow = async (
    timestamp: string,
    userSignature: string
  ) => {
    if (!address || !selectedNFT || !withdrawAmount) return null;

    try {
      const response = await axios.post(`${backendUrl}/api/borrow-gasless`, {
        signer: address,
        nftId: selectedNFT.id,
        amount: parseEther(withdrawAmount).toString(),
        timestamp: timestamp,
        chainId: getLZId(chainId).toString(),
        recipient: address,
        userSignature: userSignature,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching borrow signature:", error);
      return null;
    }
  };

  const { signMessageAsync } = useSignMessage();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNFT || Number(withdrawAmount) <= 0) {
      return;
    }

    if (gaslessBorrow && borrowNonce !== undefined) {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const messageHash = keccak256(
        encodePacked(
          ["address", "uint256", "uint256", "uint256", "uint256", "uint256"],
          [
            address as `0x${string}`,
            BigInt(selectedNFT.id),
            parseEther(withdrawAmount),
            timestamp,
            borrowNonce,
            BigInt(getLZId(chainId)),
          ]
        )
      );
      try {
        const signature = await signMessageAsync({
          message: { raw: toBytes(messageHash) },
        });
        if (typeof signature === "string") {
          toast({
            title: "Processing gasless borrow...",
            description: "processing",
          });
          const result = await requestGaslessBorrow(
            timestamp.toString(),
            signature
          );
          toast({ description: "processing" });

          setUpdateDataCounter(updateDataCounter + 1);
          if (result) {
            console.log("Gasless borrow transaction hash:", result);
            result.status === "borrow_approved"
              ? toast({
                  description: "Gasless borrow initiated successfully",
                  action: (
                    <ToastAction altText="Try again">
                      {" "}
                      <a
                        href={
                          getChainExplorer(getLZId(chainId)) +
                          "tx/" +
                          result.hash
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent toast from closing
                      >
                        View on Explorer
                      </a>
                    </ToastAction>
                  ),
                })
              : toast({
                  description:
                    result.status === "not_enough_limit"
                      ? result.status === "insufficient_issuer_balance"
                        ? "Borrow unavailable right now"
                        : "Borrow Failed: You don't have enough borrow limit"
                      : "Unknown error, please reach out via Discord",
                });
          } else {
            throw new Error(
              "Failed to get transaction hash from gasless borrow"
            );
          }
        } else {
          throw new Error("Failed to sign message");
        }
        // Wait for the isPending state to be updated
      } catch (signError) {
        toast({ description: "Signing" });
        if (signError instanceof Error) {
          if (signError.message.includes("User rejected the request")) {
            toast({ description: "Signature request was rejected" });
          } else {
            toast({
              description: "Failed to sign message: " + signError.message,
            });
            console.log(signError.message);
          }
        } else {
          toast({ description: "An unknown error occurred during signing" });
        }
        return;
      }
    } else {
      const signatureData = await getBorrowSignature();
      if (!signatureData) {
        console.error("Failed to get borrow signature");
        return;
      }
      console.log(signatureData);

      const {
        timestamp,
        nonce: signatureNonce,
        signature,
        status,
      } = signatureData;

      if (status === "borrow_approved") {
        writeContract({
          address: getChainLendingAddress(getLZId(chainId)),
          abi: lendingRawAbi,
          functionName: "borrow",
          args: [
            BigInt(selectedNFT.id),
            parseEther(withdrawAmount),
            BigInt(timestamp),
            BigInt(signatureNonce),
            signature,
          ],
        });
        setUpdateDataCounter(updateDataCounter + 1);
      } else if (status === "not_enough_limit") {
        console.error("Borrow limit reached");
        setCustomError("You don't have enough limit to borrow");
        return;
      } else {
        setCustomError("Unknown error, reach out to us on Discord");
        return;
      }
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setRecentBorrowAmount(withdrawAmount);
    }
    if (error) {
      console.log(error.message);
    }
  }, [isConfirmed, withdrawAmount, error]);

  return (
    // <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
    <Flex alignContent="left">
      <VStack align="left">
        <HStack>
          <Text>Gasless</Text>
          <> </>
          <Checkbox
            checked={gaslessBorrow}
            onCheckedChange={() => setGaslessBorrow(!gaslessBorrow)}
          />
        </HStack>
        {getLegacyId(Number(selectedChain)) === chainId ? (
          <form onSubmit={handleSubmit}>
            <Button
              className="fontSizeLarge"
              type="submit"
              disabled={
                Number(withdrawAmount) === 0 || isPending || isConfirming
              }
            >
              {isPending
                ? "Waiting..."
                : isConfirming
                ? "Confirming..."
                : "Withdraw"}
            </Button>
          </form>
        ) : (
          <Button
            className="fontSizeLarge"
            onClick={() => switchToChain(getLegacyId(Number(selectedChain)))}
          >
            Switch Chain
          </Button>
        )}
        <Text>
          {error && (
            <>
              Error:{" "}
              {error.message.includes("ERC20: burn amount exceeds balance")
                ? "Borrow unavailable right now"
                : "Unknown reason"}
            </>
          )}
          {customError !== "" ? <>Error: {customError}</> : ""}
          {isConfirming && <>Waiting for confirmation...</>}
          {isConfirmed && (
            <>
              Borrowed {recentBorrowAmount},{" "}
              <a
                href={getChainExplorer(getLZId(chainId)) + "tx/" + hash}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "blue", textDecoration: "underline" }}
                onClick={(e) => e.stopPropagation()} // Prevent toast from closing
              >
                View on Explorer
              </a>
            </>
          )}
        </Text>
      </VStack>
      <Toaster />
    </Flex>
    // </div>
  );
};

export default HandleBorrow;
