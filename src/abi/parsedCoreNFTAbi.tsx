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
    default:
      return '';
  }
}

function functionToString(item: any): string {
  const inputs = item.inputs.map(parameterToString).join(', ');
  const outputs = item.outputs ? item.outputs.map(parameterToString).join(', ') : '';
  return `function ${item.name}(${inputs})${item.stateMutability !== 'nonpayable' ? ' ' + item.stateMutability : ''}${outputs ? ` returns (${outputs})` : ''}`;
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
  let typeString = param.type;
  if (param.components) {
    const componentsString = param.components.map(parameterToString).join(', ');
    typeString = `${param.type}(${componentsString})`;
  }
  return `${typeString}${param.name ? ' ' + param.name : ''}`;
}

function parseDumbAbis(param: any): any {
  const abiStrings = param.map(abiItemToString).filter(Boolean);
  const parsedAbi = parseAbi(abiStrings);
  return parsedAbi
}
export default parseDumbAbis;