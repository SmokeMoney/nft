import React, { useMemo } from "react";
import { formatEther, parseEther } from "viem";
import { Flex, HStack, Text } from "@chakra-ui/react";
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";
import { NFT } from "@/CrossChainLendingApp";
import { Button } from "./ui/button";

interface OverviewStripProps {
  ethOrUSD: boolean;
  setEthOrUSD: (value: boolean) => void;
  ethPrice: string;
  totalWethDeposits: bigint;
  totalWstEthDeposits: bigint;
  wstETHRatio: string;
  selectedNFT: NFT | undefined;
  nativeCredit: string;
}

const OverviewStrip: React.FC<OverviewStripProps> = ({
  ethOrUSD,
  setEthOrUSD,
  ethPrice,
  totalWethDeposits,
  totalWstEthDeposits,
  wstETHRatio,
  selectedNFT,
  nativeCredit,
}) => {
  const calculations = useMemo(() => {
    const wstEthInEth =
      (totalWstEthDeposits * BigInt(wstETHRatio)) / parseEther("1");
    const totalDepositsEth = totalWethDeposits + wstEthInEth;
    const totalDepositsUsd =
      (parseEther(ethPrice) * totalDepositsEth) / parseEther("1");
    const totalBorrowed = BigInt(selectedNFT?.totalBorrowPosition ?? 0);
    const totalBorrowedUsd =
      (parseEther(ethPrice) * totalBorrowed) / parseEther("1");
    const availableToBorrowEth =
      (totalDepositsEth * BigInt(90)) / BigInt(100) +
      BigInt(selectedNFT?.nativeCredit ?? "0") -
      totalBorrowed;
    const availableToBorrowUsd =
      (parseEther(ethPrice) * availableToBorrowEth) / parseEther("1");

    return {
      totalDepositsEth,
      totalDepositsUsd,
      totalBorrowed,
      totalBorrowedUsd,
      availableToBorrowEth,
      availableToBorrowUsd,
      wethDeposits: BigInt(
        selectedNFT?.wethDeposits?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount),
          0
        ) ?? 0
      ),
      wstEthDeposits: BigInt(
        selectedNFT?.wstEthDeposits?.reduce(
          (sum, deposit) => sum + parseFloat(deposit.amount),
          0
        ) ?? 0
      ),
    };
  }, [
    ethPrice,
    totalWethDeposits,
    totalWstEthDeposits,
    wstETHRatio,
    selectedNFT,
  ]);

  const formatValue = (value: bigint, decimals: number = 5) =>
    Number(formatEther(value)).toPrecision(decimals);

  return (
    <div className="fontSizeLarge">
      <Flex justify="center" align="stretch" w="full" px={4}>
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="center"
          align="stretch"
          gap={16}
          w="full"
          px={40}
        >
          <HStack justify="stretch">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant={"outline"} className="fontSizeLarge">
                  Available to Withdraw:{" "}
                  {formatValue(
                    ethOrUSD
                      ? calculations.availableToBorrowUsd
                      : calculations.availableToBorrowEth
                  )}
                  {ethOrUSD ? " USD" : " ETH"} (!)
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="hover-card-content">
                <Text>
                  Total Deposits:{" "}
                  {formatValue(
                    ethOrUSD
                      ? calculations.totalDepositsUsd
                      : calculations.totalDepositsEth,
                    6
                  )}
                  {ethOrUSD ? " USD" : " ETH"}
                </Text>
                <Separator orientation="horizontal" />
                <Text>
                  {">"} ETH Deposits: {formatValue(calculations.wethDeposits)}{" "}
                  ETH
                </Text>
                <Separator orientation="horizontal" />
                <Text>
                  {">"} wstETH Deposits:{" "}
                  {formatValue(calculations.wstEthDeposits)} wstETH
                </Text>
                <Separator orientation="horizontal" />
                <Text>
                  {">"} Extra Credits:{" "}
                  {formatValue(BigInt(nativeCredit))} ETH
                </Text>
                <Separator orientation="horizontal" />
                Total Borrowed:{" "}
                {formatValue(
                  ethOrUSD
                    ? calculations.totalBorrowedUsd
                    : calculations.totalBorrowed
                )}
                {ethOrUSD ? " USD" : " ETH"}
              </HoverCardContent>
            </HoverCard>
            <Separator orientation="vertical" />
            <HStack>
              <Text>ETH</Text>
              <Switch checked={ethOrUSD} onCheckedChange={setEthOrUSD} />
              <Text>USD</Text>
              <Text>( ETH: ${Number(ethPrice).toPrecision(6)} )</Text>
            </HStack>
          </HStack>
        </Flex>
      </Flex>
    </div>
  );
};

export default OverviewStrip;
