"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, isAddress } from "viem";
import { useAccount } from "wagmi";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type TokenComponent = {
  address: string;
  weight: string;
};

const CreateFund: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const [step, setStep] = useState(1);

  const [fundName, setFundName] = useState("");
  const [fundSymbol, setFundSymbol] = useState("");
  const [components, setComponents] = useState<TokenComponent[]>([
    { address: "", weight: "" },
  ]);

  const { data: etiBalance } = useScaffoldReadContract({
    contractName: "ETIToken",
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  const { data: creationFee } = useScaffoldReadContract({
    contractName: "FundFactory",
    functionName: "creationFee",
  });

  const { data: fundFactoryContract } = useDeployedContractInfo({
    contractName: "FundFactory",
  });

  const { writeContractAsync: approveETI, isMining: isApproving } = useScaffoldWriteContract({
    contractName: "ETIToken",
  });

  const { writeContractAsync: createFund, isMining: isCreating } = useScaffoldWriteContract({
    contractName: "FundFactory",
  });

  const addComponent = () => {
    setComponents([...components, { address: "", weight: "" }]);
  };

  const removeComponent = (index: number) => {
    if (components.length > 1) {
      setComponents(components.filter((_, i) => i !== index));
    }
  };

  const updateComponent = (index: number, field: "address" | "weight", value: string) => {
    const newComponents = [...components];
    newComponents[index][field] = value;
    setComponents(newComponents);
  };

  const validateStep1 = () => {
    if (!fundName.trim()) {
      notification.error("Please enter a fund name");
      return false;
    }
    if (!fundSymbol.trim()) {
      notification.error("Please enter a fund symbol");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (components.some((c) => !c.address.trim() || !isAddress(c.address))) {
      notification.error("Please enter valid token addresses");
      return false;
    }

    if (components.some((c) => !c.weight.trim() || parseFloat(c.weight) <= 0)) {
      notification.error("Please enter valid weights (greater than 0)");
      return false;
    }

    const totalWeight = components.reduce((sum, c) => sum + parseFloat(c.weight), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      notification.error(`Total weight must equal 100% (current: ${totalWeight.toFixed(2)}%)`);
      return false;
    }

    const uniqueAddresses = new Set(components.map((c) => c.address.toLowerCase()));
    if (uniqueAddresses.size !== components.length) {
      notification.error("Duplicate token addresses are not allowed");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleApprove = async () => {
    if (!creationFee) {
      notification.error("Could not fetch creation fee");
      return;
    }

    if (!fundFactoryContract?.address) {
      notification.error("FundFactory contract not found on this network");
      return;
    }

    try {
      await approveETI({
        functionName: "approve",
        args: [fundFactoryContract.address, creationFee],
      });

      notification.success("ETI approved! You can now create the fund.");
    } catch (error) {
      console.error("Approval error:", error);
    }
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;

    try {
      const tokenAddresses = components.map((c) => c.address as `0x${string}`);

      await createFund({
        functionName: "createFund",
        args: [fundName, fundSymbol, tokenAddresses],
      });

      notification.success("Fund created successfully!");
      router.push("/funds");
    } catch (error) {
      console.error("Create fund error:", error);
    }
  };

  const hasEnoughETI = etiBalance && creationFee ? etiBalance >= creationFee : false;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create Index Fund</h1>
        <p className="text-xl text-base-content/70">Set up your custom crypto index fund</p>
      </div>

      <ul className="steps steps-horizontal w-full mb-8">
        <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Fund Info</li>
        <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Components</li>
        <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Review</li>
      </ul>

      {step === 1 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Fund Metadata</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Fund Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Blue Chip Index"
                className="input input-bordered"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Fund Symbol</span>
              </label>
              <input
                type="text"
                placeholder="e.g., BCI"
                className="input input-bordered"
                value={fundSymbol}
                onChange={(e) => setFundSymbol(e.target.value.toUpperCase())}
              />
            </div>

            <div className="card-actions justify-end mt-6">
              <button className="btn btn-primary" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Fund Components</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Add ERC-20 tokens and their target weights. Total must equal 100%.
            </p>

            {components.map((component, index) => (
              <div key={index} className="border border-base-300 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Token {index + 1}</span>
                  {components.length > 1 && (
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => removeComponent(index)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Token Address</span>
                    </label>
                    <AddressInput
                      placeholder="0x..."
                      value={component.address}
                      onChange={(value) => updateComponent(index, "address", value)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Weight (%)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 50"
                      className="input input-bordered"
                      value={component.weight}
                      onChange={(e) => updateComponent(index, "weight", e.target.value)}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button className="btn btn-outline btn-sm gap-2 mb-4" onClick={addComponent}>
              <PlusIcon className="h-4 w-4" />
              Add Token
            </button>

            <div className="divider"></div>

            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Weight:</span>
              <span
                className={`font-bold ${
                  Math.abs(components.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0) - 100) < 0.01
                    ? "text-success"
                    : "text-error"
                }`}
              >
                {components.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0).toFixed(2)}%
              </span>
            </div>

            <div className="card-actions justify-between mt-6">
              <button className="btn" onClick={handleBack}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Review Your Fund</h2>

              <div className="space-y-4">
                <div>
                  <span className="font-semibold">Fund Name:</span>
                  <p>{fundName}</p>
                </div>

                <div>
                  <span className="font-semibold">Fund Symbol:</span>
                  <p>{fundSymbol}</p>
                </div>

                <div>
                  <span className="font-semibold">Components:</span>
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((c, i) => (
                          <tr key={i}>
                            <td>
                              <Address address={c.address} />
                            </td>
                            <td>{c.weight}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card-actions justify-between mt-6">
                <button className="btn" onClick={handleBack}>
                  Back
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Creation Fee</h2>

              <div className="alert alert-info mb-4">
                <div>
                  <p className="font-semibold">Required ETI: {creationFee ? formatEther(creationFee) : "Loading..."}</p>
                  <p className="text-sm">Your Balance: {etiBalance ? formatEther(etiBalance) : "0"} ETI</p>
                </div>
              </div>

              {!hasEnoughETI && (
                <div className="alert alert-warning">
                  <span>You don't have enough ETI to create a fund. Please acquire ETI first.</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleApprove}
                  disabled={!hasEnoughETI || isApproving || !connectedAddress}
                >
                  {isApproving ? <span className="loading loading-spinner"></span> : "1. Approve ETI"}
                </button>

                <button
                  className="btn btn-primary w-full"
                  onClick={handleCreate}
                  disabled={!hasEnoughETI || isCreating || !connectedAddress}
                >
                  {isCreating ? <span className="loading loading-spinner"></span> : "2. Create Fund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateFund;
