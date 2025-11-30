"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { ArrowRightIcon, ChartBarIcon, CurrencyDollarIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Ether Index</h1>
            <p className="text-2xl text-base-content/70 mb-8">
              Create and invest in on-chain crypto index funds with ETH and Web2-style login
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/funds" passHref className="btn btn-primary btn-lg gap-2">
                Explore Funds
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link href="/create" passHref className="btn btn-secondary btn-lg gap-2">
                Create Fund
                <ChartBarIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <ShieldCheckIcon className="h-12 w-12 text-primary mb-2" />
                <h3 className="card-title">Login with Gmail</h3>
                <p>Use MetaMask Embedded Wallet for seamless Web2-style login experience</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <CurrencyDollarIcon className="h-12 w-12 text-primary mb-2" />
                <h3 className="card-title">ETH-only Deposits</h3>
                <p>Simple ETH deposits to get instant exposure to diversified token baskets</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <ChartBarIcon className="h-12 w-12 text-primary mb-2" />
                <h3 className="card-title">Manual Rebalancing</h3>
                <p>Fund creators control rebalancing to maintain optimal portfolio weights</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-base-300 w-full px-8 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Login with Gmail</h3>
                <p className="text-base-content/70">Connect using MetaMask Embedded Wallet for a seamless experience</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Choose or Create</h3>
                <p className="text-base-content/70">Browse existing index funds or create your own custom portfolio</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Deposit ETH</h3>
                <p className="text-base-content/70">
                  Invest ETH to receive index fund shares representing your diversified position
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
