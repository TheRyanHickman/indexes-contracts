//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Governance {
    uint256 constant FAVORABLE_VOTE_THRESHOLD = 7000;
    uint256 constant MIN_TIME_TO_VOTE = 60 * 60 * 24;
    event NewProposal(Proposal);
    mapping(uint256 => Proposal) _proposals;
    mapping(uint256 => mapping(address => bool)) _voters;
    address _owner;
    ERC20 _token;
    Proposal[] _approvedProposals;
    uint256 _proposalCounter = 0;

    constructor(address owner, address tokenAddress) {
        _owner = owner;
        _token = ERC20(tokenAddress);
    }

    modifier ownerOnly() {
        require(msg.sender == _owner, "NOT ALLOWED");
        _;
    }

    function isFavorable(Proposal memory proposal) private pure returns (bool) {
        uint256 totalVotes = proposal.approved + proposal.disapproved;
        return
            ((proposal.approved * 10000) / (totalVotes)) >
            FAVORABLE_VOTE_THRESHOLD;
    }

    function applyProposal(uint256 proposalId) public {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
        require(
            block.timestamp >= proposal.endVoteDate,
            "This proposal is still active."
        );
        require(
            isFavorable(proposal),
            "The proposal has not been approved yet."
        );
        delete _proposals[proposalId];
        _approvedProposals.push(proposal);
    }

    function createProposal(string memory IPFSId, uint256 endVoteDate)
        public
        returns (uint256)
    {
        require(
            block.timestamp + MIN_TIME_TO_VOTE >= endVoteDate,
            "Time limit is too short."
        );
        uint256 proposalId = createProposalId();
        Proposal memory proposal =
            Proposal({
                author: msg.sender,
                IPFSId: IPFSId,
                approved: 0,
                disapproved: 0,
                creationDate: block.timestamp,
                endVoteDate: endVoteDate
            });
        _proposals[proposalId] = proposal;
        emit NewProposal(proposal);
        return proposalId;
    }

    function createProposalId() public returns (uint256) {
        _proposalCounter++;
        return _proposalCounter;
    }

    function approveProposal(uint256 proposalId) public {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
        require(
            block.timestamp < proposal.endVoteDate,
            "The voting time is expired."
        );
        require(_voters[proposalId][msg.sender] == false, "You already voted");
        _voters[proposalId][msg.sender] = true;
        proposal.approved += _token.balanceOf(msg.sender);
    }

    function disapproveProposal(uint256 proposalId) public {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
        require(
            block.timestamp < proposal.endVoteDate,
            "The voting time is expired."
        );
        require(_voters[proposalId][msg.sender] == false, "You already voted");
        _voters[proposalId][msg.sender] = true;
        proposal.disapproved += _token.balanceOf(msg.sender);
    }

    function deleteProposal(uint256 proposalId)
        public
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.author != address(0), "Unknow proposal id.");
        require(
            proposal.author == msg.sender,
            "You are not authorized to delete the proposal."
        );
        require(
            block.timestamp >= proposal.endVoteDate,
            "This proposal is still active."
        );
        require(
            !isFavorable(proposal),
            "This proposal is already approved by the community."
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
}

struct Proposal {
    address author;
    uint256 approved;
    uint256 disapproved;
    string IPFSId;
    uint256 creationDate;
    uint256 endVoteDate;
}
