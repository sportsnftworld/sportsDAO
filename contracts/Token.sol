//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract Qatar2022MetaverseWorldCup is Ownable, ERC721Enumerable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter internal _tokenId;

    // [TODO] Update it as 9,900
    uint256 public constant MAX_NFTS = 99;

    uint256 public startingIndex;
    uint256 public startingIndexBlock;

    uint256 public mintPrice = 100 ether;
    uint256 public maximumAmount = 10;

    uint256 public startTimestamp;
    uint256 public revealTimestamp;
    uint256 public bought = 0;

    string public _baseTokenURI = "";

    address public immutable TREASURY;

    constructor(uint256 _startTimestamp, address _treasury) ERC721("Qatar2022MetaverseWorldCup", "Qatar2022META") Ownable() {
        startTimestamp = _startTimestamp;
        revealTimestamp = block.timestamp + 8 weeks;

        TREASURY = _treasury;
    }

    function _mintInternal(address user) internal {
        _tokenId.increment();
        uint256 newTokenId = _tokenId.current();
        _safeMint(user, newTokenId);
    }

    function mint(uint256 quantity) external payable {
        require(block.timestamp >= startTimestamp, "Not started yet");
        require(quantity > 0, "Invalid amount");
        require(bought < MAX_NFTS, "Sold out");

        if (quantity > maximumAmount) {
            quantity = maximumAmount;
        }
        if (quantity > (MAX_NFTS - bought)) {
            quantity = MAX_NFTS - bought;
        }
        require(msg.value >= mintPrice * quantity, "Not enough value");

        bought += quantity;
        uint256 remaining = msg.value - (mintPrice * quantity);
        if (remaining > 0) {
            payable(msg.sender).transfer(remaining);
        }

        for (uint256 i = 0; i < quantity; i++) {
            _mintInternal(msg.sender);
        }

        if (startingIndexBlock == 0 && (bought == MAX_NFTS || block.timestamp >= revealTimestamp))
        {
            startingIndexBlock = block.number;
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setStartingIndex() external {
        require(startingIndex == 0, "Starting index is already set");
        require(startingIndexBlock != 0, "Starting index block must be set");

        startingIndex = uint(blockhash(startingIndexBlock)) % MAX_NFTS;

        if (block.number - startingIndexBlock > 255) {
            startingIndex = uint(blockhash(block.number - 1)) % MAX_NFTS;
        }

        if (startingIndex == 0) {
            startingIndex = startingIndex + 1;
        }
    }
    
    // ======================================================================
    /// @dev admin features
    // ======================================================================

    function setRevealTimestamp(uint256 timestamp) external onlyOwner {
        require(timestamp != revealTimestamp, "No repeats");

        revealTimestamp = timestamp;
    }

    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        require(newMintPrice != mintPrice, "No repeats");

        mintPrice = newMintPrice;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function withdraw() external onlyOwner {
        payable(TREASURY).transfer(address(this).balance);
    }
}
