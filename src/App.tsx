import { useAccountEffect } from "wagmi";

import CrossChainLendingApp from "./CrossChainLendingApp";

function App() {
  useAccountEffect({
    onConnect(_data) {
      // console.log('onConnect', data)
    },
    onDisconnect() {
      // console.log('onDisconnect')
    },
  });

  return (
    <>
      <CrossChainLendingApp />
    </>
  );
}

export default App;
