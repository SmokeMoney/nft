import React, { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HStack, Link, Spinner } from "@chakra-ui/react";

import { backendUrl, NFT_CONTRACT_ADDRESS } from "@/CrossChainLendingApp";
import coreNFTRawAbi from "../abi/CoreNFTContract.abi.json";
import parseDumbAbis from "../abi/parsedCoreNFTAbi";
import axios from "axios";
import { Flex, VStack } from "@chakra-ui/react";
import { Label } from "./ui/label";
import CardFooterContent from "./custom/CardFooterContent";
const coreNFTAbi = parseDumbAbis(coreNFTRawAbi);

interface AddWalletProps {
  nftId: string;
  chainList: string[];
  updateDataCounter: number;
  setUpdateDataCounter: React.Dispatch<React.SetStateAction<number>>;
}

interface AutogasHashes {
  chainId: string;
  hash: string;
}

const AddWalletComp: React.FC<AddWalletProps> = ({
  nftId,
  chainList = [], // Provide a default empty array
  updateDataCounter,
  setUpdateDataCounter,
}) => {
  const { address } = useAccount();
  const [limit, setLimit] = useState("0.01");
  const [autogas, setAutogas] = useState(true);
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [autogasHashes, setAutogasHashes] = useState<AutogasHashes[]>([]);
  const [countdown, setCountdown] = useState(10);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (address) {
      setWalletAddress(address);
    }
  }, [address]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !nftId || chainList.length === 0) return;

    const limits = chainList.map(() => parseEther(limit));
    const autogasConfig = chainList.map(() => autogas);

    writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: coreNFTAbi,
      functionName: "setHigherBulkLimits",
      args: [
        BigInt(nftId),
        walletAddress,
        chainList.map(BigInt),
        limits,
        autogasConfig,
      ],
    });
  };

  const updateLimitsData = async (nftId: string, walletAddress: string) => {
    try {
      const response = await axios.post(`${backendUrl}/api/updatelimits`, {
        nftId: nftId,
        walletAddress: walletAddress,
      });
      return response.data.status === "update_successful";
    } catch (error) {
      console.error("Error updating limits:", error);
      return false;
    }
  };

  const updateBackend = useCallback(async () => {
    if (isConfirmed && walletAddress !== "") {
      try {
        const status = await updateLimitsData(nftId.toString(), walletAddress);
        if (status) {
          setUpdateDataCounter((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Failed to update backend:", error);
      }
    }
  }, [isConfirmed, nftId, walletAddress, setUpdateDataCounter]);

  useEffect(() => {
    if (isConfirmed) {
      const pollInterval = setInterval(() => {
        if (nftId) {
          updateBackend();
        }
      }, 4200);

      return () => clearInterval(pollInterval);
    }
  }, [isConfirmed, updateBackend, nftId]);

  useEffect(() => {
    if (error) {
      console.error("Mint error:", error.message);
    }
  }, [error]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirmed && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      window.location.reload();
    }
    return () => clearTimeout(timer);
  }, [isConfirmed, countdown]);

  const forceRefresh = () => {
    window.location.reload();
  };

  return (
    <Flex justify="center" align="stretch" w="full" px={4}>
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="center"
        align="stretch"
        gap={16}
        w="full"
        px={40}
      >
        <VStack>
          <Card>
            <CardHeader>
              <CardTitle>Approve Your Wallet to Spend</CardTitle>
              <CardDescription>
                You can approve more wallets afterwards. Plus set limits for individual chains. 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="wallet-address">Wallet Address</Label>
                    <Input
                      id="wallet-address"
                      type="text"
                      value={walletAddress || ""}
                      onChange={(e) => setWalletAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="limit">Limit (ETH)</Label>
                    <Input
                      id="limit"
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center">
                    <HStack>
                      <Checkbox
                        id="autogas"
                        checked={autogas}
                        onCheckedChange={(checked) =>
                          setAutogas(checked as boolean)
                        }
                      />
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Label htmlFor="autogas">Enable Autogas (!)</Label>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          Autogas periodically checks your wallet balance and
                          refills if it falls below a threshold. Current set
                          threshold: 0.001 ETH
                        </HoverCardContent>
                      </HoverCard>
                    </HStack>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="mt-4"
                  disabled={
                    !address ||
                    isPending ||
                    isConfirming ||
                    chainList.length === 0
                  }
                >
                  {isPending
                    ? "Confirming..."
                    : isConfirming
                    ? "Processing..."
                    : "Approve"}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <CardFooterContent isConfirmed={isConfirmed} error={error} />
            </CardFooter>
          </Card>
        </VStack>
      </Flex>
    </Flex>
  );
};

export default AddWalletComp;
