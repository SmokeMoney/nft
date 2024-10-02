import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button, Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import { useChainId, useSwitchChain } from "wagmi";

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

function App() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleMint = (index: number) => {
    console.log("handle mint", index);
  };

  const switchToChain = async (newChainId: any) => {
    switchChain({ chainId: newChainId });
  };

  return (
    <Box p="6" bg="gray.800">
      <Flex justifyContent="center" mb="6">
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
              {nft.chainId === chainId ? (
                <Button
                  onClick={() => handleMint(index)}
                  disabled={nft.chainId == 11155111}
                  colorScheme="yellow"
                >
                  mint
                </Button>
              ) : (
                <Button
                  className="fontSizeLarge"
                  onClick={() => switchToChain(nft.chainId)}
                  disabled={nft.chainId == 11155111}
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
    </Box>
  );
}

export default App;
