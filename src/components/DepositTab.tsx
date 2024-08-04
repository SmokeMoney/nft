import React, { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
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
  getLegacyId,
  getLZId,
  getWstETHAddress,
} from "../utils/chainMapping";
import { NFT } from "@/CrossChainLendingApp";
import depositRawAbi from "../abi/AdminDepositContract.abi.json";
import parseDumbAbis from "@/abi/parsedCoreNFTAbi";

const DepositTabComp: React.FC<{
  selectedNFT: NFT;
}> = ({ selectedNFT }) => {
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("weth");
  const [selectedChain, setSelectedChain] = useState("");
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const depositAbi = parseDumbAbis(depositRawAbi);

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

  const handleDeposit = async (e: any) => {
    e.preventDefault();
    if (!selectedNFT || !depositAmount) return;

    const amount = parseEther(depositAmount);

    if (selectedToken === "ETH") {
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: depositAbi,
        functionName: "depositETH",
        args: [BigInt(selectedNFT.id), amount],
        value: amount,
      });
    } else {
      // For wstETH, you'd need to approve the contract to spend wstETH first
      // Then call the deposit function
      writeContract({
        address: getChainLendingAddress(getLZId(chainId)),
        abi: depositAbi,
        functionName: "deposit",
        args: [
          getWstETHAddress(Number(selectedChain)),
          BigInt(selectedNFT.id),
          amount,
        ],
      });
    }
  };

  return (
    <div className="tab-content">
      <div style={{ display: "flex", gap: "20px" }}>
        <Card style={{ flex: 1 }}>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription>Deposit ETH or wstETH</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit}>
              <div style={{ marginBottom: "10px" }}>
                <RadioGroup defaultValue="wstETH" onValueChange={(e) => setSelectedToken(e)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wstETH" id="option-one" />
                    <Label htmlFor="option-one">wstETH</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ETH" id="option-two" />
                    <Label htmlFor="option-two">ETH</Label>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chain</TableHead>
                <TableHead>WETH Deposits</TableHead>
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
                      {formatEther(BigInt(wethDeposit))} WETH
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
      </div>
    </div>
  );
};

export default DepositTabComp;
