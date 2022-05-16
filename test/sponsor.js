const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SponsorEngagement", function () {
    before(async function() {
        [owner, treasury, user1, user2] = await ethers.getSigners()
  
        SponsorEngagement = await ethers.getContractFactory("SponsorEngagement")
        sponsorEngagement = await SponsorEngagement.deploy(treasury.address)
        await sponsorEngagement.deployed()
    })
    
    describe("User", function () {
        it("Should not be able to register engagement with invalid data", async () => {
            await expect(sponsorEngagement.connect(user1).engage(
                "",
                5,
                false,
                {
                    value: ethers.utils.parseEther("10").mul(5)
                }
            )).to.be.revertedWith("Invalid logo")

            await expect(sponsorEngagement.connect(user1).engage(
                "https://example.com/logo-image.png",
                5,
                false,
                {
                    value: ethers.utils.parseEther("49")
                }
            )).to.be.revertedWith("Not enough fee")
        })

        it("Should be able to register logo url with jerseys count", async () => {
            await sponsorEngagement.connect(user1).engage(
                "https://example.com/logo-image.png",
                5,
                false,
                {
                    value: ethers.utils.parseEther("10").mul(5)
                }
            )

            sponsor1 = await sponsorEngagement.sponsors(0)
            expect(sponsor1.sponsor).to.equal(user1.address)
            expect(sponsor1.logoUrl).to.equal("https://example.com/logo-image.png")
            expect(sponsor1.jerseys).to.equal(5)
            expect(sponsor1.isFixed).to.equal(false)
        })

        it("Should be able to register logo url with fixed fee", async () => {
            await sponsorEngagement.connect(user2).engage(
                "https://example.com/logo-image-2.jpg",
                1,
                true,
                {
                    value: ethers.utils.parseEther("2000")
                }
            )

            sponsor2 = await sponsorEngagement.sponsors(1)
            expect(sponsor2.sponsor).to.equal(user2.address)
            expect(sponsor2.logoUrl).to.equal("https://example.com/logo-image-2.jpg")
            expect(sponsor2.jerseys).to.equal(0)
            expect(sponsor2.isFixed).to.equal(true)
        })

        it("Should be able to get sponsors info", async () => {
            totalSponsors = await sponsorEngagement.totalSponsors()
            totalRequiredJerseys = await sponsorEngagement.totalRequiredJerseys()

            totalFixedSponsors = await sponsorEngagement.totalFixedSponsors()

            expect(totalSponsors).to.equal(1)
            expect(totalRequiredJerseys).to.equal(5)

            expect(totalFixedSponsors).to.equal(1)
        })
    })

    describe("Income", () => {
        it("should be withdrawn to the treasury", async () => {     
            treasuryOldBalance = await ethers.provider.getBalance(treasury.address)
            await sponsorEngagement.withdraw()
            treasuryNewBalance = await ethers.provider.getBalance(treasury.address)
      
            expect(treasuryNewBalance.sub(treasuryOldBalance)).to.equal(ethers.utils.parseEther("2050"))
        })
    })
})
