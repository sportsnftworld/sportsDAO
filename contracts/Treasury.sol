//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./treasury/AirdropFunds.sol";
import "./treasury/StakingRewardsFunds.sol";
import "./treasury/TeamFunds.sol";

contract Treasury is TeamFunds, AirdropFunds, StakingRewardsFunds {

    address public immutable governance;

    constructor(address _governance) {
        require(_governance != address(0), "Invalid governance");

        governance = _governance;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    receive() external payable {}
}
