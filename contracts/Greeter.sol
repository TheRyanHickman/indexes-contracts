//SPDX-License-Identifier: Unlicense
pragma experimental ABIEncoderV2;
pragma solidity ^0.7.0;

import "hardhat/console.sol";

struct Shareholder {
    uint64 shares;
    address wallet;
    bool exist;
}

struct Proposal {
    Shareholder[] newShareholders;
    address[] voters;
    bool exist;
}

contract TokenSharing {
    uint256 lastupdated;
    mapping(address => uint64) shareholdersMap;
    Shareholder[] shareholders;
    Proposal[] proposals;

    constructor(Shareholder[] memory initialShareOlders) {
        replaceShareholders(initialShareOlders);
    }

    function replaceShareholders(Shareholder[] memory newShareholders) private {
        for (uint256 i = 0; i < newShareholders.length; i++) {
            Shareholder memory initialShareholder = newShareholders[i];
            shareholdersMap[initialShareholder.wallet] = initialShareholder
                .shares;
            shareholders.push(initialShareholder);
        }
        lastupdated = block.timestamp;
    }

    function applyProposal(uint256 proposalId) public {
        require(
            shareholdersMap[msg.sender] != 0,
            "You are not allowed apply the proposal."
        );
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
    }

    function createProposal(Shareholder[] memory newShareholders)
        public
        returns (uint256)
    {
        require(
            shareholdersMap[msg.sender] != 0,
            "You are not allowed to vote."
        );
        proposals.push();
        uint256 proposalIndex = proposals.length - 1;
        Proposal storage proposal = proposals[proposalIndex];
        proposal.exist = true;
        proposal.voters = new address[](0);
        for (uint256 i = 0; i < newShareholders.length; i++) {
            proposal.newShareholders[i] = newShareholders[i];
        }
        return proposalIndex;
    }

    function vote(uint256 proposalId) public {
        require(
            shareholdersMap[msg.sender] != 0,
            "You are not allowed to vote."
        );
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            require(proposal.voters[i] != msg.sender, "You already voted");
        }
        proposal.voters.push(msg.sender);
    }

    function getProposal(uint256 proposalId)
        public
        view
        returns (Proposal memory)
    {
        require(
            shareholdersMap[msg.sender] != 0,
            "You are not allowed check the votes."
        );
        Proposal memory proposal = proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        return proposal;
    }
}
