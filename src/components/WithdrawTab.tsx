import React, { useState, useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { formatEther, parseEther } from "viem";
import { Address } from "viem";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Flex,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  VStack,
} from "@chakra-ui/react";
import HandleBorrow from "./HandleBorrow";
import { getChainName, getLZId } from "../utils/chainMapping";
import { chains } from "../utils/chainMapping";
import { NFT, PositionData } from "../CrossChainLendingApp";

interface WithdrawTabProps {
  selectedNFT: NFT | undefined;
  address: Address | undefined;
  ethBalance: string;
  updateDataCounter: number;
  setUpdateDataCounter: React.Dispatch<React.SetStateAction<number>>;
  totalWethDeposits: bigint;
  totalWstEthDeposits: bigint;
  wstETHRatio: string;
}

const WithdrawTab: React.FC<WithdrawTabProps> = ({
  selectedNFT,
  address,
  ethBalance,
  updateDataCounter,
  setUpdateDataCounter,
  totalWethDeposits,
  totalWstEthDeposits,
  wstETHRatio,
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [walletBorrowPositions, setWalletBorrowPositions] = useState<PositionData[]>([]);
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [selectChain, setSelectedChain] = useState<string>(getLZId(chainId).toString() ?? "1");
  const [supportedChain, setSupportedChain] = useState<boolean>(false);

  useEffect(() => {
    setWalletBorrowPositions(
      selectedNFT?.borrowPositions?.find(
        (position) => position.walletAddress === address
      )?.borrowPositions ?? []
    );
  }, [selectedNFT, address]);

  useEffect(() => {
    if (chainId) {
      const legacyId = getLZId(chainId);
      setSupportedChain(!!legacyId && chains.some(chain => chain.legacyId === legacyId));
    } else {
      setSupportedChain(false);
    }
  }, [chainId]);

  const switchToChain = async (newChainId: number) => {
    switchChain({ chainId: newChainId });
  };

  return (
    <div className="tab-content">
      <VStack align="stretch" spacing={6}>
        {selectedNFT && (
          <div>
            {supportedChain ? (
              <Flex
                direction={{ base: "column", md: "row" }}
                justify="center"
                align="stretch"
                gap={16}
                padding={10}
                w="full"
                px={400}
              >
                <Box flex={1} maxW={{ base: "full", md: "800px" }}>
                  <Card className="fontSizeLarge">
                    <CardHeader>
                      <CardTitle>Withdraw</CardTitle>
                      <CardDescription className="fontSizeLarge">
                        Withdraw {selectChain === "40291" ? "BERA" : "ETH"} on{" "}
                        {getChainName(Number(selectChain))}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        className="fontSizeLarge"
                        type="number"
                        placeholder="Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                    </CardContent>
                    <CardFooter>
                      <HandleBorrow
                        selectedNFT={selectedNFT}
                        withdrawAmount={withdrawAmount}
                        chainId={chainId}
                        selectedChain={selectChain}
                        updateDataCounter={updateDataCounter}
                        setUpdateDataCounter={setUpdateDataCounter}
                      />
                    </CardFooter>
                  </Card>
                </Box>
                <Box flex={2}>
                  <Card>
                    <Table className="fontSizeLarge">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chain</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedNFT.chainLimits).map(
                          ([chainId2, limit]) => (
                            <TableRow
                              key={chainId2}
                              className={
                                selectChain === chainId2
                                  ? "SelectedBorRow"
                                  : ""
                              }
                              onClick={() => setSelectedChain(chainId2)}
                            >
                              <TableCell>
                                {getChainName(Number(chainId2))}
                              </TableCell>
                              <TableCell>
                                {Number(
                                  formatEther(
                                    ((totalWethDeposits +
                                      (totalWstEthDeposits *
                                        BigInt(wstETHRatio)) /
                                        parseEther("1")) *
                                      BigInt(90)) /
                                      BigInt(100) -
                                      BigInt(
                                        selectedNFT?.totalBorrowPosition ?? 0
                                      )
                                  )
                                ) >
                                Number(
                                  formatEther(
                                    BigInt(limit) -
                                      BigInt(
                                        walletBorrowPositions.find(
                                          (position) =>
                                            position.chainId === chainId2
                                        )?.amount ?? "0"
                                      )
                                  )
                                )
                                  ? Number(
                                      formatEther(
                                        BigInt(limit) -
                                          BigInt(
                                            walletBorrowPositions.find(
                                              (position) =>
                                                position.chainId === chainId2
                                            )?.amount ?? "0"
                                          )
                                      )
                                    ).toPrecision(5)
                                  : Number(
                                      formatEther(
                                        ((totalWethDeposits +
                                          (totalWstEthDeposits *
                                            BigInt(wstETHRatio)) /
                                            parseEther("1")) *
                                          BigInt(90)) /
                                          BigInt(100) -
                                          BigInt(
                                            selectedNFT?.totalBorrowPosition ??
                                              0
                                          )
                                      )
                                    ).toPrecision(5)}{" "}
                                {chainId2 === "40291" ? "BERA" : "ETH"}
                              </TableCell>
                              <TableCell>5%</TableCell>
                              <TableCell>
                                {chainId2 === getLZId(chainId).toString()
                                  ? ethBalance
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </Box>
              </Flex>
            ) : (
              <VStack>
                <Box flex={2}>
                  <Card>
                    <CardTitle>Chain not supported</CardTitle>
                    <CardHeader>Supported Chains</CardHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chain</TableHead>
                          <TableHead>Switch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chains.map((chain) => (
                          <TableRow key={chain.legacyId}>
                            <TableCell>
                              <Text>{chain.name}</Text>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => switchToChain(chain.legacyId)}
                              >
                                Switch Chain
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </Box>
              </VStack>
            )}
          </div>
        )}
      </VStack>
    </div>
  );
};

export default WithdrawTab;