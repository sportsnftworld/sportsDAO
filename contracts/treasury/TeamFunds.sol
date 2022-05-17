//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract TeamFunds {
    struct TeamMember {
        uint256 equity;
        uint256 withdrawn;
    }

    /// @dev total amount of funds, assigned to team members
    uint256 public totalAmountOfTeam;

    /// @dev number of team members
    uint256 public totalMembersCount;

    /// @dev Sum of {equity} of all members
    uint256 public totalEquities;

    mapping(address => TeamMember) public team;

    /// @dev It should be called only in the constructor, to avoid wrong calculation result
    function _registerTeamMember(address _member, uint256 _equity) internal {
        require(address(_member) != address(0), "Invalid address");
        require(_equity != 0, "Invalid equity");

        TeamMember storage member = team[_member];
        require(member.equity == 0 && member.withdrawn == 0, "Already registered");

        member.equity = _equity;
        
        totalMembersCount ++;
        totalEquities += _equity;
    }

    function _depositToTeamFunds(uint256 _amount) internal {
        require(_amount > 0, "Invalid amount");

        totalAmountOfTeam += _amount;
    }

    /// @dev Check address validity, and transfer equity of income to wallet
    function withdraw(uint256 _amount) external {
        TeamMember storage member = team[msg.sender];

        require(member.equity > 0, "Invalid address");
        require(totalAmountOfTeam > 0, "No fund yet");

        uint256 totalAmount = totalAmountOfTeam * member.equity / totalEquities;
        require(totalAmount - member.withdrawn >= _amount, "Too many amount");

        member.withdrawn += _amount;
        payable(msg.sender).transfer(_amount);
    }
}
