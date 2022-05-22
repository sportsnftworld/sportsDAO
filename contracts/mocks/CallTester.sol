//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract CallTester {
    uint256 public airdrop;

    function setAirdrop(uint256 _newAirdropId) external {
        airdrop = _newAirdropId;
    }

    function setAirdropWithVal(uint256 _newAirdropId) external payable {
        require(msg.value > 0.01 ether, "Invalid value");

        airdrop = _newAirdropId;
    }
}

