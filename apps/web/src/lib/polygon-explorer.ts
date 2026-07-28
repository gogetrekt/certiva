/**
 * Single place the Polygon Amoy explorer URL is written down. It used to be
 * copied into three page components plus two inline template literals, so a
 * network switch meant finding five spots.
 *
 * Deliberately not imported from `@certiva/contracts`, which exports the same
 * two helpers: that module also carries the 965-line registry ABI, and pulling
 * it into a client component to build a string would put the whole ABI on the
 * tree-shaker's mercy. Those unused exports were removed there instead.
 */
const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

export function polygonAmoyTxUrl(txHash: string) {
  return `${POLYGON_AMOY_EXPLORER_URL}/tx/${txHash}`;
}

export function polygonAmoyAddressUrl(address: string) {
  return `${POLYGON_AMOY_EXPLORER_URL}/address/${address}`;
}
