//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../interfaces/IStaking.sol";

contract StakingRewardsFunds {
    struct StakingRewardsAgreement {
        uint256 amount;
        uint256 distributedAt;
    }

    IStaking public staking;

    uint256 public totalAmountOfStakingRewards;

    uint256 public leftAmountOfStakingRewards;

    StakingRewardsAgreement[] public stakingRewardsHistory;

    function initializeStakingRewards(address _staking) internal {
        require(_staking != address(0), "Invalid staking");
        staking = IStaking(_staking);
    }

    function _distributeStakingRewards(uint256 _amount) internal {
        require(_amount > 0, "Invalid amount");

        uint256 _actualAmount;
        _actualAmount = leftAmountOfStakingRewards > _amount ? _amount : leftAmountOfStakingRewards;
        require(_actualAmount > 0, "No fund yet");

        leftAmountOfStakingRewards -= _actualAmount;

        // transfer value to staking contract
        staking.distributeRewards{value: _actualAmount}();
    }

    function _depositToStakingRewards(uint256 _amount) internal {
        require(_amount > 0, "Invalid amount");

        totalAmountOfStakingRewards += _amount;
        leftAmountOfStakingRewards += _amount;
    }
}
