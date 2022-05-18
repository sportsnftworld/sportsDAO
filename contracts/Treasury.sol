//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./treasury/AirdropFunds.sol";
import "./treasury/StakingRewardsFunds.sol";
import "./treasury/TeamFunds.sol";

contract Treasury is TeamFunds, AirdropFunds, StakingRewardsFunds {
    address public immutable governance;

    constructor(
        address _governance, 
        address _staking, 
        address[] memory _members, 
        uint256[] memory _equities
    ) {
        require(_governance != address(0), "Invalid governance");
        require(_staking != address(0), "Invalid staking");
        require(_members.length == _equities.length, "Invalid team param");

        governance = _governance;

        /// @dev initialize team
        for (uint256 i = 0; i < _members.length; i ++) {
            _registerTeamMember(_members[i], _equities[i]);
        }

        /// @dev initialize airdrop
        _initiailizeAirdrop(297000 ether, 30);

        /// @dev initialize staking rewards parts
        _initializeStakingRewards(_staking);
    }

    function distributeStakingRewards(uint256 _amount) external onlyGovernance {
        _distributeStakingRewards(_amount);
    }

    function registerAirdropObject(address _collection, uint256 _tokenId, uint256 _percentage) external onlyGovernance {
        _registerAirdropObject(_collection, _tokenId, _percentage);
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    receive() external payable {
        uint256 amountOfTeam = msg.value * totalEquities / 100;
        _depositToTeamFunds(amountOfTeam);

        uint256 amountOfAirdrop;
        uint256 amountOfActualAirdrop;
        if (totalAmountOfAirdrop < maximumAmountOfAirdrop) {
            amountOfAirdrop = msg.value * totalAirdropPercentages / 100;
            amountOfActualAirdrop = _depositToAirdropFunds(amountOfAirdrop);
        }

        uint256 amountOfStakingRewards = msg.value - amountOfTeam - amountOfActualAirdrop;
        _depositToStakingRewards(amountOfStakingRewards);
    }
}
