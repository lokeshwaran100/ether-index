import { expect } from "chai";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { ethers } from "hardhat";
import mockPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/MockPyth.json";

describe("EtherIndexFund full flow", function () {
  it("deploys, creates a fund, buys, rebalances, and sells in one test", async function () {
    this.timeout(420000); // allow extra time on real networks like Sepolia
    const signers = await ethers.getSigners();
    // Some live networks (like Sepolia via HH) expose only one account; reuse it to avoid undefined addresses.
    const deployer = signers[0];
    const user = signers[1] ?? deployer;
    const treasury = signers[2] ?? deployer;

    // Deploy mocks using ABI/bytecode from pyth-sdk-solidity package
    const moduleRequire = createRequire(import.meta.url);
    const mockPythBytecode =
      "0x" +
      readFileSync(moduleRequire.resolve("@pythnetwork/pyth-sdk-solidity/build/MockPyth_sol_MockPyth.bin"), "utf8");
    const MockPyth = new ethers.ContractFactory(mockPythAbi, mockPythBytecode, deployer);
    const mockPyth = await MockPyth.deploy(60, 0);
    await mockPyth.waitForDeployment();

    const Oracle = await ethers.getContractFactory("PythOracle");
    const oracle = await Oracle.deploy(await mockPyth.getAddress());
    await oracle.waitForDeployment();

    const Weth = await ethers.getContractFactory("MockWETH");
    const weth = await Weth.deploy();
    await weth.waitForDeployment();

    const Router = await ethers.getContractFactory("MockRouter");
    const router = await Router.deploy(await weth.getAddress());
    await router.waitForDeployment();

    const Token = await ethers.getContractFactory("MockToken");
    const tokenA = await Token.deploy("Mock Token A", "MTA", 18);
    const tokenB = await Token.deploy("Mock Token B", "MTB", 18);
    await Promise.all([tokenA.waitForDeployment(), tokenB.waitForDeployment()]);

    // Configure oracle price feeds
    const nativeFeedId = ethers.id("NATIVE");
    const tokenAFeedId = ethers.id("TOKEN_A");
    const tokenBFeedId = ethers.id("TOKEN_B");
    await (await oracle.setPriceFeed(ethers.ZeroAddress, nativeFeedId)).wait();
    await (await oracle.setPriceFeed(await tokenA.getAddress(), tokenAFeedId)).wait();
    await (await oracle.setPriceFeed(await tokenB.getAddress(), tokenBFeedId)).wait();

    const nowTs = BigInt(Math.floor(Date.now() / 1000));
    const createUpdate = async (id: string, price: bigint) => {
      const updateData = await mockPyth.createPriceFeedUpdateData(
        id,
        BigInt(price),
        1_000_000n,
        -8, // expo so price already 8 decimals
        BigInt(price),
        1_000_000n,
        nowTs,
        nowTs - 1n,
      );
      await (await mockPyth.updatePriceFeeds([updateData])).wait();
    };

    await createUpdate(nativeFeedId, 2_000n * 10n ** 8n);
    await createUpdate(tokenAFeedId, 1_000n * 10n ** 8n);
    await createUpdate(tokenBFeedId, 500n * 10n ** 8n);

    // Deploy ETI token and factory
    const EtiToken = await ethers.getContractFactory("ETIToken");
    const eti = await EtiToken.deploy(deployer.address);
    await eti.waitForDeployment();

    const Factory = await ethers.getContractFactory("FundFactory");
    const factory = await Factory.deploy(
      await eti.getAddress(),
      await oracle.getAddress(),
      treasury.address,
      await router.getAddress(),
      await weth.getAddress(),
      deployer.address,
    );
    await factory.waitForDeployment();

    // Create a fund
    const creationFee = await factory.creationFee();
    await (await eti.mint(user.address, creationFee)).wait();
    await (await eti.connect(user).approve(await factory.getAddress(), creationFee)).wait();

    const tokens = [await tokenA.getAddress(), await tokenB.getAddress()];
    try {
      const createTx = await factory.connect(user).createFund("Integration Fund", "IFD", tokens);
      await createTx.wait();
    } catch (err: any) {
      // Surface revert info from live networks where the RPC may hide reasons
      console.error("createFund failed", {
        reason: err?.reason,
        code: err?.code,
        shortMessage: err?.shortMessage,
        data: err?.data,
      });
      throw err;
    }

    const fundAddress = await factory.etherIndexFunds(0);
    const fund = await ethers.getContractAt("EtherIndexFund", fundAddress);

    expect(await fund.fundName()).to.equal("Integration Fund");
    expect(await fund.creator()).to.equal(user.address);
    expect(await fund.getUnderlyingTokens()).to.deep.equal(tokens);

    // Buy flow
    const buyValue = ethers.parseEther("0.00001");
    const buyTx = await fund.connect(user).buy({ value: buyValue });
    await buyTx.wait();

    const userFundTokens = await fund.balanceOf(user.address);
    expect(userFundTokens).to.be.gt(0n);
    expect(await fund.getTokenBalance(tokens[0])).to.be.gt(0n);
    expect(await fund.getTokenBalance(tokens[1])).to.be.gt(0n);

    // Rebalance flow
    const newProportions = [70n, 30n];
    await (await fund.connect(user).setProportions(tokens, newProportions)).wait();
    expect(await fund.targetProportions(tokens[0])).to.equal(newProportions[0]);
    expect(await fund.targetProportions(tokens[1])).to.equal(newProportions[1]);

    // Sell flow
    const preSellEth = await ethers.provider.getBalance(user.address);
    const sellTx = await fund.connect(user).sell(userFundTokens);
    const sellReceipt = await sellTx.wait();
    const postSellEth = await ethers.provider.getBalance(user.address);
    const gasPrice = sellReceipt?.effectiveGasPrice ?? sellTx.gasPrice ?? 0n;
    const gasSpent = sellReceipt?.gasUsed ? sellReceipt.gasUsed * gasPrice : 0n;
    const netReceived = postSellEth + gasSpent - preSellEth;

    expect(await fund.balanceOf(user.address)).to.equal(0n);
    expect(netReceived).to.be.gt(0n);
  });
});
