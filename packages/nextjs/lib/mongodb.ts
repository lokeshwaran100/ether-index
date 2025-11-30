import { MongoClient, ServerApiVersion } from "mongodb";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://devwithloki_db_user:Cosh8Y22EXAOyAmc@ether-index.zstrfx1.mongodb.net/?appName=ether-index";

if (!uri) {
  throw new Error("Missing MongoDB connection string. Set MONGODB_URI in your env.");
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export const getMongoClient = async () => {
  if (client) {
    return client;
  }

  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  client = await clientPromise;
  return client;
};
