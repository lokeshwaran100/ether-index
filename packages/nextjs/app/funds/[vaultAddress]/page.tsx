"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type PageProps = {
  params: Promise<{ vaultAddress: string }>;
};

const FundDetail: NextPage<PageProps> = (props) => {
  const params = use(props.params);
  const vaultAddress = params.vaultAddress as `0x${string}`;
  const { address: connectedAddress } = useAccount();

  const [depositAmount, setDepositAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");

  const { data: fundName } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "fundName",
  });

  const { data: fundSymbol } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "fundTicker",
  });

  const { data: creator } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "creator",
  });

  const { data: fundValue } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "getCurrentFundValue",
  });

  const { data: underlyingTokens } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "getUnderlyingTokens",
  });

  const { data: userBalance } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "fundTokenBalanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  const { data: etiBalance } = useScaffoldReadContract({
    contractName: "ETIToken",
    functionName: "balanceOf",
    args: creator ? [creator] : undefined,
  });

  const { writeContractAsync: writeDeposit, isMining: isDepositing } = useScaffoldWriteContract({
    contractName: "EtherIndexFund",
  });

  const { writeContractAsync: writeRedeem, isMining: isRedeeming } = useScaffoldWriteContract({
    contractName: "EtherIndexFund",
  });

  const isCreator = connectedAddress && creator && connectedAddress.toLowerCase() === creator.toLowerCase();

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      notification.error("Please enter a valid deposit amount");
      return;
    }

    try {
      await writeDeposit({
        functionName: "buy",
        value: parseEther(depositAmount),
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

    try {
      await writeRedeem({
        functionName: "sell",
        args: [parseEther(redeemAmount)],
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
        <h1 className="text-4xl font-bold mb-2">{fundName || "Loading..."}</h1>
        <p className="text-xl text-base-content/70">{fundSymbol || ""}</p>
        <div className="mt-2">
          <span className="text-sm text-base-content/70">Creator: </span>
          <Address address={creator} />
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
            <p className="text-sm text-base-content/70">{fundSymbol} shares</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Components</h3>
            <p className="text-3xl font-bold">{underlyingTokens?.length || 0}</p>
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
                onChange={(e) => setDepositAmount(e.target.value)}
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
                onChange={(e) => setRedeemAmount(e.target.value)}
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
          {underlyingTokens && underlyingTokens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token Address</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {underlyingTokens.map((token, index) => (
                    <tr key={index}>
                      <td>
                        <Address address={token} />
                      </td>
                      <td>
                        <TokenWeight tokenAddress={token} />
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
              <span>
                Your ETI Balance: {etiBalance ? formatEther(etiBalance) : "0"} ETI
              </span>
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

function TokenWeight({ tokenAddress }: { tokenAddress: string }) {
  const { data: proportion } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "targetProportions",
    args: [tokenAddress as `0x${string}`],
  });

  return <span>{proportion ? `${proportion}%` : "Loading..."}</span>;
}

export default FundDetail;
