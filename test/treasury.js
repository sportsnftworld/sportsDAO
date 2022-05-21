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
        sponsor = await SponsorEngagement.deploy(treasury.address)
    })

    describe("Deployment", () => {
        it("Should assign the correct attributes", async () => {
            expect(await token.TREASURY()).to.equal(treasury.address)
            expect(await staking.asset()).to.equal(token.address)
            expect(await treasury.governance()).to.equal(governance.address)
            expect(await treasury.staking()).to.equal(staking.address)
            expect(await treasury.totalMembersCount()).to.equal(3)
            expect(await treasury.totalEquities()).to.equal(50)
            expect(await sponsor.TREASURY()).to.equal(treasury.address)

            member1Info = await treasury.connect(member1).queryTeamInfo()
            member2Info = await treasury.connect(member2).queryTeamInfo()
            member3Info = await treasury.connect(member3).queryTeamInfo()
            expect(member1Info[0]).to.equal(ethers.BigNumber.from(20))
            expect(member2Info[0]).to.equal(ethers.BigNumber.from(20))
            expect(member3Info[0]).to.equal(ethers.BigNumber.from(10))

            // withdrawn amount
            expect(member1Info[1]).to.equal(0)
            expect(member2Info[1]).to.equal(0)
            expect(member3Info[1]).to.equal(0)
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

    describe("SponsorEngagement", () => {
        it("Fee should be withdrawn to treasury", async () => {
            await sponsor.connect(user1).engage(
                "https://example.com/logo-1.png",
                3,
                false,
                {
                    value: ethers.utils.parseEther("10").mul(3)
                }
            )
            await sponsor.connect(user2).engage(
                "https://example.com/logo-2.png",
                100,
                false,
                {
                    value: ethers.utils.parseEther("10").mul(100)
                }
            )
            await sponsor.connect(user3).engage(
                "https://example.com/logo-3.png",
                0,
                true,
                {
                    value: ethers.utils.parseEther("2000")
                }
            )

            expect(await ethers.provider.getBalance(sponsor.address)).to.equal(ethers.utils.parseEther("3030"))
            await sponsor.withdraw()
            expect(await ethers.provider.getBalance(sponsor.address)).to.equal(0)

            expect(await ethers.provider.getBalance(treasury.address)).to.equal(
                ethers.utils.parseEther("5330")
            )
        })
    })

    describe("Team member", () => {
        it("Should be able to withdraw equity", async () => {
            expect(await treasury.totalAmountOfTeam()).to.equal(ethers.utils.parseEther("2665"))
            expect(await treasury.leftAmountOfTeam()).to.equal(ethers.utils.parseEther("2665"))

            await expect(treasury.withdraw(ethers.utils.parseEther("700"))).to.be.revertedWith("Invalid address")

            // member 1, 20% of total income, 1066
            await treasury.connect(member1).withdraw(ethers.utils.parseEther("700"))
            await expect(treasury.connect(member1).withdraw(ethers.utils.parseEther("367"))).to.be.revertedWith("Too many amount")
            await treasury.connect(member1).withdraw(ethers.utils.parseEther("366"))
            await expect(treasury.connect(member1).withdraw(ethers.utils.parseEther("1"))).to.be.revertedWith("Too many amount")

            expect(await treasury.totalAmountOfTeam()).to.equal(ethers.utils.parseEther("2665"))
            expect(await treasury.leftAmountOfTeam()).to.equal(ethers.utils.parseEther("1599"))

            member1Info = await treasury.connect(member1).queryTeamInfo()
            expect(member1Info[0]).to.equal(ethers.BigNumber.from(20))
            expect(member1Info[1]).to.equal(ethers.utils.parseEther("1066"))

            await treasury.connect(member2).withdraw(ethers.utils.parseEther("300"))
            member2Info = await treasury.connect(member2).queryTeamInfo()
            expect(member2Info[0]).to.equal(ethers.BigNumber.from(20))
            expect(member2Info[1]).to.equal(ethers.utils.parseEther("300"))

            expect(await treasury.leftAmountOfTeam()).to.equal(ethers.utils.parseEther("1299"))
        })
    })

    describe("Airdrop", () => {
        it("Should be able to registered by governance only", async () => {
            await expect(treasury.connect(user1).registerAirdropObject(
                token.address,  // token address
                5,  // token id
                10  // percentage
            )).to.be.revertedWith("Only governance")
            // user1, aidropId: 0
            await treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                5,  // token id
                10  // percentage
            )

            await expect(treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                5,  // token id
                5  // percentage
            )).to.be.revertedWith("Duplicate airdrop")

            // user2, aidropId: 1
            await treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                8,  // token id
                5  // percentage
            )
            // user2, aidropId: 2
            await treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                11,  // token id
                5  // percentage
            )
            // user3, aidropId: 3
            await treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                17,  // token id
                10  // percentage
            )

            await expect(treasury.connect(governance).registerAirdropObject(
                token.address,  // token address
                18,  // token id
                5  // percentage
            )).to.be.revertedWith("Invalid percentage")
        })

        it("Should be executed and send value to user wallet", async () => {
            await expect(
                treasury.connect(user1).withdrawAirdrop(4)
            ).to.be.revertedWith("Invalid Airdrop ID")
            // user staked nft now
            await expect(
                treasury.connect(user1).withdrawAirdrop(0)
            ).to.be.revertedWith("Invalid owner")

            airdropInfo = await treasury.airdrops(2)
            expect(airdropInfo.withdrawn).to.equal(0)
            expect(airdropInfo.percentage).to.equal(5)
            expect(airdropInfo.tokenId).to.equal(11)

            user2OldBalance = await ethers.provider.getBalance(user2.address)
            await treasury.connect(user2).withdrawAirdrop(2)

            airdropInfo = await treasury.airdrops(2)
            // 5% of total income
            expect(airdropInfo.withdrawn).to.equal(ethers.utils.parseEther("266.5"))

            user2NewBalance = await ethers.provider.getBalance(user2.address)
            expect(user2NewBalance.sub(user2OldBalance)).gt(ethers.utils.parseEther("266.4"))
            expect(user2NewBalance.sub(user2OldBalance)).lt(ethers.utils.parseEther("266.5"))
        })

        it("Other user can airdrop after transfer token", async () => {
            await expect(
                treasury.connect(user1).withdrawAirdrop(2)
            ).to.be.revertedWith("Invalid owner")
            await token.connect(user2).transferFrom(user2.address, user1.address, 11)

            await expect(
                treasury.connect(user1).withdrawAirdrop(2)
            ).to.be.revertedWith("Already withdrawn")


            await token.connect(user2).mint(1, {
                value: ethers.utils.parseEther("100")
            })
            await token.withdraw()

            // new income arrived to treasury, 30 ether
            user1OldBalance = await ethers.provider.getBalance(user1.address)
            await treasury.connect(user1).withdrawAirdrop(2)    // withdraw 5 ether
            user1NewBalance = await ethers.provider.getBalance(user1.address)

            expect(user1NewBalance.sub(user1OldBalance)).gt(ethers.utils.parseEther("4.9"))
            expect(user1NewBalance.sub(user1OldBalance)).lt(ethers.utils.parseEther("5"))
        })
    })

    describe("Stakers", () => {
        it("Should be able to get rewards from treasury", async () => {
            await expect(staking.connect(user1).claimRewards())
                .to.be.revertedWith("No pending rewards")

            await expect(treasury.distributeStakingRewards(ethers.utils.parseEther('100')))
                .to.be.revertedWith("Only governance")
            await treasury.connect(governance).distributeStakingRewards(ethers.utils.parseEther('100'))
            await treasury.connect(governance).distributeStakingRewards(ethers.utils.parseEther('966'))

            leftAmountOfStakingRewards = await treasury.leftAmountOfStakingRewards()
            expect(leftAmountOfStakingRewards).to.equal(ethers.utils.parseEther('20'))

            await treasury.connect(governance).distributeStakingRewards(ethers.utils.parseEther('20'))
            await expect(treasury.connect(governance).distributeStakingRewards(ethers.utils.parseEther('1')))
                .to.be.revertedWith('No fund yet')

            // total rewards amount: 1086 eth
            stakingBalance = await ethers.provider.getBalance(staking.address)
            expect(stakingBalance).to.equal(ethers.utils.parseEther('1086'))

            user1OldBalance = await ethers.provider.getBalance(user1.address)
            await staking.connect(user1).claimRewards()
            user1NewBalance = await ethers.provider.getBalance(user1.address)

            expect(user1NewBalance.sub(user1OldBalance)).gt(ethers.utils.parseEther('417.69'))
            expect(user1NewBalance.sub(user1OldBalance)).lt(ethers.utils.parseEther('417.7'))
        })
    })
})
