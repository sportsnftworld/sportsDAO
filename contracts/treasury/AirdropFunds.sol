//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AirdropFunds {
    /// @dev ERC721 token holders info, to whom airdrop will be given.
    struct ERC721AirdropObject {
        address collection;
        uint256 tokenId;
        uint256 percentage;
        uint256 withdrawn;
    }

    /// @dev total amount of funds, assigned to airdropping
    uint256 public totalAmountOfAirdrop;

    /// @dev total left amount of funds for airdropping
    uint256 public leftAmountOfAirdrop;

    /// @dev maximum amount of airdrop funds
    uint256 public maximumAmountOfAirdrop;

    /// @dev Sum of {percentage} of all airdrop objects
    uint256 public totalAirdropPercentages;

    /// @dev Sum of {percentage} of all registered airdrop objects
    uint256 public registeredAirdropPercentages;

    ERC721AirdropObject[] public airdrops;

    event RegisterAirdropObject(address collection, uint256 tokenId, uint256 percentage);

    function _initiailizeAirdrop(uint256 _maxAmount, uint256 _totalAirdropPercentages) internal {
        require(_maxAmount > 0 && _totalAirdropPercentages < 100, "Invalid airdrop conf");

        maximumAmountOfAirdrop = _maxAmount;
        totalAirdropPercentages = _totalAirdropPercentages;
    }

    function _registerAirdropObject(address _collection, uint256 _tokenId, uint256 _percentage) internal {
        require(_collection != address(0) && _tokenId > 0 && _percentage > 0, "Invalid NFT");

        for (uint256 i = 0; i < airdrops.length; i++) {
            ERC721AirdropObject storage _item = airdrops[i];

            require(_item.collection != _collection || _item.tokenId != _tokenId, "Duplicate airdrop");
        }

        airdrops.push(
            ERC721AirdropObject({
                collection: _collection,
                tokenId: _tokenId,
                percentage: _percentage,
                withdrawn: 0
            })
        );

        registeredAirdropPercentages += _percentage;
        require(registeredAirdropPercentages <= totalAirdropPercentages, "Invalid percentage");

        emit RegisterAirdropObject(_collection, _tokenId, _percentage);
    }

    /// @dev whenever deposit funds to airdrop, total amount should not exceed the maximum limit
    function _depositToAirdropFunds(uint256 _amount) internal returns (uint256 depositedAmount) {
        if (totalAmountOfAirdrop + _amount < maximumAmountOfAirdrop) {
            depositedAmount = _amount;
            totalAmountOfAirdrop += _amount;
        } else {
            depositedAmount = maximumAmountOfAirdrop - totalAmountOfAirdrop;
            totalAmountOfAirdrop = maximumAmountOfAirdrop;
        }

        leftAmountOfAirdrop += depositedAmount;

        require(depositedAmount > 0, "Invalid deposit");
    }

    /// @dev Check valid token holders, and transfer airdrop amount
    function withdrawAirdrop(uint256 airdropId) external {
        require(totalAmountOfAirdrop > 0, "No fund yet");
        require(airdropId >= 0 && airdropId < airdrops.length, "Invalid Airdrop ID");

        ERC721AirdropObject storage airdrop = airdrops[airdropId];
        IERC721 collection = IERC721(airdrop.collection);

        require(collection.ownerOf(airdrop.tokenId) == msg.sender, "Invalid owner");

        uint256 _amount = totalAmountOfAirdrop *  airdrop.percentage / totalAirdropPercentages;
        require(_amount > airdrop.withdrawn, "Already withdrawn");

        uint256 _withdrawAmount = _amount - airdrop.withdrawn;
        airdrop.withdrawn = _amount;

        require(_withdrawAmount <= leftAmountOfAirdrop, "Invalid withdraw");
        leftAmountOfAirdrop -= _withdrawAmount;

        payable(msg.sender).transfer(_withdrawAmount);
    }
}
