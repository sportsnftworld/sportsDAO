//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MatchBetting is Ownable {
    struct StakerInfo {
        uint256 goalPairId;
        uint256 amount;
        uint256 withdrawn;
    }

    struct GoalPair {
        /// @dev number of staked members
        uint256 totalStakers;
        /// @dev total amount of staked value
        uint256 totalAmount;
    }

    /// @dev URI of match events channel
    string public referenceURI;

    /// @dev name of teams, to identify
    string public team1;
    string public team2;

    /// @dev name of stadium
    string public stadium;
    
    /// @dev kick-off timestamp of corresponding match
    uint256 public kickOffTime;

    /// @dev minimum stake amount
    uint256 public minStakeAmount;

    /// @dev final match result
    uint256 public finalResultOfGoalPair;

    /// @dev User's staked amount, and goals
    mapping(address => StakerInfo) public staked;

    /// @dev Goals selection details with total staked users count, and amount
    mapping(uint256 => GoalPair) public goalPairsList;

    /// @dev number of users staked already
    uint256 public totalStakedUsers;

    /// @dev total amount of betted
    uint256 public totalStakedAmount;

    /// @dev multiplier of odds rate, to mitigate rounding loss
    uint256 public constant ODDS_MULTIPLIER = 1e5;

    /// @dev maximum number of goals that any team can get in a single match
    uint256 public constant MAXIMUM_GOALS = 100;

    /// @dev minimum amount required to bet
    uint256 public constant MINIMUM_STAKE_AMOUNT = 5 ether;

    constructor(
        string memory referenceURI_,
        string memory team1_,
        string memory team2_,
        string memory stadium_,
        uint256 kickOffTime_
    ) Ownable() {
        referenceURI = referenceURI_;

        team1 = team1_;
        team2 = team2_;
        stadium = stadium_;

        kickOffTime = kickOffTime_;
    }

    /// @dev stake with anticipated goals of two teams
    function stake(uint256 team1Goals, uint256 team2Goals) external payable beforeKickOff {
        require(team1Goals < MAXIMUM_GOALS && team2Goals < MAXIMUM_GOALS, "Invalid goals");
        require(team1Goals != team2Goals, "Draw not allowed");
        require(msg.value >= MINIMUM_STAKE_AMOUNT, "Too small amount");

        StakerInfo storage stakerInfo = staked[msg.sender];
        require(stakerInfo.amount == 0, "Not allowed multiple staking");

        uint256 goalPairId = getGoalId(team1Goals, team2Goals);
        GoalPair storage goalPair = goalPairsList[goalPairId];

        stakerInfo.goalPairId = goalPairId;
        stakerInfo.amount = msg.value;

        goalPair.totalStakers ++;
        goalPair.totalAmount += msg.value;

        totalStakedUsers ++;
        totalStakedAmount += msg.value;
    }

    function restake(uint256 team1Goals, uint256 team2Goals) external payable beforeKickOff {
        require(team1Goals < MAXIMUM_GOALS && team2Goals < MAXIMUM_GOALS, "Invalid goals");
        require(team1Goals != team2Goals, "Draw not allowed");

        StakerInfo storage stakerInfo = staked[msg.sender];
        require(stakerInfo.amount > 0, "Not staked already");

        uint256 oldGoalPairId = stakerInfo.goalPairId;
        uint256 stakedAmount = stakerInfo.amount;

        uint256 newGoalPairId = getGoalId(team1Goals, team2Goals);
        require(oldGoalPairId != newGoalPairId, "Same as before");

        stakerInfo.goalPairId = newGoalPairId;

        GoalPair storage oldGoalPair = goalPairsList[oldGoalPairId];
        oldGoalPair.totalAmount -= stakedAmount;
        oldGoalPair.totalStakers --;

        GoalPair storage newGoalPair = goalPairsList[newGoalPairId];
        newGoalPair.totalAmount += stakedAmount;
        newGoalPair.totalStakers ++;
    }

    /// @dev withdraw win amount after win
    function withdraw() external afterFinish {
        require(finalResultOfGoalPair != 0, "Not determined result");

        StakerInfo storage stakerInfo = staked[msg.sender];
        require(stakerInfo.amount > 0, "Not staked already");
        require(stakerInfo.goalPairId == finalResultOfGoalPair, "Not winner");

        GoalPair storage goalPair = goalPairsList[finalResultOfGoalPair];

        uint256 rewardsAmount = totalStakedAmount * stakerInfo.amount * 9 / goalPair.totalAmount / 10;
        uint256 withdrawnAmount = rewardsAmount - stakerInfo.withdrawn;

        stakerInfo.withdrawn += withdrawnAmount;

        payable(msg.sender).transfer(withdrawnAmount);
    }

    /// @dev returns potential win amount of staker who already staked
    function odds(address staker) public view beforeKickOff returns (uint256) {
        StakerInfo storage stakerInfo = staked[staker];
        uint256 stakedAmount = stakerInfo.amount;

        require(stakedAmount > 0, "Not staked already");

        GoalPair storage goalPair = goalPairsList[stakerInfo.goalPairId];

        /// @dev 10% of staked amount will be returned to treasury, for the purpose of nft-staking dividends
        uint256 estimatedRewards = address(this).balance * stakedAmount * 9 / goalPair.totalAmount / 10;

        return estimatedRewards * ODDS_MULTIPLIER / stakedAmount;
    }

    /// @dev estimate odds for upcoming staking activity
    function estimateOdds(
        uint256 team1Goals, 
        uint256 team2Goals, 
        uint256 stakeAmount
    ) external view beforeKickOff returns (uint256) {
        require(team1Goals < MAXIMUM_GOALS && team2Goals < MAXIMUM_GOALS, "Invalid goals");
        require(team1Goals != team2Goals, "Draw not allowed");
        require(stakeAmount >= MINIMUM_STAKE_AMOUNT, "Too small amount");

        uint256 goalPairId = getGoalId(team1Goals, team2Goals);
        GoalPair storage goalPair = goalPairsList[goalPairId];

        /// @dev 10% of staked amount will be returned to treasury, for the purpose of nft-staking dividends
        uint256 estimatedRewards = 
            (address(this).balance + stakeAmount) * stakeAmount * 9 / 
            (goalPair.totalAmount + stakeAmount) / 10;

        return estimatedRewards * ODDS_MULTIPLIER / stakeAmount;
    }

    function getGoalId(uint256 team1Goals, uint256 team2Goals) public pure returns (uint256) {
        return team1Goals * MAXIMUM_GOALS + team2Goals;
    }


    modifier beforeKickOff() {
        require(block.timestamp < kickOffTime, "Kicked off");
        _;
    }

    modifier afterFinish() {
        require(block.timestamp >= kickOffTime + 60 * 60 * 48, "Not finished");
        _;
    }
}