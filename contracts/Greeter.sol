//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

struct Shareholder {
    uint64 shares;
    address wallet;
    bool exist;
}

struct Proposal {
    address author;
    Shareholder[] newShareholders;
    address[] voters;
    uint256 date;
    bool exist;
}

contract TokenSharing {
    uint256 constant FAVORABLE_VOTE_THRESHOLD = 7000;
    uint256 _proposalDate;
    uint256 _totalShares;
    mapping(address => uint64) _shareholdersMap;
    Shareholder[] _shareholders;
    Proposal[] _proposals;

    constructor(Shareholder[] memory newShareholders) {
        replaceShareholders(newShareholders, block.timestamp);
    }

    function replaceShareholders(
        Shareholder[] memory newShareholders,
        uint256 proposalDate
    ) private {
        delete _shareholders;
        for (uint256 i = 0; i < newShareholders.length; i++) {
            Shareholder memory initialShareholder = newShareholders[i];
            _shareholdersMap[initialShareholder.wallet] = initialShareholder
                .shares;
            _shareholders.push(initialShareholder);
        }
        _totalShares = calculateTotalShares();
        proposalDate = proposalDate;
    }

    function calculateTotalShares() private view returns (uint256) {
        uint256 totalShares = 0;
        for (uint256 i = 0; i < _shareholders.length; i++) {
            totalShares += _shareholders[i].shares;
        }
        return totalShares;
    }

    function isFavorable(Proposal memory proposal) private view returns (bool) {
        uint256 favorableShares = 0;
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            address voter = proposal.voters[i];
            uint256 votedShares = _shareholdersMap[voter];
            favorableShares += votedShares;
        }
        return
            ((favorableShares * 1000) / (_totalShares * 1000)) >
            FAVORABLE_VOTE_THRESHOLD;
    }

    function applyProposal(uint256 proposalId) public {
        require(
            _shareholdersMap[msg.sender] != 0,
            "You are not allowed apply the proposal."
        );
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        require(
            proposal.date > _proposalDate,
            "Too old proposal a newer is already applied."
        );
        require(
            isFavorable(proposal),
            "The proposal has not been approved yet."
        );
        replaceShareholders(proposal.newShareholders, block.timestamp);
    }

    function createProposal(Shareholder[] memory newShareholders)
        public
        returns (uint256)
    {
        require(
            _shareholdersMap[msg.sender] != 0,
            "You are not allowed to vote."
        );
        _proposals.push();
        uint256 proposalIndex = _proposals.length - 1;
        Proposal storage proposal = _proposals[proposalIndex];
        proposal.exist = true;
        proposal.author = msg.sender;
        proposal.voters = new address[](0);
        proposal.date = block.timestamp;
        for (uint256 i = 0; i < newShareholders.length; i++) {
            proposal.newShareholders[i] = newShareholders[i];
        }
        return proposalIndex;
    }

    function vote(uint256 proposalId) public {
        require(
            _shareholdersMap[msg.sender] != 0,
            "You are not allowed to vote."
        );
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            require(proposal.voters[i] != msg.sender, "You already voted");
        }
        proposal.voters.push(msg.sender);
    }

    function deleteProposal(uint256 proposalId)
        public
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        require(
            proposal.author == msg.sender || proposal.date < _proposalDate,
            "You are not authorized to delete the proposal yet."
        );
        delete _proposals[proposalId];
        return proposal;
    }

    function getProposal(uint256 proposalId)
        public
        view
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.exist, "Unknow proposal id.");
        return proposal;
    }

    function getShareholders() public view returns (Shareholder[] memory) {
        return _shareholders;
    }
}
