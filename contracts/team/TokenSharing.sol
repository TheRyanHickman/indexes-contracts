//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Shares income between dev team members
 */
contract TokenSharing {
    uint256 constant FAVORABLE_VOTE_THRESHOLD = 7000;
    event NewProposal(Proposal);
    event Transfer(Shareholder, uint256);
    uint256 _proposalDate;
    uint256 _totalShares;
    uint256 _totalVotingShares;
    mapping(address => Shareholder) _shareholdersMap;
    Shareholder[] _shareholders;
    Proposal[] _proposals;

    constructor(address owner) {
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
            "SHARING: NOT_SHAREHOLDER"
        );
        _;
    }

    modifier validShareholders(Shareholder[] memory shareholders) {
        require(shareholders.length > 0, "SHARING: TOO_FEW_SHAREHOLDERS");
        for (uint256 i = 0; i < shareholders.length; i++) {
            Shareholder memory shareholder = shareholders[i];
            require(shareholder.shares > 0, "SHARING: NOT_ENOUGH_SHARES");
            require(
                shareholder.wallet != address(0),
                "SHARING: ERR_ADDRESS_ZERO"
            );
        }
        _;
    }

    function distributeAllTokens(address[] memory tokenAddresses) public {
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            IERC20 token = IERC20(tokenAddresses[i]);
            distributeToken(token);
        }
    }

    function distributeToken(IERC20 token) public {
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) return;
        for (uint256 i = 0; i < _shareholders.length; i++) {
            Shareholder memory shareholder = _shareholders[i];
            uint256 percentAllowed = (shareholder.shares * 1000) / _totalShares;
            uint256 amountToTransfer = (balance * percentAllowed) / 1000;
            token.transfer(shareholder.wallet, amountToTransfer);
            emit Transfer(shareholder, amountToTransfer);
        }
    }

    function replaceShareholders(
        Shareholder[] memory newShareholders,
        uint256 proposalDate
    ) private {
        require(newShareholders.length > 0, "SHARING: NO_SHAREHOLDERS");

        for (uint256 i = 0; i < _shareholders.length; i++) {
            address wallet = _shareholders[i].wallet;
            delete _shareholdersMap[wallet];
        }
        delete _shareholders;

        for (uint256 i = 0; i < newShareholders.length; i++) {
            Shareholder memory initialShareholder = newShareholders[i];
            require(initialShareholder.wallet != address(0), "SHARING: INVALID_SHAREHOLDER_ADDRESS");

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

    function isFavorable(Proposal memory proposal) public view returns (bool) {
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

    function applyProposal(uint256 proposalId) external voterOnly {
        require(proposalId < _proposals.length, "SHARING: UNKNOWN_PROPOSAL_ID");
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "SHARING: UNKNOWN_PROPOSAL_ID");
        require(proposal.date > _proposalDate, "SHARING: PROPOSAL_TOO_OLD");
        require(isFavorable(proposal), "SHARING: PROPOSAL_NOT_APPROVED");
        replaceShareholders(proposal.newShareholders, block.timestamp);
    }

    function createProposal(Shareholder[] memory newShareholders)
        external
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
        emit NewProposal(proposal);
        return proposalIndex;
    }

    function approveProposal(uint256 proposalId) external voterOnly {
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.author != address(0), "SHARING: UNKNOWN_PROPOSAL_ID");
        for (uint256 i = 0; i < proposal.voters.length; i++) {
            require(proposal.voters[i] != msg.sender, "SHARING: ALREADY_VOTED");
        }
        proposal.voters.push(msg.sender);
    }

    function deleteProposal(uint256 proposalId)
        external
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.author != address(0), "SHARING: UNKNOWN_PROPOSAL_ID");
        require(
            proposal.author == msg.sender || proposal.date < _proposalDate,
            "SHARING: DELETE_UNAUTHORIZED"
        );
        delete _proposals[proposalId];
        return proposal;
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (Proposal memory)
    {
        Proposal memory proposal = _proposals[proposalId];
        require(proposal.author != address(0), "SHARING: UNKNOWN_PROPOSAL_ID");
        return proposal;
    }

    function getShareholders() external view returns (Shareholder[] memory) {
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
