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

const serializeFund = (fund: FundRecord | null) =>
  fund
    ? {
        ...fund,
        createdAt: fund.createdAt ? fund.createdAt.toISOString() : undefined,
      }
    : null;

export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  const params = await context.params;
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? Number(chainIdParam) : undefined;

  const fundAddress = params.address?.toLowerCase();
  if (!fundAddress) {
    return NextResponse.json({ error: "Missing fund address" }, { status: 400 });
  }

  try {
    const client = await getMongoClient();
    const collection = client.db(DB_NAME).collection<FundRecord>(COLLECTION);
    const query = chainId ? { fundAddress, chainId } : { fundAddress };
    const fund = await collection.findOne(query);
    return NextResponse.json({ fund: serializeFund(fund) });
  } catch (error) {
    console.error("Failed to fetch fund", error);
    return NextResponse.json({ error: "Failed to fetch fund" }, { status: 500 });
  }
}
