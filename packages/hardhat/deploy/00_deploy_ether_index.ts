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

  const addressOrThrow = (label: string, value?: string) => {
    if (!value || value === ethers.ZeroAddress) {
      throw new Error(`Missing ${label}. Please set it for network ${hre.network.name}.`);
    }
    return ethers.getAddress(value);
  };

  const priceIdOrThrow = (label: string, value?: string) => {
    if (!value || value === ethers.ZeroHash) {
      throw new Error(`Missing ${label}. Please set it for network ${hre.network.name}.`);
    }
    const bytes = ethers.getBytes(value);
    if (bytes.length != 32) {
      throw new Error(`Invalid ${label}, expected 32-byte hex string.`);
    }
    return ethers.hexlify(bytes);
  };

  type NetworkConfig = {
    router: string;
    wrappedNative: string;
    tokens: { wbtc?: string; usdc?: string; usdt?: string; weth: string };
    pythContract: string;
    priceIds: { native: string; wbtc?: string; usdc?: string; usdt?: string; weth?: string };
  };

  const networkConfigs: Record<string, NetworkConfig> = {
    mainnet: {
      router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      tokens: {
        weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
      pythContract: process.env.MAINNET_PYTH_NETWORK_CONTRACT ?? "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
      priceIds: {
        native:
          process.env.MAINNET_FEED_ID_NATIVE ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        weth: process.env.MAINNET_FEED_ID_WETH ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        wbtc: process.env.MAINNET_FEED_ID_WBTC ?? "0xc5e0e0c92116c0c070a242b254270441a6201af680a33e0381561c59db3266c9",
        usdc: process.env.MAINNET_FEED_ID_USDC ?? "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
        usdt: process.env.MAINNET_FEED_ID_USDT ?? "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
      },
    },
    hardhat: {
      router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      tokens: {
        weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
      pythContract: process.env.MAINNET_PYTH_NETWORK_CONTRACT ?? "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
      priceIds: {
        native:
          process.env.MAINNET_FEED_ID_NATIVE ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        weth: process.env.MAINNET_FEED_ID_WETH ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        wbtc: process.env.MAINNET_FEED_ID_WBTC ?? "0xc5e0e0c92116c0c070a242b254270441a6201af680a33e0381561c59db3266c9",
        usdc: process.env.MAINNET_FEED_ID_USDC ?? "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
        usdt: process.env.MAINNET_FEED_ID_USDT ?? "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
      },
    },
    localhost: {
      router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      tokens: {
        weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
      pythContract: process.env.MAINNET_PYTH_NETWORK_CONTRACT ?? "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
      priceIds: {
        native:
          process.env.MAINNET_FEED_ID_NATIVE ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        weth: process.env.MAINNET_FEED_ID_WETH ?? "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        wbtc: process.env.MAINNET_FEED_ID_WBTC ?? "0xc5e0e0c92116c0c070a242b254270441a6201af680a33e0381561c59db3266c9",
        usdc: process.env.MAINNET_FEED_ID_USDC ?? "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
        usdt: process.env.MAINNET_FEED_ID_USDT ?? "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
      },
    },
    sepolia: {
      router: process.env.SEPOLIA_DEX_ROUTER ?? "",
      wrappedNative: process.env.SEPOLIA_WRAPPED_NATIVE ?? "",
      tokens: {
        weth: process.env.SEPOLIA_WETH ?? process.env.SEPOLIA_WRAPPED_NATIVE ?? "",
        wbtc: process.env.SEPOLIA_WBTC ?? "",
        usdc: process.env.SEPOLIA_USDC ?? "",
        usdt: process.env.SEPOLIA_USDT ?? "",
      },
      pythContract: process.env.SEPOLIA_PYTH_NETWORK_CONTRACT ?? "",
      priceIds: {
        native: process.env.SEPOLIA_FEED_ID_NATIVE ?? "",
        weth: process.env.SEPOLIA_FEED_ID_WETH ?? process.env.SEPOLIA_FEED_ID_NATIVE ?? "",
        wbtc: process.env.SEPOLIA_FEED_ID_WBTC ?? "",
        usdc: process.env.SEPOLIA_FEED_ID_USDC ?? "",
        usdt: process.env.SEPOLIA_FEED_ID_USDT ?? "",
      },
    },
  };

  const config = networkConfigs[hre.network.name];

  if (!config) {
    throw new Error(
      `Network ${hre.network.name} is not configured. Add router, token, and Pyth feed ids for this chain before deploying.`,
    );
  }

  const router = addressOrThrow("DEX router", config.router);
  const wrappedNative = addressOrThrow("wrapped native token", config.wrappedNative);
  const wethToken = addressOrThrow("WETH", config.tokens.weth);
  const pythContract = addressOrThrow("Pyth network contract", config.pythContract);
  const priceIds = {
    native: priceIdOrThrow("native/USD feed id", config.priceIds.native),
    weth: priceIdOrThrow("WETH/USD feed id", config.priceIds.weth),
    wbtc:
      config.tokens.wbtc && config.priceIds.wbtc ? ethers.hexlify(ethers.getBytes(config.priceIds.wbtc)) : undefined,
    usdc:
      config.tokens.usdc && config.priceIds.usdc ? ethers.hexlify(ethers.getBytes(config.priceIds.usdc)) : undefined,
    usdt:
      config.tokens.usdt && config.priceIds.usdt ? ethers.hexlify(ethers.getBytes(config.priceIds.usdt)) : undefined,
  };

  console.log("Deploying ETI Token...");
  const etiToken = await deploy("ETIToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  console.log("Deploying Pyth Oracle...");
  const pythOracle = await deploy("PythOracle", {
    from: deployer,
    args: [pythContract],
    log: true,
    autoMine: true,
  });

  console.log("Deploying Fund Factory...");
  const fundFactory = await deploy("FundFactory", {
    from: deployer,
    // FundFactory(eti, oracle, treasury, dex, wrappedNative, initialOwner)
    args: [etiToken.address, pythOracle.address, deployer, router, wrappedNative, deployer],
    log: true,
    autoMine: true,
  });

  console.log("Configuring Pyth price feed ids...");
  const oracleContract = await hre.ethers.getContract<Contract>("PythOracle", deployer);

  await oracleContract.setPriceFeed(ethers.ZeroAddress, priceIds.native); // Native/USD
  await oracleContract.setPriceFeed(wethToken, priceIds.weth); // WETH/USD
  if (config.tokens.wbtc && priceIds.wbtc) {
    await oracleContract.setPriceFeed(addressOrThrow("WBTC token", config.tokens.wbtc), priceIds.wbtc);
  }
  if (config.tokens.usdc && priceIds.usdc) {
    await oracleContract.setPriceFeed(addressOrThrow("USDC token", config.tokens.usdc), priceIds.usdc);
  }
  if (config.tokens.usdt && priceIds.usdt) {
    await oracleContract.setPriceFeed(addressOrThrow("USDT token", config.tokens.usdt), priceIds.usdt);
  }
  console.log("  - Pyth price ids configured for native, WETH, and optional stable/bitcoin tokens.");

  console.log("Ether Index contracts deployed successfully.");
  console.log("ETI Token:", etiToken.address);
  console.log("Pyth Oracle:", pythOracle.address);
  console.log("DEX Router:", router);
  console.log("Wrapped native:", wrappedNative);
  console.log("Fund Factory:", fundFactory.address);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer);
};

export default deployEtherIndex;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags EtherIndex
deployEtherIndex.tags = ["EtherIndex"];
