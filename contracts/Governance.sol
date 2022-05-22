//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract Governance {
    struct Proposal {
        uint256 transactParamsHash;
        uint256 proposeTime;
        uint256 yaysCount;
        uint256 naysCount;
        bool executed;
        mapping (address => bool) hasVoted;
    }

    /// @dev the most latest proposal id
    uint256 public latestProposalID;

    /// @dev stores all proposals
    mapping (uint256 => Proposal) public proposals;

    /// @dev Min voting weight to execute proposal
    uint96 public thresholdExec;

    /// @dev Total votes required to pass
    uint96 public quorum;

    /// @dev number of senators registered
    uint256 public totalSenators;

    /// @dev stores all senators
    mapping (address => bool) public isSenators;

    event ProposalCreated(
        address indexed creator,
        uint256 indexed proposalID,
        address[] targets,
        uint256[] values,
        bytes[] data,
        string description
    );

    event Voted(
        address indexed senator,
        uint256 indexed proposalID,
        bool yay
    );

    event ProposalExecuted(
        address indexed executor,
        uint256 indexed proposalID
    );

    constructor(
        address[] memory _senators,
        uint256 _quorum,
        uint256 _thresholdExec
    ) {
        require(_senators.length > 0, "Invalid senators");
        require(_quorum > 0 && _quorum <= _senators.length, "Invalid quorum");
        require(_thresholdExec > 0 && _thresholdExec <= _senators.length, "Invalid quorum");

        for (uint256 i = 0; i < _senators.length; i ++) {
            require(_senators[i] != address(0), "Invalid senator");
            require(!isSenators[_senators[i]], "Duplicate senator");

            isSenators[_senators[i]] = true;
            totalSenators ++;
        }
    }

    function getTransactionParamsHash(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data
    ) public pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(targets, values, data))
            );
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data,
        string memory description
    ) external onlySenator returns (uint256) {
        // Logic check on proposal data
        uint256 targetsLength = targets.length;
        require(targetsLength > 0, "Invalid data");
        require(targetsLength == values.length, "Invalid data");
        require(targetsLength == data.length, "Invalid data");
        require(!(bytes(description).length == 0), "No description");

        uint256 timestamp = block.timestamp;

        latestProposalID ++;
        Proposal storage proposal = proposals[latestProposalID];
        proposal.transactParamsHash = getTransactionParamsHash(targets, values, data);
        proposal.proposeTime = timestamp;

        emit ProposalCreated(msg.sender, latestProposalID, targets, values, data, description);
        return latestProposalID;
    }

    function vote(
        uint256 proposalID,
        bool yay
    ) external onlySenator {
        require(proposalID < latestProposalID, "Invalid proposal");

        Proposal storage proposal = proposals[proposalID];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        proposal.hasVoted[msg.sender] = true;

        if (yay) {
            proposal.yaysCount ++;
        } else {
            proposal.naysCount ++;
        }

        emit Voted(msg.sender, proposalID, yay);
    }

    function execute(
        uint256 proposalID,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data
    ) external onlySenator {
        require(proposalID <= latestProposalID, "Invalid proposal");

        Proposal storage proposal = proposals[proposalID];
        require(!proposal.executed, "Executed already");

        uint256 transactParamsHash = getTransactionParamsHash(
            targets,
            values,
            data
        );
        require(
            transactParamsHash == proposal.transactParamsHash,
            "Governance: Transact params"
        );

        require(proposal.yaysCount + proposal.naysCount > quorum, "Not enough votes");
        require(proposal.yaysCount >= thresholdExec, "Not enough yays");
        proposal.executed = true;

        _transact(targets, values, data);

        emit ProposalExecuted(msg.sender, proposalID);
    }

    function _transact(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data
    ) internal {
        uint256 targetsLength = targets.length;
        require(targetsLength > 0, "Invalid array length");
        require(targetsLength == values.length, "Array length mismatch");
        require(targetsLength == data.length, "Array length mismatch");

        for (uint256 i = 0; i < targetsLength; ++i) {
            if (data[i].length != 0) {
                Address.functionCallWithValue(targets[i], data[i], values[i]);
            } else {
                /// @dev send ETH to EOA
                Address.sendValue(payable(targets[i]), values[i]);
            }
        }
    }

    modifier onlySenator() {
        require(isSenators[msg.sender], "Only senator");
        _;
    }
}
