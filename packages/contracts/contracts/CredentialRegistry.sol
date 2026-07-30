// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CredentialRegistry is Ownable {
    struct CredentialProof {
        string credentialId;
        bytes32 proofHash;
        address issuer;
        uint256 anchoredAt;
        bool revoked;
        uint256 revokedAt;
        address revokedBy;
        bool exists;
    }

    struct CredentialRecord {
        bytes32 proofHash;
        uint256 anchoredAt;
        uint256 revokedAt;
        address issuer;
        address revokedBy;
        bool revoked;
        bool exists;
    }

    struct CredentialProofMetadata {
        string credentialId;
        bytes32 proofHash;
        address issuer;
        string issuerName;
        uint256 issuedAt;
        bool exists;
        bool revoked;
        uint256 revokedAt;
        address revokedBy;
        bool issuerAuthorized;
        bool active;
    }

    struct IssuerProfile {
        string name;
        uint256 authorizedAt;
        uint256 removedAt;
        bool exists;
    }

    error CredentialAlreadyAnchored(string credentialId);
    error ProofHashAlreadyAnchored(bytes32 proofHash);
    error CredentialNotFound(string credentialId);
    error CredentialAlreadyRevoked(string credentialId);
    error InvalidIssuer(address issuer);
    error InvalidIssuerName();
    error InvalidCredentialId();
    error InvalidProofHash();
    error UnauthorizedIssuer(address issuer);
    error UnauthorizedRevoker(address caller, string credentialId);

    mapping(bytes32 => CredentialRecord) private credentials;
    mapping(bytes32 => bytes32) private credentialKeyByProofHash;
    mapping(address => bool) private authorizedIssuers;
    mapping(address => IssuerProfile) private issuerProfiles;

    event CredentialAnchored(
        string credentialId,
        bytes32 proofHash,
        address issuer,
        uint256 timestamp
    );

    event CredentialRevoked(
        string credentialId,
        address issuer,
        address revokedBy,
        uint256 timestamp
    );

    event IssuerAuthorized(address issuer, uint256 timestamp);
    event IssuerRemoved(address issuer, uint256 timestamp);
    event IssuerProfileUpdated(address indexed issuer, string issuerName, uint256 timestamp);

    event CredentialProofAnchored(
        bytes32 indexed credentialKey,
        bytes32 indexed proofHash,
        address indexed issuer,
        string credentialId,
        string issuerName,
        uint256 issuedAt
    );

    event CredentialProofRevoked(
        bytes32 indexed credentialKey,
        address indexed issuer,
        address indexed revokedBy,
        string credentialId,
        uint256 issuedAt,
        uint256 revokedAt
    );

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorizedIssuer() {
        if (!authorizedIssuers[msg.sender]) revert UnauthorizedIssuer(msg.sender);
        _;
    }

    function authorizeIssuer(address issuer) external onlyOwner {
        _authorizeIssuer(issuer, "");
    }

    function authorizeIssuerWithName(
        address issuer,
        string calldata issuerName
    ) external onlyOwner {
        if (bytes(issuerName).length == 0) revert InvalidIssuerName();
        _authorizeIssuer(issuer, issuerName);
    }

    function removeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert InvalidIssuer(issuer);
        authorizedIssuers[issuer] = false;
        issuerProfiles[issuer].removedAt = block.timestamp;
        emit IssuerRemoved(issuer, block.timestamp);
    }

    function setIssuerName(address issuer, string calldata issuerName) external onlyOwner {
        if (issuer == address(0)) revert InvalidIssuer(issuer);
        if (bytes(issuerName).length == 0) revert InvalidIssuerName();

        IssuerProfile storage profile = issuerProfiles[issuer];
        profile.name = issuerName;
        profile.exists = true;

        emit IssuerProfileUpdated(issuer, issuerName, block.timestamp);
    }

    function anchorCredential(
        string calldata credentialId,
        bytes32 proofHash
    ) external onlyAuthorizedIssuer {
        if (bytes(credentialId).length == 0) revert InvalidCredentialId();
        if (proofHash == bytes32(0)) revert InvalidProofHash();
        bytes32 credentialKey = _credentialKey(credentialId);
        if (credentials[credentialKey].exists) {
            revert CredentialAlreadyAnchored(credentialId);
        }
        if (credentialKeyByProofHash[proofHash] != bytes32(0)) {
            revert ProofHashAlreadyAnchored(proofHash);
        }

        credentials[credentialKey] = CredentialRecord({
            proofHash: proofHash,
            issuer: msg.sender,
            anchoredAt: block.timestamp,
            revoked: false,
            revokedAt: 0,
            revokedBy: address(0),
            exists: true
        });
        credentialKeyByProofHash[proofHash] = credentialKey;

        emit CredentialAnchored(
            credentialId,
            proofHash,
            msg.sender,
            block.timestamp
        );
        emit CredentialProofAnchored(
            credentialKey,
            proofHash,
            msg.sender,
            credentialId,
            issuerProfiles[msg.sender].name,
            block.timestamp
        );
    }

    function revokeCredential(string calldata credentialId) external {
        CredentialRecord storage credential = credentials[_credentialKey(credentialId)];
        if (!credential.exists) revert CredentialNotFound(credentialId);
        if (credential.issuer != msg.sender && owner() != msg.sender) {
            revert UnauthorizedRevoker(msg.sender, credentialId);
        }
        if (credential.revoked) revert CredentialAlreadyRevoked(credentialId);

        credential.revoked = true;
        credential.revokedAt = block.timestamp;
        credential.revokedBy = msg.sender;

        emit CredentialRevoked(
            credentialId,
            credential.issuer,
            msg.sender,
            block.timestamp
        );
        emit CredentialProofRevoked(
            _credentialKey(credentialId),
            credential.issuer,
            msg.sender,
            credentialId,
            credential.anchoredAt,
            block.timestamp
        );
    }

    function getCredential(string calldata credentialId)
        external
        view
        returns (CredentialProof memory)
    {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];
        return CredentialProof({
            credentialId: credential.exists ? credentialId : "",
            proofHash: credential.proofHash,
            issuer: credential.issuer,
            anchoredAt: credential.anchoredAt,
            revoked: credential.revoked,
            revokedAt: credential.revokedAt,
            revokedBy: credential.revokedBy,
            exists: credential.exists
        });
    }

    function getCredentialProofMetadata(string calldata credentialId)
        external
        view
        returns (CredentialProofMetadata memory)
    {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];
        IssuerProfile memory profile = issuerProfiles[credential.issuer];
        bool active = credential.exists && !credential.revoked;

        return CredentialProofMetadata({
            credentialId: credential.exists ? credentialId : "",
            proofHash: credential.proofHash,
            issuer: credential.issuer,
            issuerName: profile.name,
            issuedAt: credential.anchoredAt,
            exists: credential.exists,
            revoked: credential.revoked,
            revokedAt: credential.revokedAt,
            revokedBy: credential.revokedBy,
            issuerAuthorized: authorizedIssuers[credential.issuer],
            active: active
        });
    }

    function verifyCredential(
        string calldata credentialId,
        bytes32 proofHash
    )
        external
        view
        returns (
            bool exists,
            bool integrityVerified,
            bool revoked,
            address issuer,
            string memory issuerName,
            uint256 issuedAt
        )
    {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];

        return (
            credential.exists,
            credential.exists && credential.proofHash == proofHash,
            credential.revoked,
            credential.issuer,
            issuerProfiles[credential.issuer].name,
            credential.anchoredAt
        );
    }

    function getCredentialHash(string calldata credentialId) external view returns (bytes32) {
        return credentials[_credentialKey(credentialId)].proofHash;
    }

    function getCredentialIssuer(string calldata credentialId) external view returns (address) {
        return credentials[_credentialKey(credentialId)].issuer;
    }

    function getCredentialTimestamp(string calldata credentialId) external view returns (uint256) {
        return credentials[_credentialKey(credentialId)].anchoredAt;
    }

    function getCredentialRevocation(
        string calldata credentialId
    ) external view returns (bool revoked, uint256 revokedAt, address revokedBy) {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];
        return (credential.revoked, credential.revokedAt, credential.revokedBy);
    }

    function isCredentialRevoked(string calldata credentialId) external view returns (bool) {
        return credentials[_credentialKey(credentialId)].revoked;
    }

    function isCredentialIssuer(
        string calldata credentialId,
        address issuer
    ) external view returns (bool) {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];
        return credential.exists && credential.issuer == issuer;
    }

    function isCredentialValid(
        string calldata credentialId,
        bytes32 proofHash
    ) external view returns (bool) {
        CredentialRecord memory credential = credentials[_credentialKey(credentialId)];
        return credential.exists && credential.proofHash == proofHash && !credential.revoked;
    }

    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer];
    }

    function getIssuerProfile(
        address issuer
    )
        external
        view
        returns (
            bool authorized,
            string memory issuerName,
            uint256 authorizedAt,
            uint256 removedAt
        )
    {
        IssuerProfile memory profile = issuerProfiles[issuer];
        return (
            authorizedIssuers[issuer],
            profile.name,
            profile.authorizedAt,
            profile.removedAt
        );
    }

    function credentialHashExists(bytes32 proofHash) external view returns (bool) {
        return credentialKeyByProofHash[proofHash] != bytes32(0);
    }

    function getCredentialKeyByProofHash(bytes32 proofHash) external view returns (bytes32) {
        return credentialKeyByProofHash[proofHash];
    }

    function getCredentialKey(string calldata credentialId) external pure returns (bytes32) {
        return _credentialKey(credentialId);
    }

    function credentialExists(string calldata credentialId) external view returns (bool) {
        return credentials[_credentialKey(credentialId)].exists;
    }

    function _authorizeIssuer(address issuer, string memory issuerName) private {
        if (issuer == address(0)) revert InvalidIssuer(issuer);

        authorizedIssuers[issuer] = true;

        IssuerProfile storage profile = issuerProfiles[issuer];
        if (!profile.exists || profile.authorizedAt == 0) {
            profile.authorizedAt = block.timestamp;
        }
        profile.removedAt = 0;
        profile.exists = true;

        if (bytes(issuerName).length > 0) {
            profile.name = issuerName;
            emit IssuerProfileUpdated(issuer, issuerName, block.timestamp);
        }

        emit IssuerAuthorized(issuer, block.timestamp);
    }

    function _credentialKey(string memory credentialId) private pure returns (bytes32) {
        return keccak256(bytes(credentialId));
    }
}
