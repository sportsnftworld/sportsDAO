const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getContractAddress } = require("@ethersproject/address");

describe("Treasury", function() {
    before(async function() {
        [deployer, governance, member1, member2, member3, user1, user2, user3] = await ethers.getSigners()

        Token = await ethers.getContractFactory("Qatar2022MetaverseWorldCup")
        SponsorEngagement = await ethers.getContractFactory("SponsorEngagement")
        Staking = await ethers.getContractFactory("Qatar2022MetaverseClub")
        Treasury = await ethers.getContractFactory("Treasury")

        currentTimestamp = (await ethers.provider.getBlock()).timestamp
        transactionCount = await deployer.getTransactionCount()

        treasuryAddress = getContractAddress({
            from: deployer.address,
            nonce: transactionCount + 2
        })

        token = await Token.deploy(currentTimestamp + 10000, treasuryAddress)
        staking = await Staking.deploy(token.address)
        treasury = await Treasury.deploy(
            governance.address, 
            staking.address, 
            [member1.address, member2.address, member3.address],
            [20, 20, 10]
        )
    })

    describe("Deployment", () => {
        it("Should assign the correct attributes", async () => {
            expect(await token.TREASURY()).to.equal(treasury.address)
            expect(await staking.asset()).to.equal(token.address)
            expect(await treasury.governance()).to.equal(governance.address)
            expect(await treasury.staking()).to.equal(staking.address)
            expect(await treasury.totalMembersCount()).to.equal(3)
            expect(await treasury.totalEquities()).to.equal(50)
        })
    })

    describe("Token", () => {
        it("Should be minted after start time", async () => {
            await expect(token.mint(5)).to.be.revertedWith("Not started yet")

            await ethers.provider.send("evm_setNextBlockTimestamp", [
                currentTimestamp + 10000,
              ]);
            await ethers.provider.send("evm_mine");

            await token.connect(user1).mint(5, {
                value: ethers.utils.parseEther("500")
            })
            await token.connect(user2).mint(10, {
                value: ethers.utils.parseEther("1000")
            })
            await token.connect(user3).mint(8, {
                value: ethers.utils.parseEther("800")
            })

            expect(await token.balanceOf(user1.address)).to.equal(5)
            expect(await token.balanceOf(user2.address)).to.equal(10)
            expect(await token.balanceOf(user3.address)).to.equal(8)
        })

        it("Should be staked by the users", async () => {
            await expect(staking.connect(user1).stake([1, 2, 3, 4, 5], 5 * 7 * 24 * 60 * 60))
                .to.be.revertedWith("ERC721: transfer caller is not owner nor approved")
            
            await token.connect(user1).setApprovalForAll(staking.address, true)
            await token.connect(user2).setApprovalForAll(staking.address, true)
            await token.connect(user3).setApprovalForAll(staking.address, true)

            await staking.connect(user1).stake([1, 2, 3, 4, 5], 5 * 7 * 24 * 60 * 60) // 5 weeks
            await staking.connect(user2).stake([6, 7, 8, 9, 10], 5 * 7 * 24 * 60 * 60) // 5 weeks
            await staking.connect(user3).stake([16, 17, 18], 5 * 7 * 24 * 60 * 60) // 5 weeks
        })

        it("Minting fee should be withdrawn to the treasury", async () => {
            expect(await ethers.provider.getBalance(treasury.address)).to.equal(0)
            expect(await ethers.provider.getBalance(token.address)).to.equal(
                ethers.utils.parseEther("2300")
            )

            await token.withdraw()
            expect(await ethers.provider.getBalance(treasury.address)).to.equal(
                ethers.utils.parseEther("2300")
            )
        })
    })
})
