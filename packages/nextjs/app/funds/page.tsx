"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { Abi, Address, formatEther } from "viem";
import { useReadContract } from "wagmi";
import { useSelectedNetwork } from "~~/hooks/scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";

type StoredFund = {
  fundId?: number;
  fundAddress: string;
  fundName: string;
  fundTicker: string;
  creator: string;
  chainId: number;
  underlyingTokens?: string[];
  txHash?: string;
};

const Funds: NextPage = () => {
  const selectedNetwork = useSelectedNetwork();
  const [funds, setFunds] = useState<StoredFund[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFunds = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/funds?chainId=${selectedNetwork.id}`);
        const json = await res.json();
        setFunds(json?.funds ?? []);
      } catch (error) {
        console.error("Failed to load funds", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFunds();
  }, [selectedNetwork.id]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Index Funds</h1>
        <p className="text-xl text-base-content/70">Browse and invest in decentralized index funds</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-xl text-base-content/70 mb-4">Loading funds...</p>
        </div>
      ) : funds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-base-content/70 mb-4">No funds created yet</p>
          <Link href="/create" className="btn btn-primary">
            Create the First Fund
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funds.map(fund => (
            <FundCard key={`${fund.chainId}-${fund.fundAddress}`} fund={fund} />
          ))}
        </div>
      )}
    </div>
  );
};

function FundCard({ fund }: { fund: StoredFund }) {
  return <FundCardDetails fund={fund} />;
}

function FundCardDetails({ fund }: { fund: StoredFund }) {
  const selectedNetwork = useSelectedNetwork();
  const etherIndexFundAbi = contracts?.[selectedNetwork.id]?.EtherIndexFund?.abi as Abi | undefined;
  const fundAbi = (etherIndexFundAbi ?? []) as Abi;
  const address = fund.fundAddress as Address;
  const enabled = Boolean(etherIndexFundAbi);

  const { data: fundNameData } = useReadContract({
    address,
    abi: fundAbi,
    functionName: "fundName",
    chainId: selectedNetwork.id,
    query: { enabled },
  });

  const { data: fundSymbolData } = useReadContract({
    address,
    abi: fundAbi,
    functionName: "fundTicker",
    chainId: selectedNetwork.id,
    query: { enabled },
  });

  const { data: fundValueData } = useReadContract({
    address,
    abi: fundAbi,
    functionName: "getCurrentFundValue",
    chainId: selectedNetwork.id,
    query: { enabled },
  });

  const { data: totalSupplyData } = useReadContract({
    address,
    abi: fundAbi,
    functionName: "totalSupply",
    chainId: selectedNetwork.id,
    query: { enabled },
  });

  const fundNameValue = fundNameData as string | undefined;
  const fundSymbolValue = fundSymbolData as string | undefined;
  const fundValue = fundValueData as bigint | undefined;
  const totalSupply = totalSupplyData as bigint | undefined;

  const tvl = fundValue ? formatEther(fundValue) : "0";
  const supply = totalSupply ? formatEther(totalSupply) : "0";

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <h2 className="card-title">{fundNameValue || fund.fundName || "Loading..."}</h2>
        <p className="text-sm text-base-content/70">{fundSymbolValue || fund.fundTicker || ""}</p>

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
          <Link href={`/funds/${fund.fundAddress}`} className="btn btn-primary btn-sm">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Funds;
