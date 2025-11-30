"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Funds: NextPage = () => {
  const { data: fundsLength } = useScaffoldReadContract({
    contractName: "FundFactory",
    functionName: "getTotalFunds",
  });

  const fundsCount = Number(fundsLength || 0n);
  const fundIndices = Array.from({ length: fundsCount }, (_, i) => i);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Index Funds</h1>
        <p className="text-xl text-base-content/70">
          Browse and invest in decentralized index funds
        </p>
      </div>

      {fundsCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-base-content/70 mb-4">No funds created yet</p>
          <Link href="/create" className="btn btn-primary">
            Create the First Fund
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fundIndices.map(index => (
            <FundCard key={index} fundIndex={BigInt(index)} />
          ))}
        </div>
      )}
    </div>
  );
};

function FundCard({ fundIndex }: { fundIndex: bigint }) {
  const { data: fundAddress } = useScaffoldReadContract({
    contractName: "FundFactory",
    functionName: "etherIndexFunds",
    args: [fundIndex],
  });

  if (!fundAddress) {
    return (
      <div className="card bg-base-100 shadow-xl animate-pulse">
        <div className="card-body">
          <div className="h-6 bg-base-300 rounded w-3/4"></div>
          <div className="h-4 bg-base-300 rounded w-1/2 mt-2"></div>
        </div>
      </div>
    );
  }

  return <FundCardDetails fundAddress={fundAddress} />;
}

function FundCardDetails({ fundAddress }: { fundAddress: string }) {
  const { data: fundName } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "fundName",
    args: undefined,
  });

  const { data: fundSymbol } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "fundTicker",
    args: undefined,
  });

  const { data: fundValue } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "getCurrentFundValue",
    args: undefined,
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "EtherIndexFund",
    functionName: "totalSupply",
    args: undefined,
  });

  const tvl = fundValue ? formatEther(fundValue) : "0";
  const supply = totalSupply ? formatEther(totalSupply) : "0";

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <h2 className="card-title">{fundName || "Loading..."}</h2>
        <p className="text-sm text-base-content/70">{fundSymbol || ""}</p>

        <div className="divider my-2"></div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-base-content/70">TVL</p>
            <p className="font-semibold">{parseFloat(tvl).toFixed(4)} ETH</p>
          </div>
          <div>
            <p className="text-base-content/70">Shares</p>
            <p className="font-semibold">{parseFloat(supply).toFixed(2)}</p>
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          <Link
            href={`/funds/${fundAddress}`}
            className="btn btn-primary btn-sm"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Funds;
