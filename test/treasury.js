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
        
    })
})
