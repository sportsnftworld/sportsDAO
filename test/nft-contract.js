const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Qatar2022MetaverseWorldCup", function () {
  describe("Deploy", function() {
    before(async function() {
      [owner, treasury, user1, user2] = await ethers.getSigners()

      Qatar2022MetaverseWorldCup = await ethers.getContractFactory("Qatar2022MetaverseWorldCup")
      qatar2022Meta = await Qatar2022MetaverseWorldCup.deploy(0, treasury.address)
      await qatar2022Meta.deployed()
    })

    it("should assign the correct params", async () => {
      startTimestamp = await qatar2022Meta.startTimestamp()
      _treasury = await qatar2022Meta.TREASURY()

      expect(_treasury).to.equal(treasury.address)
      expect(startTimestamp).to.equal(0)
    })

    it("should assign the correct name and symbol", async () => {
      _name = await qatar2022Meta.name();
      expect(_name).to.equal("Qatar2022MetaverseWorldCup");

      _symbol = await qatar2022Meta.symbol()
      expect(_symbol).to.equal("Qatar2022META");
    })
  })

  describe("User", () => {
    before(async function() {
      [owner, treasury, user1, user2, users] = await ethers.getSigners()

      currentTimestamp = (await ethers.provider.getBlock()).timestamp

      Qatar2022MetaverseWorldCup = await ethers.getContractFactory("Qatar2022MetaverseWorldCup")
      qatar2022Meta = await Qatar2022MetaverseWorldCup.deploy(currentTimestamp + 7 * 24 * 60 * 60, treasury.address)
      await qatar2022Meta.deployed()

      mintPrice = await qatar2022Meta.mintPrice()
    })

    it("should not be able to mint before arrival of start timestamp", async () => {
      await expect(qatar2022Meta.connect(user1).mint(3, {
        value: mintPrice.mul(3)
      })).to.be.revertedWith("Not started yet")

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTimestamp + 7 * 24 * 60 * 60 - 100,
      ]);
      await ethers.provider.send("evm_mine");

      await expect(qatar2022Meta.connect(user1).mint(3, {
        value: mintPrice.mul(3)
      })).to.be.revertedWith("Not started yet")

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        currentTimestamp + 7 * 24 * 60 * 60,
      ]);
      await ethers.provider.send("evm_mine");

      await qatar2022Meta.connect(user1).mint(3, {
        value: mintPrice.mul(3)
      })

      _balanceOf = await qatar2022Meta.balanceOf(user1.address)
      expect(_balanceOf).to.equal(3)

      token0 = await qatar2022Meta.tokenOfOwnerByIndex(user1.address, 0)
      expect(token0).to.equal(1)
    })

    it("should not be able to mint with wrong value and amount", async () => {
      await expect(qatar2022Meta.connect(user2).mint(0, {
        value: mintPrice.mul(10)
      })).to.be.revertedWith("Invalid amount")

      await qatar2022Meta.connect(user2).mint(15, {
        value: mintPrice.mul(10)
      })

      _balanceOf = await qatar2022Meta.balanceOf(user2.address)
      expect(_balanceOf).to.equal(10)

      expect(await qatar2022Meta.tokenOfOwnerByIndex(user1.address, 0)).to.equal(1)
      expect(await qatar2022Meta.tokenOfOwnerByIndex(user2.address, 0)).to.equal(4)
      expect(await qatar2022Meta.tokenOfOwnerByIndex(user2.address, 9)).to.equal(13)

      _totalSupply = await qatar2022Meta.totalSupply()
      expect(_totalSupply).to.equal(13)
    })

    it("should not be able to mint after all sold out", async () => {
      await qatar2022Meta.setMintPrice(ethers.utils.parseEther("0.001"))
      mintPrice = await qatar2022Meta.mintPrice()

      for (i = 0; i < 9; i++) {
        await qatar2022Meta.connect(users).mint(10, {
          value: mintPrice.mul(10)
        })
      }

      _balanceOf = await qatar2022Meta.balanceOf(users.address)
      expect(_balanceOf).to.equal(86)

      _tokenId = await qatar2022Meta.tokenOfOwnerByIndex(users.address, 85)
      expect(_tokenId).to.equal(99)

      _totalSupply = await qatar2022Meta.totalSupply()
      expect(_totalSupply).to.equal(99)

      await expect(qatar2022Meta.connect(user1).mint(1, {
        value: mintPrice
      })).to.be.revertedWith("Sold out")

      startingIndexBlock = await qatar2022Meta.startingIndexBlock()
      expect(startingIndexBlock).to.gt(0)
    })

    it("should be able to set starting index", async () => {
      await qatar2022Meta.connect(user1).setStartingIndex()
      startingIndex = await qatar2022Meta.startingIndex()
      expect(startingIndex).to.gt(0)

      MAX_NFTS = await qatar2022Meta.MAX_NFTS()
      expect(startingIndex).to.lt(MAX_NFTS)

      console.log('starting index: ', startingIndex.toString())
    })
  })

  describe("Owner", () => {
    before(async function() {
      [owner, treasury, user1, user2] = await ethers.getSigners()

      Qatar2022MetaverseWorldCup = await ethers.getContractFactory("Qatar2022MetaverseWorldCup")
      qatar2022Meta = await Qatar2022MetaverseWorldCup.deploy(0, treasury.address)
      await qatar2022Meta.deployed()
    })

    it("should be able to transfer ownership", async () => {
      await qatar2022Meta.transferOwnership(user1.address)
      _owner = await qatar2022Meta.owner()
      expect(_owner).to.equal(user1.address)

      // ownership is already transferred to user1
      await expect(
        qatar2022Meta.transferOwnership(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      // transfer ownership back to initial admin
      await qatar2022Meta.connect(user1).transferOwnership(owner.address)
      _owner = await qatar2022Meta.owner()
      expect(_owner).to.equal(owner.address)
    })

    it("should be able to update mint price", async () => {
      oldMintPrice = await qatar2022Meta.mintPrice()
      expect(oldMintPrice).to.equal(ethers.utils.parseEther("100"))

      txn = await qatar2022Meta.connect(user1).mint(
        5,
        {
          value: oldMintPrice.mul(5)
        }
      )

      _balanceOf = await qatar2022Meta.balanceOf(user1.address)
      expect(_balanceOf).to.equal(5)

      await expect(qatar2022Meta.connect(user1).setMintPrice(ethers.utils.parseEther("101")))
        .to.be.revertedWith("Ownable: caller is not the owner")

      await qatar2022Meta.setMintPrice(ethers.utils.parseEther("101"))
      newMintPrice = await qatar2022Meta.mintPrice()
      expect(newMintPrice).to.equal(ethers.utils.parseEther("101"))

      await expect(qatar2022Meta.connect(user1).mint(
        3,
        { value: oldMintPrice.mul(3) }
      )).to.be.revertedWith("Not enough value")

      await qatar2022Meta.connect(user1).mint(
        3,
        {
          value: newMintPrice.mul(3)
        }
      )

      _balanceOf = await qatar2022Meta.balanceOf(user1.address)
      expect(_balanceOf).to.equal(8)
    })

    it("should be able to update base URI", async () => {
      await expect(
        qatar2022Meta.connect(user1).setBaseURI("https://api.example.com/nfts/")
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await qatar2022Meta.setBaseURI("https://api.example.com/nfts/")
      token1URI = await qatar2022Meta.tokenURI(1)
      expect(token1URI).to.equal("https://api.example.com/nfts/1")
    })

    it("should be able to renounce ownership", async () => {
      await expect(
        qatar2022Meta.renounceOwnership()
      ).to.emit(
        qatar2022Meta,
        "OwnershipTransferred"
      )

      _owner = await qatar2022Meta.owner()
      expect(_owner).to.equal(ethers.constants.AddressZero)

      // ownership is renounced, and there is not valid admin.
      await expect(
        qatar2022Meta.setBaseURI("https://api.example.com/nfts/")
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect(
        qatar2022Meta.setMintPrice(ethers.utils.parseEther("200"))
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })
})
