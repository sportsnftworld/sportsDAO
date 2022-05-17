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

    /// @dev maximum amount of airdrop funds
    uint256 public maximumAmountOfAirdrop;

    /// @dev length of {aidrops}
    uint256 public totalAirdropCount;

    /// @dev Sum of {percentage} of all aidrop objects
    uint256 public totalPercentages;

    ERC721AirdropObject[] public airdrops;

    function initiailizeAirdrop(uint256 _maxAmount, uint256 _totalPercentages) internal {
        require(_maxAmount > 0 && _totalPercentages < 100, "Invalid airdrop conf");

        maximumAmountOfAirdrop = _maxAmount;
        totalPercentages = _totalPercentages;
    }

    function _registerAirdropObject(address _collection, uint256 _tokenId, uint256 _percentage) internal {
        require(_collection != address(0) && _tokenId > 0, "Invalid NFT");

        for (uint256 i = 0; i < totalAirdropCount; i++) {
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

        totalAirdropCount ++;
    }

    function _depositToAirdropFunds(uint256 _amount) internal {

    }

    /// @dev Check valid token holders, and transfer airdrop amount
    function withdrawAirdrop(uint256 airdropId) external {
        require(airdropId >= 0 && airdropId < totalAirdropCount, "Invalid ID");

        ERC721AirdropObject storage airdrop = airdrops[airdropId];
        IERC721 collection = IERC721(airdrop.collection);

        require(collection.ownerOf(airdrop.tokenId) == msg.sender, "Invalid owner");

        uint256 _amount = totalAmountOfAirdrop *  airdrop.percentage / totalPercentages;
        require(_amount > airdrop.withdrawn, "Already withdrawn");

        uint256 _withdrawAmount = _amount - airdrop.withdrawn;
        airdrop.withdrawn = _amount;

        payable(msg.sender).transfer(_withdrawAmount);
    }
}
