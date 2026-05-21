export const CREDENTIAL_REGISTRY_CONTRACT_NAME = "CredentialRegistry";
export const CREDENTIAL_REGISTRY_AMOY_ADDRESS = "0x34FEb3321bc0326652776D44CD3208B10F3b527D";
export const POLYGON_AMOY_CHAIN_ID = 80_002;
export const POLYGON_AMOY_EXPLORER_URL = "https://amoy.polygonscan.com";

export const credentialRegistryAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "CredentialAlreadyAnchored",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "CredentialAlreadyRevoked",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "CredentialNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCredentialId",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "InvalidIssuer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidIssuerName",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProofHash",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "ProofHashAlreadyAnchored",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "UnauthorizedIssuer",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "UnauthorizedRevoker",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "CredentialAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "credentialKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      }
    ],
    "name": "CredentialProofAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "credentialKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "revokedBy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      }
    ],
    "name": "CredentialProofRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "revokedBy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "CredentialRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "IssuerAuthorized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "IssuerProfileUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "IssuerRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "anchorCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "authorizeIssuer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      }
    ],
    "name": "authorizeIssuerWithName",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "credentialExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "credentialHashExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredential",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "proofHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "issuer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "anchoredAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "revokedBy",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct CredentialRegistry.CredentialProof",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialIssuer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialKey",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "getCredentialKeyByProofHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialProofMetadata",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "credentialId",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "proofHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "issuer",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "issuerName",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "issuedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "revoked",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "revokedAt",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "revokedBy",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "issuerAuthorized",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct CredentialRegistry.CredentialProofMetadata",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialRevocation",
    "outputs": [
      {
        "internalType": "bool",
        "name": "revoked",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "revokedAt",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "revokedBy",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "getCredentialTimestamp",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "getIssuerProfile",
    "outputs": [
      {
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "authorizedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "removedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "isAuthorizedIssuer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "isCredentialIssuer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "isCredentialRevoked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "isCredentialValid",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      }
    ],
    "name": "removeIssuer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      }
    ],
    "name": "revokeCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      }
    ],
    "name": "setIssuerName",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "credentialId",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "verifyCredential",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "integrityVerified",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "revoked",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "issuer",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "issuerName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export type CredentialRegistryAbi = typeof credentialRegistryAbi;

export function getPolygonAmoyTransactionUrl(txHash: string) {
  return `${POLYGON_AMOY_EXPLORER_URL}/tx/${txHash}`;
}

export function getPolygonAmoyAddressUrl(address: string) {
  return `${POLYGON_AMOY_EXPLORER_URL}/address/${address}`;
}
