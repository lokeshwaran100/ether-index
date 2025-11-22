import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract, ethers } from "ethers";

/**
 * Deploys the Ether Index contracts on Ethereum mainnet (or a mainnet fork).
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployEtherIndex: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network mainnet`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */

  console.log("Getting named accounts...");
  const namedAccounts = await hre.getNamedAccounts();
  console.log("Named accounts:", namedAccounts);

  const { deployer } = namedAccounts;

  if (!deployer) {
    throw new Error("Deployer account is undefined. Check your hardhat configuration.");
  }

  console.log("Deployer address:", deployer);

  const { deploy } = hre.deployments;

  console.log("Deploying Ether Index contracts for Ethereum...");

  const isEthereumNetwork =
    hre.network.name === "mainnet" || hre.network.name === "hardhat" || hre.network.name === "localhost";

  if (!isEthereumNetwork) {
    throw new Error(
      `Network ${hre.network.name} is not configured. Add router, token, and Chainlink feed addresses for this chain before deploying.`,
    );
  }

  // Ethereum mainnet addresses (checksummed)
  const UNISWAP_V2_ROUTER = ethers.getAddress("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
  const WETH_MAINNET = ethers.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  const WBTC_MAINNET = ethers.getAddress("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
  const USDC_MAINNET = ethers.getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  const USDT_MAINNET = ethers.getAddress("0xdac17f958d2ee523a2206206994597c13d831ec7");

  // Chainlink price feeds on Ethereum mainnet (checksummed)
  const ETH_USD_FEED = ethers.getAddress("0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419");
  const BTC_USD_FEED = ethers.getAddress("0xf4030086522a5beea4988f8ca5b36dbc97bee88c");
  const USDC_USD_FEED = ethers.getAddress("0x8fffffd4afb6115b954bd326cbe7b4ba576818f6");
  const USDT_USD_FEED = ethers.getAddress("0x3e7d1eab13ad0104d2750b8863b489d65364e32d");

  console.log("Deploying ETI Token...");
  const etiToken = await deploy("ETIToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  console.log("Deploying Chainlink Oracle...");
  const chainlinkOracle = await deploy("ChainlinkOracle", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("Deploying Fund Factory...");
  const fundFactory = await deploy("FundFactory", {
    from: deployer,
    // FundFactory(eti, oracle, treasury, dex, wrappedNative, initialOwner)
    args: [etiToken.address, chainlinkOracle.address, deployer, UNISWAP_V2_ROUTER, WETH_MAINNET, deployer],
    log: true,
    autoMine: true,
  });

  console.log("Configuring Chainlink price feeds...");
  const oracleContract = await hre.ethers.getContract<Contract>("ChainlinkOracle", deployer);

  await oracleContract.setPriceFeed(ethers.ZeroAddress, ETH_USD_FEED); // ETH/USD
  await oracleContract.setPriceFeed(WETH_MAINNET, ETH_USD_FEED); // WETH/USD (same as ETH)
  await oracleContract.setPriceFeed(WBTC_MAINNET, BTC_USD_FEED); // WBTC/USD
  await oracleContract.setPriceFeed(USDC_MAINNET, USDC_USD_FEED); // USDC/USD
  await oracleContract.setPriceFeed(USDT_MAINNET, USDT_USD_FEED); // USDT/USD
  console.log("  - Price feeds set for ETH, WETH, WBTC, USDC, and USDT on Ethereum mainnet (or fork).");

  console.log("Ether Index contracts deployed successfully.");
  console.log("ETI Token:", etiToken.address);
  console.log("Chainlink Oracle:", chainlinkOracle.address);
  console.log("DEX Router (Uniswap V2):", UNISWAP_V2_ROUTER);
  console.log("WETH:", WETH_MAINNET);
  console.log("Fund Factory:", fundFactory.address);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer);
};

export default deployEtherIndex;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags EtherIndex
deployEtherIndex.tags = ["EtherIndex"];
