import { expect } from "chai";
import { ethers } from "hardhat";

const WBTC = process.env.TESTNET_WBTC ?? "";
const USDC = process.env.TESTNET_USDC ?? "";
const WRAPPED_NATIVE = process.env.TESTNET_WRAPPED_NATIVE ?? ""; // e.g. WHBAR/WETH
const DEX_ROUTER = process.env.TESTNET_DEX_ROUTER ?? ""; // e.g. UniswapV2/SaucerSwap router

// Pyth feed IDs (bytes32 hex). Provide real testnet feeds via env.
const FEED_ID_NATIVE = process.env.TESTNET_FEED_ID_NATIVE ?? "";
const FEED_ID_WBTC = process.env.TESTNET_FEED_ID_WBTC ?? "";
const FEED_ID_USDC = process.env.TESTNET_FEED_ID_USDC ?? "";
const PYTH_CONTRACT = process.env.TESTNET_PYTH_NETWORK_CONTRACT ?? "";

describe("Testnet Integration (single test end-to-end)", function () {
  it("deploys, configures, creates fund, buys, rebalances, sells, and updates admin settings", async function () {
    // Ensure addresses are provided when running on real testnet
    const required = [
      ["TESTNET_WRAPPED_NATIVE", WRAPPED_NATIVE],
      ["TESTNET_DEX_ROUTER", DEX_ROUTER],
      ["TESTNET_WBTC", WBTC],
      ["TESTNET_USDC", USDC],
      ["TESTNET_FEED_ID_NATIVE", FEED_ID_NATIVE],
      ["TESTNET_FEED_ID_WBTC", FEED_ID_WBTC],
      ["TESTNET_FEED_ID_USDC", FEED_ID_USDC],
      ["TESTNET_PYTH_NETWORK_CONTRACT", PYTH_CONTRACT],
    ];
    for (const [, value] of required) {
      if (!value || value === ethers.ZeroAddress) {
        this.skip();
      }
    }

    const [deployer, user1, user2, treasury] = await ethers.getSigners();

    // Deploy core contracts
    const Oracle = await ethers.getContractFactory("PythOracle");
    const oracle = await Oracle.deploy(PYTH_CONTRACT);
    await oracle.waitForDeployment();

    await oracle.setPriceFeed(ethers.ZeroAddress, FEED_ID_NATIVE);
    await oracle.setPriceFeed(WBTC, FEED_ID_WBTC);
    await oracle.setPriceFeed(USDC, FEED_ID_USDC);

    const Eti = await ethers.getContractFactory("ETIToken");
    const eti = await Eti.deploy(deployer.address);
    await eti.waitForDeployment();

    const Factory = await ethers.getContractFactory("FundFactory");
    const factory = await Factory.deploy(
      await eti.getAddress(),
      await oracle.getAddress(),
      treasury.address,
      DEX_ROUTER,
      WRAPPED_NATIVE,
      deployer.address,
    );
    await factory.waitForDeployment();

    // Prepare ETI for creation fee
    const creationFee = await factory.creationFee();
    await eti.mint(user1.address, creationFee * 2n);
    await eti.mint(user2.address, creationFee);
    await eti.connect(user1).approve(await factory.getAddress(), creationFee * 2n);
    await eti.connect(user2).approve(await factory.getAddress(), creationFee);

    // Create fund
    const tokens = [WBTC, USDC];
    await factory.connect(user1).createFund("Testnet BTC/USDC Fund", "TBU", tokens);
    const fundAddress = await factory.etherIndexFunds(0);
    const fund = await ethers.getContractAt("EtherIndexFund", fundAddress);

    expect(await fund.fundName()).to.equal("Testnet BTC/USDC Fund");
    expect(await fund.fundTicker()).to.equal("TBU");
    expect(await fund.creator()).to.equal(user1.address);
    expect(await fund.targetProportions(tokens[0])).to.equal(50);
    expect(await fund.targetProportions(tokens[1])).to.equal(50);

    // Buy fund tokens (user1 primes the fund)
    const buyAmountUser1 = ethers.parseEther("5");
    await fund.connect(user1).buy({ value: buyAmountUser1 });
    const user1Balance = await fund.balanceOf(user1.address);
    expect(user1Balance).to.be.gt(0n);

    // Buy fund tokens (user2) to test fee distribution
    const buyAmountUser2 = ethers.parseEther("3");
    const creatorBalanceBefore = await ethers.provider.getBalance(user1.address);
    const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

    await fund.connect(user2).buy({ value: buyAmountUser2 });

    const creatorBalanceAfter = await ethers.provider.getBalance(user1.address);
    const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);

    const totalFee = (buyAmountUser2 * 100n) / 10000n;
    const expectedCreatorFee = (totalFee * 50n) / 100n;
    const expectedTreasuryFee = (totalFee * 50n) / 100n;
    expect(creatorBalanceAfter - creatorBalanceBefore).to.be.gte(expectedCreatorFee);
    expect(treasuryBalanceAfter - treasuryBalanceBefore).to.be.gte(expectedTreasuryFee);

    // Rebalance (owner)
    const newProportions = [70, 30];
    await fund.connect(user1).setProportions(tokens, newProportions);
    expect(await fund.targetProportions(tokens[0])).to.equal(70);
    expect(await fund.targetProportions(tokens[1])).to.equal(30);
    await expect(fund.connect(user2).setProportions(tokens, newProportions)).to.be.revertedWithCustomError(
      fund,
      "OwnableUnauthorizedAccount",
    );

    // View helpers
    const [viewAddr, name, ticker, viewTokens] = await factory.getFund(0);
    expect(viewAddr).to.equal(fundAddress);
    expect(name).to.equal("Testnet BTC/USDC Fund");
    expect(ticker).to.equal("TBU");
    expect(viewTokens).to.deep.equal(tokens);
    expect(await factory.getFunds(0, 1)).to.deep.equal([fundAddress]);
    expect(await factory.getCreatorFunds(user1.address)).to.deep.equal([0n]);

    // Sell half of user1's tokens
    const sellAmount = user1Balance / 2n;
    const preSellEth = await ethers.provider.getBalance(user1.address);
    const sellTx = await fund.connect(user1).sell(sellAmount);
    const sellReceipt = await sellTx.wait();
    const postSellEth = await ethers.provider.getBalance(user1.address);
    const gasPrice = sellReceipt?.effectiveGasPrice ?? sellTx.gasPrice ?? 0n;
    const gasSpent = sellReceipt?.gasUsed ? sellReceipt.gasUsed * gasPrice : 0n;
    const netReceived = postSellEth + gasSpent - preSellEth;
    expect(netReceived).to.be.gt(0n);
    expect(await fund.balanceOf(user1.address)).to.equal(user1Balance - sellAmount);

    // Admin updates
    await factory.connect(deployer).updateTreasury(user2.address);
    expect(await factory.treasury()).to.equal(user2.address);
    await expect(factory.connect(user1).updateTreasury(user1.address)).to.be.revertedWithCustomError(
      factory,
      "OwnableUnauthorizedAccount",
    );

    await fund.connect(user1).updateTreasury(user2.address);
    expect(await fund.treasury()).to.equal(user2.address);
    await expect(fund.connect(user1).updateOracle(ethers.ZeroAddress)).to.be.revertedWith("Invalid oracle address");
    await expect(factory.connect(deployer).updateTreasury(ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid treasury address",
    );

    // NAV and balances sanity checks
    const fundValue = await fund.getCurrentFundValue();
    expect(fundValue).to.be.gte(0n);
    expect(await fund.getTokenBalance(tokens[0])).to.be.gte(0n);
    expect(await fund.getTokenBalance(tokens[1])).to.be.gte(0n);
  });
});
