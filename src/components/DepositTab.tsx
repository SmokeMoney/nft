import React, { useState, useEffect } from "react";
import { Address, formatEther, parseEther } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
  useReadContract,
  useAccount,
} from "wagmi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  getChainLendingAddress,
  getChainName,
  getDepositAddress,
  getLegacyId,
  getLZId,
  getWstETHAddress,
} from "../utils/chainMapping";
import { NFT } from "@/CrossChainLendingApp";
import depositRawAbi from "../abi/AdminDepositContract.abi.json";
import erc20Abi from "../abi/ERC20.abi.json"; // Make sure you have this ABI
import { Flex } from "@chakra-ui/react";
import axios from "axios";
import { berachainTestnetbArtio } from "viem/chains";

const backendUrl = import.meta.env.VITE_BACKEND_URL!;
const DepositTabComp: React.FC<{
  selectedNFT: NFT;
  updateDataCounter: number;
  setUpdateDataCounter: any;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter }) => {
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("wstETH");
  const [selectedChain, setSelectedChain] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const chainId = useChainId();
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setSelectedChain(getLZId(chainId).toString());
  }, [chainId]);

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  // Check if the contract is approved to spend wstETH
  const { data: allowance } = useReadContract({
    address: getWstETHAddress(getLZId(chainId)),
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as Address, getDepositAddress(getLZId(chainId))], // owner, spender
  }) as { data: bigint | undefined; isError: boolean };

  useEffect(() => {
    if (allowance !== undefined && depositAmount) {
      try {
        const parsedAmount = parseEther(depositAmount);
        setIsApproved(allowance >= parsedAmount);
      } catch (error) {
        console.error("Error parsing deposit amount:", error);
        setIsApproved(false);
      }
    } else {
      setIsApproved(false);
    }
  }, [allowance, depositAmount]);

  const handleApprove = async () => {
    if (!depositAmount) return;

    writeContract({
      address: getWstETHAddress(getLZId(chainId)),
      abi: erc20Abi,
      functionName: "approve",
      args: [getDepositAddress(getLZId(chainId)), parseEther(depositAmount)], // spender, amount
    });
  };

  const updateDeposit = async (nftId: string) => {
    const response = await axios.post(`${backendUrl}/api/updatedeposit`, {
      nftId: nftId,
      chainId: getLZId(chainId).toString(),
    });
    return response.data.status === "update_successful";
  };

  const handleDeposit = async (e: any) => {
    e.preventDefault();
    if (!selectedNFT || !depositAmount) return;

    const amount = parseEther(depositAmount);

    if (selectedToken === "ETH") {
      writeContract({
        address: getDepositAddress(getLZId(chainId)),
        abi: depositRawAbi,
        functionName: "depositETH",
        args: [BigInt(selectedNFT.id), amount],
        value: amount,
      });
    } else {
      // For wstETH, you'd need to approve the contract to spend wstETH first
      // Then call the deposit function
      writeContract({
        address: getDepositAddress(getLZId(chainId)),
        abi: depositRawAbi,
        functionName: "deposit",
        args: [
          getWstETHAddress(Number(selectedChain)),
          BigInt(selectedNFT.id),
          amount,
        ],
      });
    }
  };

  useEffect(() => {
    const updateBackend = async () => {
      if (isConfirmed) {
        const updateStatus = await updateDeposit(selectedNFT.id);
        if (updateStatus) {
          setUpdateDataCounter(updateDataCounter + 1);
        }
      }
    };
    updateBackend();
  }, [isConfirmed, isConfirming]);

  return (
    <div className="tab-content">
      {/* <div style={{ display: "flex", gap: "20px" }}> */}
      <Flex gap={16} px={400} paddingTop={10}>
        <Card style={{ flex: 1 }}>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription className="fontSizeLarge">
              Deposit {chainId === berachainTestnetbArtio.id ? "BERA" : "ETH"} or wstETH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit}>
              <div style={{ marginBottom: "10px" }}>
                <RadioGroup
                  defaultValue="wstETH"
                  onValueChange={(e) => setSelectedToken(e)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wstETH" id="option-one" />
                    <Label htmlFor="option-one">wstETH</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ETH" id="option-two" />
                    <Label htmlFor="option-two">{chainId === berachainTestnetbArtio.id ? "BERA" : "ETH"}</Label>
                  </div>
                </RadioGroup>
              </div>
              <Input
                type="number"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </form>
          </CardContent>
          <CardFooter>
            {getLegacyId(Number(selectedChain)) === chainId ? (
              selectedToken === "wstETH" &&
              !isApproved &&
              Number(depositAmount) !== 0 ? (
                <Button
                  onClick={handleApprove}
                  disabled={isPending || isConfirming}
                >
                  {isPending
                    ? "Approving..."
                    : isConfirming
                    ? "Processing..."
                    : "Approve wstETH"}
                </Button>
              ) : (
                <Button
                  onClick={handleDeposit}
                  disabled={
                    isPending || isConfirming || Number(depositAmount) === 0
                  }
                >
                  {isPending
                    ? "Confirming..."
                    : isConfirming
                    ? "Processing..."
                    : "Deposit"}
                </Button>
              )
            ) : (
              <Button
                onClick={() =>
                  switchToChain(getLegacyId(Number(selectedChain)))
                }
              >
                Switch Chain
              </Button>
            )}
          </CardFooter>
          {error && <div>Error: {error.message}</div>}
          {isConfirmed && <div>Transaction confirmed!</div>}
        </Card>

        <Card style={{ flex: 2 }}>
          <Table className="fontSizeLarge">
            <TableHeader>
              <TableRow>
                <TableHead>Chain</TableHead>
                <TableHead>ETH Deposits</TableHead>
                <TableHead>wstETH Deposits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(selectedNFT.chainLimits).map(([chainId, _]) => {
                const wethDeposit =
                  selectedNFT.wethDeposits.find((d) => d.chainId === chainId)
                    ?.amount ?? "0";
                const wstEthDeposit =
                  selectedNFT.wstEthDeposits.find((d) => d.chainId === chainId)
                    ?.amount ?? "0";
                return (
                  <TableRow
                    key={chainId}
                    className={
                      selectedChain === chainId ? "SelectedBorRow" : ""
                    }
                    onClick={() => setSelectedChain(chainId)}
                  >
                    <TableCell>{getChainName(Number(chainId))}</TableCell>
                    <TableCell>
                      {formatEther(BigInt(wethDeposit))}{" "}
                      {chainId === "40291" ? "BERA" : "ETH"}
                    </TableCell>
                    <TableCell>
                      {formatEther(BigInt(wstEthDeposit))} wstETH
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Flex>
    </div>
    // </div>
  );
};

export default DepositTabComp;
