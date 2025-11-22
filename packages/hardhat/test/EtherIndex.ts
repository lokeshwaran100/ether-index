import { expect } from "chai";
import { ethers } from "hardhat";
import { EtherIndexFund } from "../typechain-types";

describe("EtherIndexFund", function () {
  // We define a fixture to reuse the same setup in every test.

  let EtherIndexFund: EtherIndexFund;
  before(async () => {
    const [owner] = await ethers.getSigners();
    const EtherIndexFundFactory = await ethers.getContractFactory("EtherIndexFund");
    EtherIndexFund = (await EtherIndexFundFactory.deploy(owner.address)) as EtherIndexFund;
    await EtherIndexFund.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have the right message on deploy", async function () {
      expect(await EtherIndexFund.greeting()).to.equal("Building Unstoppable Apps!!!");
    });

    it("Should allow setting a new message", async function () {
      const newGreeting = "Learn Scaffold-ETH 2! :)";

      await EtherIndexFund.setGreeting(newGreeting);
      expect(await EtherIndexFund.greeting()).to.equal(newGreeting);
    });
  });
});
