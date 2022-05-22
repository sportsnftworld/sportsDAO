const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance", function () {
    before(async function() {
        [deployer, user1, user2, user3] = await ethers.getSigners()

        Governance = await ethers.getContractFactory("Governance")
        governance = await Governance.deploy(
            [user1.address, user2.address],
            2,  // quorum
            2   // threshold of execution
        )
    })

    describe("Deploy", function () {
        it("Should assign the correct params", async () => {
            expect(await governance.quorum()).to.equal(2)
            expect(await governance.thresholdExec()).to.equal(2)

            expect(await governance.isSenators(user1.address)).to.equal(true)
            expect(await governance.isSenators(user2.address)).to.equal(true)
            expect(await governance.isSenators(user3.address)).to.equal(false)
        })
    })

    describe("Proposal", function () {
        before(async function() {
            CallTester = await ethers.getContractFactory("CallTester")
            callTester = await CallTester.deploy()
            await callTester.deployed()
        })

        it("Should be created, voted and executed by the senators", async () => {
            encData = callTester.interface.encodeFunctionData("setAirdrop", [2022])
            await expect(governance.propose(
                [callTester.address],
                [0],
                [encData],
                "first proposal"
            )).to.be.revertedWith("Only senator")

            await expect(governance.connect(user1).propose(
                [],
                [0],
                [encData],
                "first proposal"
            )).to.be.revertedWith("Invalid data")

            await expect(governance.connect(user1).propose(
                [callTester.address],
                [],
                [encData],
                "first proposal"
            )).to.be.revertedWith("Invalid data")

            await expect(governance.connect(user1).propose(
                [callTester.address],
                [0],
                [],
                "first proposal"
            )).to.be.revertedWith("Invalid data")

            await governance.connect(user1).propose(
                [callTester.address],
                [0],
                [encData],
                "first proposal"
            )

            await expect(governance.vote(0, true)).to.be.revertedWith("Only senator")
            await expect(governance.connect(user1).vote(0, true)).to.be.revertedWith("Invalid proposal")
            await expect(governance.connect(user1).vote(2, true)).to.be.revertedWith("Invalid proposal")

            await governance.connect(user1).vote(1, true)
            await expect(governance.connect(user1).vote(1, false)).to.be.revertedWith("Already voted")

            await expect(governance.execute(
                1,
                [callTester.address],
                [0],
                [encData]
            )).to.be.revertedWith("Only senator")

            await expect(governance.connect(user2).execute(
                1,
                [callTester.address],
                [0],
                [encData]
            )).to.be.revertedWith("Not enough votes")

            await governance.connect(user2).vote(1, true)

            await expect(governance.connect(user2).execute(
                1,
                [callTester.address],
                [1],
                [encData]
            )).to.be.revertedWith("Invalid params")

            await governance.connect(user2).execute(
                1,
                [callTester.address],
                [0],
                [encData]
            )

            testResult = await callTester.airdrop()
            expect(testResult).to.equal(2022)

            await expect(governance.connect(user1).execute(
                1,
                [callTester.address],
                [0],
                [encData]
            )).to.be.revertedWith("Executed already")
        })

        it("Should not be executed with reject of senators", async () => {
            encData = callTester.interface.encodeFunctionData("setAirdrop", [2202])
            await governance.connect(user2).propose(
                [callTester.address],
                [0],
                [encData],
                "second proposal"
            )

            await governance.connect(user1).vote(2, false)
            await governance.connect(user2).vote(2, true)

            await expect(governance.connect(user2).execute(
                2,
                [callTester.address],
                [0],
                [encData]
            )).to.be.revertedWith("Not enough yays")
        })
    })
})