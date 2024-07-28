import { http, createConfig } from 'wagmi'
import { mainnet, optimism, arbitrum, sepolia } from 'wagmi/chains'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'

const projectId = 'de01527dbfce297d0fdfc7ead0a1ce7a' // Replace with your actual project ID

export const config = createConfig({
  chains: [mainnet, optimism, arbitrum, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    metaMask(),
    safe(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
})  