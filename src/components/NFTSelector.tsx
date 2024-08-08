import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HStack, Text } from "@chakra-ui/react";
import { NFT } from "../CrossChainLendingApp";
// import MintNFTButton from "../CrossChainLendingApp"; // Assuming you've also separated MintNFTButton into its own component

interface NFTSelectorProps {
  listNFTs: NFT[];
  selectedNFT: NFT | undefined;
  setSelectedNFT: React.Dispatch<React.SetStateAction<NFT | undefined>>;
}

const NFTSelector: React.FC<NFTSelectorProps> = ({
  listNFTs,
  selectedNFT,
  setSelectedNFT,
}) => {

  return (
    <HStack gap={10}>
      <Text className="fontSizeLarge">Your Smoke NFT:</Text>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="fontSizeLarge" variant={"secondary"}>
            NFT ID: {selectedNFT?.id.toString()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Select NFT</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={selectedNFT?.id.toString()}
            onValueChange={(newValue) => {
              const selectedNFTObject = listNFTs.find(
                (nft) => nft.id === newValue
              );
              if (selectedNFTObject) {
                setSelectedNFT(selectedNFTObject);
              }
            }}
          >
            {listNFTs.map((nft) => (
              <DropdownMenuRadioItem key={nft.id} value={nft.id}>
                NFT ID: {nft.id} {nft.owner ? "(owner)" : ""}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </HStack>
  );
};

export default NFTSelector;