import { parseAbi } from 'viem';
import unparsedAbi from "./CoreNFTContract.abi.json";

function abiItemToString(item: any): string {
  switch (item.type) {
    case 'function':
      return functionToString(item);
    case 'event':
      return eventToString(item);
    case 'error':
      return errorToString(item);
    case 'constructor':
      return constructorToString(item);
    case 'receive':
      return 'receive() external payable';
    case 'fallback':
      return 'fallback() external payable';
    default:
      console.warn(`Unhandled ABI item type: ${item.type}`);
      return '';
  }
}

function eventToString(item: any): string {
  const inputs = item.inputs.map((input: any) => `${input.type}${input.indexed ? ' indexed' : ''} ${input.name}`).join(', ');
  return `event ${item.name}(${inputs})`;
}

function errorToString(item: any): string {
  const inputs = item.inputs.map(parameterToString).join(', ');
  return `error ${item.name}(${inputs})`;
}

function constructorToString(item: any): string {
  const inputs = item.inputs.map(parameterToString).join(', ');
  return `constructor(${inputs})`;
}

function parameterToString(param: any): string {
  if (param.type === 'tuple' && param.components) {
    const componentsString = param.components.map((comp: any) => 
      `${comp.type} ${comp.name}`
    ).join(',');
    return `(${componentsString})${param.name ? ' ' + param.name : ''}`;
  }
  return `${param.type}${param.name ? ' ' + param.name : ''}`;
}

function functionToString(item: any): string {
  const inputs = item.inputs.map(parameterToString).join(',');
  const outputs = item.outputs ? item.outputs.map(parameterToString).join(',') : '';
  return `function ${item.name}(${inputs})${item.stateMutability !== 'nonpayable' ? ' ' + item.stateMutability : ''}${outputs ? ` returns (${outputs})` : ''}`;
}



function parseDumbAbis(param: any): any {
  const abiStrings = param.map((item: any) => {
    const result = abiItemToString(item);
    return result;
  }).filter(Boolean);
  try {
    const parsedAbi = parseAbi(abiStrings);
    return parsedAbi;
  } catch (error) {
    throw error;
  }
}
export default parseDumbAbis; 