import { isAddress, getAddress, pad, slice } from 'viem'

/**
 * Converts a bytes32 string to an Ethereum address.
 * @param bytes32Value The bytes32 value to convert.
 * @returns The Ethereum address.
 */
export function bytes32ToAddress(bytes32Value: `0x${string}`): string {
  // Ensure the input is a valid hex string with 0x prefix
  if (!bytes32Value.startsWith('0x') || bytes32Value.length !== 66) {
    throw new Error('Invalid bytes32 value');
  }

  // Take the last 40 characters (20 bytes) and add '0x' prefix
  const address = `${slice(bytes32Value, 12, 32)}`;

  // Ensure the address is checksummed
  return getAddress(address);
}

/**
 * Converts an Ethereum address to a bytes32 string.
 * @param address The Ethereum address to convert.
 * @returns The bytes32 representation of the address.
 */
export function addressToBytes32(address: string): `0x${string}` {
  // Ensure the address is valid
  if (!isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  // Remove '0x' prefix if present and pad to 32 bytes
  const cleanAddress = address.startsWith("0x") ? address.slice(2).toLowerCase() : address.toLowerCase();
  return pad(`0x${cleanAddress}`, { size: 32, dir: 'left' });
}