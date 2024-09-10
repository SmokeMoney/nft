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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import {
  getChainLendingAddress,
  getChainName,
  getDepositAddress,
  getLegacyId,
  getLZId,
  getNftAddress,
  getWstETHAddress,
} from "../utils/chainMapping";
import { NFT, backendUrl } from "@/CrossChainLendingApp";
import depositRawAbi from "../abi/SmokeDepositContract.abi.json";
import erc20Abi from "../abi/ERC20.abi.json"; // Make sure you have this ABI
import {
  Flex,
  useBreakpointValue,
  Text,
  Box,
  VStack,
  HStack,
} from "@chakra-ui/react";
import axios from "axios";
import { berachainTestnetbArtio } from "viem/chains";

const DepositTabComp: React.FC<{
  selectedNFT: NFT;
  updateDataCounter: number;
  setUpdateDataCounter: any;
  isMobile: boolean;
}> = ({ selectedNFT, updateDataCounter, setUpdateDataCounter, isMobile }) => {
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
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
        args: [getNftAddress(), BigInt(selectedNFT.id), amount],
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
          getNftAddress(),
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
    <Box className="tab-content" p={4}>
      <Flex
        direction={isMobile ? "column" : "row"}
        justifyContent={isMobile ? "" : "center"}
        alignItems={isMobile ? "center" : ""}
        gap={20}
      >
        <Card className="max-w-md" style={{minWidth: isMobile?"50%":""}}>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription className="fontSizeLarge">
              Deposit {chainId === berachainTestnetbArtio.id ? "BERA" : "ETH"}{" "}
              or wstETH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit}>
              <VStack gap={7} alignItems={"flex-start"}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="text-lg py-6 px-4 min-w-[200px]">
                      <span className="mr-2">
                        {getChainName(Number(selectedChain))}
                      </span>
                      <ChevronDownIcon className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    {Object.entries(selectedNFT?.chainLimits ?? {}).map(
                      ([chainId2, _]) => (
                        <DropdownMenuItem
                          key={chainId2}
                          onClick={() => setSelectedChain(chainId2)}
                          className="text-lg py-3"
                        >
                          {getChainName(Number(chainId2))}
                        </DropdownMenuItem>
                      )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div style={{ margin: "10px" }}>
                  <RadioGroup
                    defaultValue={selectedToken}
                    onValueChange={(e) => setSelectedToken(e)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="wstETH" id="option-one" />
                      <Label htmlFor="option-one">wstETH</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ETH" id="option-two" />
                      <Label htmlFor="option-two">
                        {chainId === berachainTestnetbArtio.id ? "BERA" : "ETH"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </VStack>
            </form>
          </CardContent>
          <CardFooter>
            <VStack spacing={2} align="stretch" width="100%">
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
              {error && <Text color="red.500">Error: {error.message}</Text>}
              {isConfirmed && (
                <Text color="green.500">Transaction confirmed!</Text>
              )}
            </VStack>
          </CardFooter>
        </Card>
        <Card className="max-w-2xl" style={{alignSelf: "normal"}}>
          <Box overflowX="auto">
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
                    selectedNFT.wstEthDeposits.find(
                      (d) => d.chainId === chainId
                    )?.amount ?? "0";
                  return (
                    <TableRow
                      key={chainId}
                      className={
                        selectedChain === chainId ? "SelectedBorRow" : ""
                      }
                      onClick={() => setSelectedChain(chainId)}
                    >
                      <TableCell>
                        {getChainName(Number(chainId))}
                      </TableCell>
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
          </Box>
        </Card>
      </Flex>
    </Box>
    // </div>
  );
};

export default DepositTabComp;
