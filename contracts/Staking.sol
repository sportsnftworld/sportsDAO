//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Qatar2022MetaverseClub is IERC721Receiver {
    struct StakingAgreement {
        uint256 tokenId;
        uint256 lockStart;
        uint256 lockEnd;
    }

    struct Staker {
        // total count of {asset} staked
        uint256 totalStakingCount;
        // total staking weight
        uint256 totalStakingWeight;
        // rewards to subtract from total rewards
        uint256 subtractRewards;
        // rewards to add to total rewards
        uint256 addRewards;
        // array of staking agreement
        StakingAgreement[] stakingAgreements;
    }

    IERC721 public immutable asset;

    uint256 public totalStakingCount;

    uint256 public totalStakingWeight;

    uint256 public totalRewards;

    uint256 public constant MINIMUM_LOCK_PERIOD = 4 weeks;
    uint256 public constant MAXIMUM_LOCK_PERIOD = 26 weeks;
    uint256 public constant STAKING_WEIGHT_MULTIPLIER = 1e12;

    uint256 public cumulatedTotalRewardsPerWeight;

    mapping (address => Staker) public stakers;

    constructor(address _asset) {
        asset = IERC721(_asset);
    }

    event Staked(address indexed user, uint256 count, uint256 lockPeriod);

    event Unstaked(address indexed user, uint256 count);

    event ClaimedRewards(address indexed user, uint256 amount);

    event DistributedRewards(address indexed src, uint256 amount);

    function getStakingAgreementsLength(address user) external view returns (uint256) {
        return stakers[user].stakingAgreements.length;
    }

    function getStakingAgreement(address user, uint256 stakingAgreementId) external view returns (StakingAgreement memory) {
        return stakers[user].stakingAgreements[stakingAgreementId];
    }

    function stake(uint256[] calldata tokenIds, uint256 lockPeriod) external {
        require(lockPeriod >= MINIMUM_LOCK_PERIOD && lockPeriod <= MAXIMUM_LOCK_PERIOD, "Invalid lock period");
        require(tokenIds.length > 0, "Invalid token");

        uint256 lockStart = block.timestamp;
        uint256 stakingCount = tokenIds.length;

        Staker storage staker = stakers[msg.sender];

        for (uint256 i = 0; i < stakingCount; i++) {
            require(asset.ownerOf(tokenIds[i]) == msg.sender, "Invalid owner");
            asset.safeTransferFrom(msg.sender, address(this), tokenIds[i]);

            staker.stakingAgreements.push(
                StakingAgreement({
                    tokenId: tokenIds[i],
                    lockStart: lockStart,
                    lockEnd: lockStart + lockPeriod
                })
            );
        }

        staker.totalStakingCount += stakingCount;
        uint256 stakingWeight = calculateStakingWeight(stakingCount, lockPeriod);
        staker.totalStakingWeight += stakingWeight;
        staker.subtractRewards += (stakingWeight * cumulatedTotalRewardsPerWeight) / STAKING_WEIGHT_MULTIPLIER;

        totalStakingCount += stakingCount;
        totalStakingWeight += stakingWeight;

        emit Staked(msg.sender, stakingCount, lockPeriod);
    }

    function unstake(uint256[] calldata stakingAgreementIds) external {
        require(stakingAgreementIds.length > 0, "Invalid IDs");
        Staker storage staker = stakers[msg.sender];

        uint256 unstakingCount = stakingAgreementIds.length;
        uint256 unstakingWeight;

        for (uint256 i = 0; i < unstakingCount; i++) {
            StakingAgreement storage stakingAgreement = staker.stakingAgreements[i];
            uint256 tokenId = stakingAgreement.tokenId;
            require(tokenId > 0, "Invalid ID");
            require(stakingAgreement.lockEnd <= block.timestamp, "Still locked");

            unstakingWeight += calculateStakingWeight(1, stakingAgreement.lockEnd - stakingAgreement.lockStart);
            stakingAgreement.tokenId = 0;
            asset.safeTransferFrom(address(this), msg.sender, tokenId);
        }

        staker.totalStakingCount -= unstakingCount;
        staker.totalStakingWeight -= unstakingWeight;
        staker.addRewards += (unstakingWeight * cumulatedTotalRewardsPerWeight) / STAKING_WEIGHT_MULTIPLIER;

        totalStakingCount -= unstakingCount;
        totalStakingWeight -= unstakingWeight;

        emit Unstaked(msg.sender, unstakingCount);
    }

    function claimRewards() external {
        Staker storage staker = stakers[msg.sender];

        uint256 _totalRewards = staker.totalStakingWeight * cumulatedTotalRewardsPerWeight / STAKING_WEIGHT_MULTIPLIER;
        uint256 claimedRewards = _totalRewards + staker.addRewards - staker.subtractRewards;
        require(claimedRewards > 0, "No pending rewards");

        staker.subtractRewards += claimedRewards;
        payable(msg.sender).transfer(claimedRewards);

        emit ClaimedRewards(msg.sender, claimedRewards);
    }

    function getPendingRewards(address user) external view returns (uint256) {
        Staker storage staker = stakers[user];

        uint256 _totalRewards = staker.totalStakingWeight * cumulatedTotalRewardsPerWeight / STAKING_WEIGHT_MULTIPLIER;
        return _totalRewards + staker.addRewards - staker.subtractRewards;
    }

    function calculateStakingWeight(uint256 tokenCount, uint256 lockPeriod) pure public returns (uint256) {
        return tokenCount * lockPeriod;
    }

    function distributeRewards() external payable {
        require(msg.value > 0, "No rewards");
        require(totalStakingWeight > 0, "No stakers yet");

        cumulatedTotalRewardsPerWeight += (msg.value * STAKING_WEIGHT_MULTIPLIER) / totalStakingWeight;
        totalRewards += msg.value;

        emit DistributedRewards(msg.sender, msg.value);
    }

    function onERC721Received(
        address,
        address from,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        require(from != address(0x0), "Not allowed mint and stake");
        return IERC721Receiver.onERC721Received.selector;
    }
}