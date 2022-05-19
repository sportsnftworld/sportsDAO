//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SponsorEngagement is Ownable {
    struct Sponsor{
        address sponsor;
        string logoUrl;
        uint256 jerseys;
        uint256 created;
        bool isFixed;
    }

    Sponsor[] public sponsors;

    /// @dev number of sponsors and total jerseys, they required
    uint256 public totalSponsors;
    uint256 public totalRequiredJerseys;

    /// @dev number of fixed sponsors
    uint256 public totalFixedSponsors;

    /// @dev show ads in player's jersey in NFT
    uint256 public sponsorFeePerJersey = 10 ether;

    /// @dev Fixed Sponsor means: showing ads in all NFT
    uint256 public sponsorFixedFee = 2000 ether;

    uint256 public constant MAX_NFTS = 9900;

    address public immutable TREASURY;

    event Engaged(address indexed applicant, string logoUrl, uint256 jerseys, bool isFixed);

    constructor(address _treasury) Ownable() {
        require(_treasury != address(0), "Invalid treasury");
        TREASURY = _treasury;
    }

    function engage(string memory logoUrl, uint256 jerseys, bool isFixed) external payable {
        require(bytes(logoUrl).length > 0 && bytes(logoUrl).length < 1024, "Invalid logo");
        require(
            (isFixed && msg.value >= sponsorFixedFee) || 
            (!isFixed && msg.value >= sponsorFeePerJersey * jerseys), 
            "Not enough fee"
        );

        if (!isFixed) {
            require(totalRequiredJerseys + jerseys <= MAX_NFTS, "Too many jerseys");
        }

        sponsors.push(Sponsor({
            sponsor: msg.sender,
            logoUrl: logoUrl,
            jerseys: isFixed ? 0 : jerseys,
            created: block.timestamp,
            isFixed: isFixed
        }));

        if (!isFixed) {
            totalSponsors ++;
            totalRequiredJerseys += jerseys;
        } else {
            totalFixedSponsors ++;
        }

        emit Engaged(msg.sender, logoUrl, jerseys, isFixed);
    }

    function setSponsorFee(uint256 _sponsorFee) external onlyOwner {
        require(_sponsorFee > 0, "Invalid Fee");

        sponsorFeePerJersey = _sponsorFee;
    }

    function setFixedSponsorFee(uint256 _sponsorFixedFee) external onlyOwner {
        require(_sponsorFixedFee > 0, "Invalid Fee");

        sponsorFixedFee = _sponsorFixedFee;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = TREASURY.call{value: address(this).balance}("");
        require(success, "Unable to withdraw");
    }
}
