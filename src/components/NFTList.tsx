import React from 'react';
import { Button } from './ui/button';

interface NFT {
  id: string;
  name: string;
  image: string;
  chain: string;
}

const NFTList: React.FC<{ nfts: NFT[] }> = ({ nfts }) => {
  const handleMint = (nftId: string) => {
    // Implement minting logic here
    console.log(`Minting NFT with ID: ${nftId}`);
  };

  return (
    <div className="space-y-4">
      {nfts.map((nft) => (
        <div key={nft.id} className="flex items-center p-4 border rounded-lg" style={{justifyContent:'space-evenly'}}>
          <img src={nft.image} alt={nft.name} className="w-32 h-32 rounded-full" />
          <div>
            {nft.chain}
          </div>
          <Button
            onClick={() => handleMint(nft.id)}
          >
            Mint
          </Button>
        </div>
      ))}
    </div>
  );
};

export default NFTList;