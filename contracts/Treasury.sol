//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IStaking.sol";

contract Treasury {

    address public immutable governance;
    IStaking public staking;

    /// @dev total amount, paid for teams
    uint256 public totalAmountOfTeams;

    /// @dev total amount of airdrop to token holders, as airdrop
    uint256 public totalAmountOfAirdrop;

    uint256 public totalAmountOfStakeRewards;

    constructor(address _governance) {
        require(_governance != address(0), "Invalid governance");

        governance = _governance;
    }

    function distributeRewardsToStakers(uint256 amount) external onlyGovernance {

    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    receive() external payable {
        
    }
}
