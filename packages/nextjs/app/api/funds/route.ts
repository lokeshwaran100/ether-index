import { NextResponse } from "next/server";
import { getMongoClient } from "~~/lib/mongodb";

const DB_NAME = "ether-index";
const COLLECTION = "funds";

type FundRecord = {
  fundId?: number;
  fundAddress: string;
  fundName: string;
  fundTicker: string;
  underlyingTokens: string[];
  creator: string;
  chainId: number;
  txHash?: string;
  createdAt?: Date;
};

const serializeFund = (fund: FundRecord) => ({
  ...fund,
  createdAt: fund.createdAt ? fund.createdAt.toISOString() : undefined,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? Number(chainIdParam) : undefined;

  try {
    const client = await getMongoClient();
    const collection = client.db(DB_NAME).collection<FundRecord>(COLLECTION);
    const query = chainId ? { chainId } : {};

    const funds = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ funds: funds.map(serializeFund) });
  } catch (error) {
    console.error("Failed to fetch funds", error);
    return NextResponse.json({ error: "Failed to fetch funds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fundId, fundAddress, fundName, fundTicker, underlyingTokens = [], creator, chainId, txHash } = body ?? {};

    if (!fundAddress || !fundName || !fundTicker || !creator || !chainId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedFundAddress = (fundAddress as string).toLowerCase();
    const normalizedCreator = (creator as string).toLowerCase();
    const normalizedChainId = Number(chainId);
    const now = new Date();

    const client = await getMongoClient();
    const collection = client.db(DB_NAME).collection<FundRecord>(COLLECTION);

    await collection.updateOne(
      { fundAddress: normalizedFundAddress, chainId: normalizedChainId },
      {
        $set: {
          fundId: typeof fundId === "number" ? fundId : Number(fundId ?? 0),
          fundAddress: normalizedFundAddress,
          fundName,
          fundTicker,
          underlyingTokens,
          creator: normalizedCreator,
          chainId: normalizedChainId,
          txHash,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save fund", error);
    return NextResponse.json({ error: "Failed to save fund" }, { status: 500 });
  }
}
