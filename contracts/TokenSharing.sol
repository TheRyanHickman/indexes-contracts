//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenSharing {
    uint256 constant FAVORABLE_VOTE_THRESHOLD = 7000;
    event NewProposal(Proposal);
    event Transfer(Shareholder, uint256);
    ERC20[] _tokens;
    uint256 _proposalDate;
    uint256 _totalShares;
    uint256 _totalVotingShares;
    mapping(address => Shareholder) _shareholdersMap;
    Shareholder[] _shareholders;
    Proposal[] _proposals;

    constructor(address owner, address[] memory tokenAddresses) {
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            _tokens.push(ERC20(tokenAddresses[i]));
        }
        Shareholder[] memory shareholders = new Shareholder[](1);
        shareholders[0] = Shareholder({
            wallet: owner,
            shares: 100,
            canVote: true
        });
        replaceShareholders(shareholders, block.timestamp);
    }

    modifier voterOnly() {
        require(
            _shareholdersMap[msg.sender].canVote,
            "Unauthorized. You have to be a shareholder."
        );
        _;
    }

    modifier validShareholders(Shareholder[] memory shareholders) {
        require(
            shareholders.length > 0,
            "At least 1 shareholder is requiered."
        );
        for (uint256 i = 0; i < shareholders.length; i++) {
            Shareholder memory shareholder = shareholders[i];
            require(
                shareholder.shares > 0,
                "Shareholder must have at least 1 share."
            );
            require(
                shareholder.wallet != address(0),
                "Wallet address 0 is not allowed for a shareholder."
            );
        }
        _;
    }

    function distributeAllTokens() public {
        for (uint256 i = 0; i < _tokens.length; i++) {
            distributeToken(_tokens[i]);
        }
    }

    function distributeToken(ERC20 token) public {
        uint256 balance = token.balanceOf(address(this));
        for (uint256 i = 0; i < _shareholders.length; i++) {
            Shareholder memory shareholder = _shareholders[i];
            uint256 percentAllowed = shareholder.shares / _totalShares;
            uint256 amontToTransfer = balance * percentAllowed;
            token.transferFrom(
                address(this),
                shareholder.wallet,
                amontToTransfer
            );
            emit Transfer(shareholder, amontToTransfer);
        }
    }

    function replaceShareholders(
        Shareholder[] memory newShareholders,
        uint256 proposalDate
    ) private {
        for (uint256 i = 0; i < _shareholders.length; i++) {
            address wallet = _shareholders[i].wallet;
            delete _shareholdersMap[wallet];
            delete _shareholders[i];
        }

        for (uint256 i = 0; i < newShareholders.length; i++) {
            Shareholder memory initialShareholder = newShareholders[i];
            _shareholdersMap[initialShareholder.wallet] = initialShareholder;
            _shareholders.push(initialShareholder);
        }
        _totalShares = calculateTotalShares(newShareholders);
        _totalVotingShares = calculateTotalVotingShares(newShareholders);
        proposalDate = proposalDate;
    }

    function calculateTotalShares(Shareholder[] memory shareholders)
        private
        pure
        returns (uint256)
    {
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shareholders.length; i++) {
            totalShares += shareholders[i].shares;
        }
        return totalShares;
    }

    function calculateTotalVotingShares(Shareholder[] memory shareholders)
        private
        pure
        returns (uint256)
    {
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shareholders.length; i++) {
            if (shareholders[i].canVote) totalShares += shareholders[i].shares;
        }
        return totalShares;
    }

    function isFavorable(Proposal memory proposal) private view returns (bool) {
        uint256 favorableShares = 0;
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            address voter = proposal.voters[i];
            uint256 votedShares = _shareholdersMap[voter].shares;
            favorableShares += votedShares;
        }
        return
            ((favorableShares * 10000) / (_totalShares)) >
            FAVORABLE_VOTE_THRESHOLD;
    }

    function applyProposal(uint256 proposalId) public voterOnly {
        require(proposalId < _proposals.length, "Unknow proposal id.");
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
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
        voterOnly
        validShareholders(newShareholders)
        returns (uint256)
    {
        _proposals.push();
        uint256 proposalIndex = _proposals.length - 1;
        Proposal storage proposal = _proposals[proposalIndex];
        proposal.author = msg.sender;
        proposal.voters = new address[](0);
        proposal.date = block.timestamp;
        for (uint256 i = 0; i < newShareholders.length; i++) {
            Shareholder memory newShareholder = newShareholders[i];
            proposal.newShareholders.push(newShareholder);
        }
        approveProposal(proposalIndex);
        emit NewProposal(proposal);
        return proposalIndex;
    }

    function approveProposal(uint256 proposalId) public voterOnly {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
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
        require(proposal.author != address(0), "Unknow proposal id.");
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
        require(proposal.author != address(0), "Unknow proposal id.");
        return proposal;
    }

    function getShareholders() public view returns (Shareholder[] memory) {
        return _shareholders;
    }
}

struct Shareholder {
    uint64 shares;
    address wallet;
    bool canVote;
}

struct Proposal {
    address author;
    Shareholder[] newShareholders;
    address[] voters;
    uint256 date;
}
