"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Address as AddressDisplay } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { Abi, Address, formatEther, isAddress, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useSelectedNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";

type PageProps = {
  params: Promise<{ vaultAddress: string }>;
};

type StoredFund = {
  fundName?: string;
  fundTicker?: string;
  underlyingTokens?: string[];
  creator?: string;
};

const FundDetail: NextPage<PageProps> = ({ params }) => {
  const { vaultAddress } = use(params);
  const vaultAddressChecked = vaultAddress as Address;
  const { address: connectedAddress, chain } = useAccount();
  const selectedNetwork = useSelectedNetwork();
  const etherIndexFundAbi = contracts?.[selectedNetwork.id]?.EtherIndexFund?.abi as Abi | undefined;
  const fundAbi = (etherIndexFundAbi ?? []) as Abi;
  const etiTokenAbi = contracts?.[selectedNetwork.id]?.ETIToken?.abi as Abi | undefined;
  const etiTokenAddress = contracts?.[selectedNetwork.id]?.ETIToken?.address as Address | undefined;
  const enabledFundReads = Boolean(etherIndexFundAbi && isAddress(vaultAddressChecked));

  const [depositAmount, setDepositAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [storedFund, setStoredFund] = useState<StoredFund | null>(null);

  useEffect(() => {
    const loadStoredFund = async () => {
      try {
        const res = await fetch(`/api/funds/${vaultAddress}?chainId=${selectedNetwork.id}`);
        const json = await res.json();
        setStoredFund(json?.fund ?? null);
      } catch (error) {
        console.error("Failed to load stored fund", error);
      }
    };

    if (isAddress(vaultAddressChecked)) {
      loadStoredFund();
    }
  }, [vaultAddressChecked, selectedNetwork.id]);

  const { data: fundNameData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "fundName",
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads },
  });

  const { data: fundSymbolData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "fundTicker",
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads },
  });

  const { data: creatorData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "creator",
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads },
  });

  const { data: fundValueData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "getCurrentFundValue",
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads },
  });

  const { data: underlyingTokensData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "getUnderlyingTokens",
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads },
  });

  const { data: userBalanceData } = useReadContract({
    address: vaultAddressChecked,
    abi: fundAbi,
    functionName: "fundTokenBalanceOf",
    args: connectedAddress ? [connectedAddress as Address] : undefined,
    chainId: selectedNetwork.id,
    query: { enabled: enabledFundReads && Boolean(connectedAddress) },
  });

  const { data: etiBalanceData } = useReadContract({
    address: etiTokenAddress,
    abi: etiTokenAbi,
    functionName: "balanceOf",
    args: creatorData ? [creatorData as Address] : undefined,
    chainId: selectedNetwork.id,
    query: { enabled: Boolean(etiTokenAbi && etiTokenAddress && creatorData) },
  });

  const { writeContractAsync: writeDeposit, isPending: isDepositing } = useWriteContract();
  const { writeContractAsync: writeRedeem, isPending: isRedeeming } = useWriteContract();

  const fundName = fundNameData as string | undefined;
  const fundSymbol = fundSymbolData as string | undefined;
  const creator = creatorData as string | undefined;
  const fundValue = fundValueData as bigint | undefined;
  const underlyingTokens = Array.isArray(underlyingTokensData)
    ? (underlyingTokensData as string[])
    : ((storedFund?.underlyingTokens as string[] | undefined) ?? []);
  const userBalance = userBalanceData as bigint | undefined;
  const etiBalance = etiBalanceData as bigint | undefined;

  const isCreator = connectedAddress && creator && connectedAddress.toLowerCase() === (creator as string).toLowerCase();
  const displayedTokens = useMemo(() => underlyingTokens, [underlyingTokens]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      notification.error("Please enter a valid deposit amount");
      return;
    }

    if (!etherIndexFundAbi) {
      notification.error("Fund ABI not available for this network");
      return;
    }

    if (chain?.id !== selectedNetwork.id) {
      notification.error(`Wallet is connected to the wrong network. Please switch to ${selectedNetwork.name}`);
      return;
    }

    try {
      await writeDeposit({
        address: vaultAddressChecked,
        abi: fundAbi,
        functionName: "buy",
        value: parseEther(depositAmount),
        chainId: selectedNetwork.id,
      });
      setDepositAmount("");
      notification.success("Deposit successful!");
    } catch (error) {
      console.error("Deposit error:", error);
    }
  };

  const handleRedeem = async () => {
    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      notification.error("Please enter a valid redeem amount");
      return;
    }

    if (!etherIndexFundAbi) {
      notification.error("Fund ABI not available for this network");
      return;
    }

    if (chain?.id !== selectedNetwork.id) {
      notification.error(`Wallet is connected to the wrong network. Please switch to ${selectedNetwork.name}`);
      return;
    }

    try {
      await writeRedeem({
        address: vaultAddressChecked,
        abi: fundAbi,
        functionName: "sell",
        args: [parseEther(redeemAmount)],
        chainId: selectedNetwork.id,
      });
      setRedeemAmount("");
      notification.success("Redemption successful!");
    } catch (error) {
      console.error("Redeem error:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/funds" className="btn btn-ghost btn-sm mb-4 gap-2">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Funds
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{fundName || storedFund?.fundName || "Loading..."}</h1>
        <p className="text-xl text-base-content/70">{fundSymbol || storedFund?.fundTicker || ""}</p>
        <div className="mt-2">
          <span className="text-sm text-base-content/70">Creator: </span>
          <AddressDisplay address={(creator as string) || storedFund?.creator} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Fund Value</h3>
            <p className="text-3xl font-bold">{fundValue ? formatEther(fundValue) : "0"} ETH</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Your Balance</h3>
            <p className="text-3xl font-bold">{userBalance ? formatEther(userBalance) : "0"}</p>
            <p className="text-sm text-base-content/70">{fundSymbol || storedFund?.fundTicker || ""} shares</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Components</h3>
            <p className="text-3xl font-bold">{displayedTokens?.length || 0}</p>
            <p className="text-sm text-base-content/70">tokens</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Invest (Deposit ETH)</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount (ETH)</span>
              </label>
              <input
                type="number"
                placeholder="0.0"
                className="input input-bordered"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <button
              className="btn btn-primary mt-4"
              onClick={handleDeposit}
              disabled={isDepositing || !connectedAddress}
            >
              {isDepositing ? <span className="loading loading-spinner"></span> : "Deposit"}
            </button>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Redeem Shares</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Shares to Redeem</span>
              </label>
              <input
                type="number"
                placeholder="0.0"
                className="input input-bordered"
                value={redeemAmount}
                onChange={e => setRedeemAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <button
              className="btn btn-secondary mt-4"
              onClick={handleRedeem}
              disabled={isRedeeming || !connectedAddress}
            >
              {isRedeeming ? <span className="loading loading-spinner"></span> : "Redeem"}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title">Fund Components</h2>
          {displayedTokens && displayedTokens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token Address</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTokens.map((token, index) => (
                    <tr key={index}>
                      <td>
                        <AddressDisplay address={token} />
                      </td>
                      <td>
                        <TokenWeight tokenAddress={token} fundAddress={vaultAddressChecked} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base-content/70">No components found</p>
          )}
        </div>
      </div>

      {isCreator && (
        <div className="card bg-secondary/10 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Creator Actions</h2>
            <div className="alert alert-info mb-4">
              <span>Your ETI Balance: {etiBalance ? formatEther(etiBalance) : "0"} ETI</span>
            </div>
            <div className="alert alert-warning">
              <span>
                Rebalancing requires ETI and will incur swaps via Uniswap V3. This feature is available in the fund
                management interface.
              </span>
            </div>
            <Link href={`/funds/${vaultAddress}/manage`} className="btn btn-primary mt-4">
              Manage Fund
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

function TokenWeight({ tokenAddress, fundAddress }: { tokenAddress: string; fundAddress: Address }) {
  const selectedNetwork = useSelectedNetwork();
  const etherIndexFundAbi = contracts?.[selectedNetwork.id]?.EtherIndexFund?.abi as Abi | undefined;
  const fundAbi = (etherIndexFundAbi ?? []) as Abi;
  const enabled = Boolean(etherIndexFundAbi);

  const { data: proportion } = useReadContract({
    address: fundAddress,
    abi: fundAbi,
    functionName: "targetProportions",
    args: [tokenAddress as Address],
    chainId: selectedNetwork.id,
    query: { enabled },
  });

  return <span>{proportion ? `${proportion}%` : "Loading..."}</span>;
}

export default FundDetail;
