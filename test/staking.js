const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking contract", () => {
    before(async () => {
        [deployer, treasury, user1, user2, user3] = await ethers.getSigners()

        Qatar2022MetaverseWorldCup = await ethers.getContractFactory("Qatar2022MetaverseWorldCup")
        qatar2022Meta = await Qatar2022MetaverseWorldCup.deploy(0, treasury.address)
        await qatar2022Meta.deployed()

        Qatar2022MetaverseClub = await ethers.getContractFactory("Qatar2022MetaverseClub")
        qatar2022MetaClub = await Qatar2022MetaverseClub.deploy(qatar2022Meta.address)
        await qatar2022MetaClub.deployed()

        // user1: [1, 2, 3, 4, 5]
        await qatar2022Meta.connect(user1).mint(5, {
            value: ethers.utils.parseEther('100').mul(5)
        })
        await qatar2022Meta.connect(user1).setApprovalForAll(qatar2022MetaClub.address, true)

        // user2: [6, 7, 8, 9, 10, 11, 12]
        await qatar2022Meta.connect(user2).mint(7, {
            value: ethers.utils.parseEther('100').mul(7)
        })
        await qatar2022Meta.connect(user2).setApprovalForAll(qatar2022MetaClub.address, true)

        // user3: [13, 14, 15, 16, 17, 18, 19, 20]
        await qatar2022Meta.connect(user3).mint(8, {
            value: ethers.utils.parseEther('100').mul(8)
        })
        await qatar2022Meta.connect(user3).setApprovalForAll(qatar2022MetaClub.address, true)
    })

    describe("Deployment", () => {
        it("Should assign the correct asset address", async () => {
            _asset = await qatar2022MetaClub.asset()
            expect(_asset).to.equal(qatar2022Meta.address)
        })
    })

    describe("User", () => {
        it("Should not be able to stake less than min lock period", async () => {
            currentTimestamp = (await ethers.provider.getBlock()).timestamp

            await expect(qatar2022MetaClub.connect(user1).stake([], 4 * 7 * 24 * 60 * 60 + 100))
                .to.be.revertedWith("Invalid token")
            await expect(qatar2022MetaClub.connect(user1).stake([1, 2, 3], 4 * 7 * 24 * 60 * 60 - 100))
                .to.be.revertedWith("Invalid lock period")
            await expect(qatar2022MetaClub.connect(user1).stake([1, 2, 3], 26 * 7 * 24 * 60 * 60 + 100))
                .to.be.revertedWith("Invalid lock period")

            await qatar2022MetaClub.connect(user1).stake([1, 2, 3], 4 * 7 * 24 * 60 * 60)
        })
        it("Should not be able to stake other holder\'s token", async () => {
            await expect(qatar2022MetaClub.connect(user1).stake([1, 2, 6], 4 * 7 * 24 * 60 * 60 + 100))
                .to.be.revertedWith("Invalid owner")
        })
        it("Should not be able to unstake before lock period is over", async () => {
            await expect(qatar2022MetaClub.connect(user1).unstake([]))
                .to.be.revertedWith("Invalid IDs")
            await expect(qatar2022MetaClub.connect(user1).unstake([0, 1, 2]))
                .to.be.revertedWith("Still locked")

            await ethers.provider.send("evm_setNextBlockTimestamp", [
                currentTimestamp + 4 * 7 * 24 * 60 * 60 + 1000 + 100,
                ]);
            await ethers.provider.send("evm_mine");
        })
        it("Should be able to unstake after lock period is over", async () => {
            expect(await qatar2022Meta.balanceOf(user1.address)).to.equal(2)
            await qatar2022MetaClub.connect(user1).unstake([0, 1, 2])
            expect(await qatar2022Meta.balanceOf(user1.address)).to.equal(5)
        })
        it("Should not be able to unstake again", async () => {
            await expect(qatar2022MetaClub.connect(user1).unstake([0, 1, 2]))
                .to.be.revertedWith("Invalid ID")
        })
        it("Should not be able to claim zero rewards", async () => {
            await expect(qatar2022MetaClub.connect(user1).claimRewards())
                .to.be.revertedWith("No pending rewards")
        })
    })

    describe("Rewards", () => {
        before(async () => {
            await qatar2022MetaClub.connect(user1).stake([1, 2, 3], 4 * 7 * 24 * 60 * 60)
            await qatar2022MetaClub.connect(user2).stake([6, 7, 8], 8 * 7 * 24 * 60 * 60)

            await qatar2022MetaClub.connect(treasury).distributeRewards({
                value: ethers.utils.parseEther("36")
            })

            await qatar2022MetaClub.connect(user3).stake([13, 14, ], 10 * 7 * 24 * 60 * 60)
        })
        it("Should be distributed by the staking weight", async () => {
            user1PendingRewards = await qatar2022MetaClub.getPendingRewards(user1.address)
            user2PendingRewards = await qatar2022MetaClub.getPendingRewards(user2.address)
            user3PendingRewards = await qatar2022MetaClub.getPendingRewards(user3.address)

            expect(user2PendingRewards).to.gte(user1PendingRewards.mul(2))
            expect(user3PendingRewards).to.equal(0)

            user1OldBalance = await ethers.provider.getBalance(user1.address)
            user2OldBalance = await ethers.provider.getBalance(user2.address)
            await qatar2022MetaClub.connect(user1).claimRewards()
            await qatar2022MetaClub.connect(user2).claimRewards()
            user1NewBalance = await ethers.provider.getBalance(user1.address)
            user2NewBalance = await ethers.provider.getBalance(user2.address)

            await expect(qatar2022MetaClub.claimRewards()).to.be.revertedWith("No pending rewards")

            user1ClaimedRewards = user1NewBalance.sub(user1OldBalance)
            user2ClaimedRewards = user2NewBalance.sub(user2OldBalance)

            expect(user1ClaimedRewards).to.gt(ethers.utils.parseEther('11.999'))
            expect(user1ClaimedRewards).to.lt(ethers.utils.parseEther('12'))

            expect(user2ClaimedRewards).to.gt(ethers.utils.parseEther('23.999'))
            expect(user2ClaimedRewards).to.lt(ethers.utils.parseEther('24'))
        })
        it("Should be cleared after claimed rewards", async () => {
            user1PendingRewards = await qatar2022MetaClub.getPendingRewards(user1.address)
            user2PendingRewards = await qatar2022MetaClub.getPendingRewards(user2.address)

            expect(user1PendingRewards).to.equal(0)
            expect(user2PendingRewards).to.equal(0)
        })
    })
})
