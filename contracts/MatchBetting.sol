//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MatchBetting is Ownable{
    struct StakerInfo {
        uint256 goalsSelection;
        uint256 amount;
    }

    struct GoalsSelection {
        uint256 totalStakers;
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

    /// @dev User's staked amount, and goals
    mapping(address => StakerInfo) public staked;

    /// @dev Goals selection details with total staked users count, and amount
    mapping(uint256 => GoalsSelection) public goalsSelected;

    /// @dev number of users staked already
    uint256 public totalStakedUsers;

    /// @dev multiplier of odds rate, to mitigate rounding loss
    uint256 public constant ODDS_MULTIPLIER = 1e5;

    /// @dev maximum number of goals that any team can get in a single match
    uint256 public constant MAXIMUM_GOALS = 100;

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
        require(team1Goals != team2Goals, "Draw not allowed");
        require(team1Goals < MAXIMUM_GOALS && team2Goals < MAXIMUM_GOALS, "Invalid goals");

        StakerInfo storage userInfo = staked[msg.sender];
        require(userInfo.amount == 0, "Not allowed multiple staking");

        uint256 goalsSelection = team1Goals * MAXIMUM_GOALS + team2Goals;
        GoalsSelection storage goalsInfo = goalsSelected[goalsSelection];

        userInfo.goalsSelection = goalsSelection;
        userInfo.amount = msg.value;
        goalsInfo.totalStakers ++;
        goalsInfo.totalAmount += msg.value;
    }

    function restake(uint256 team1Goals, uint256 team2Goals) external payable beforeKickOff {
        require(team1Goals != team2Goals, "Draw not allowed");
        require(team1Goals < MAXIMUM_GOALS && team2Goals < MAXIMUM_GOALS, "Invalid goals");

    }

    /// @dev withdraw win amount after win
    function withdraw() external afterFinish {

    }

    function getGoalId(uint256 team1Goals, uint256 team2Goals) external pure returns (uint256) {
        return team1Goals * MAXIMUM_GOALS + team2Goals;
    }

    /// @dev returns potential win amount of user who already staked
    function odds(address user) public view returns (uint256) {

    }

    /// @dev estimate odds for upcoming staking activity
    function estimateOdds(uint256 team1Goals, uint256 team2Goals, uint256 stakeAmount) external view returns (uint256) {

    }


    modifier beforeKickOff() {
        require(block.timestamp < kickOffTime, "Kicked off");
        _;
    }

    modifier afterFinish() {
        require(block.timestamp >= kickOffTime + 60 * 60 * 24, "Not finished");
        _;
    }
}