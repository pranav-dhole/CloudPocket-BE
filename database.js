import { MongoClient } from "mongodb";
import { readFile } from "fs/promises";

const client = new MongoClient("mongodb://localhost:27017/");

export async function connectDB() {
  await client.connect();
  console.log("Connected to database");

  const db = client.db("cloudpockets");
  return db;
}

process.on("SIGINT", async () => {
  await client.close();
  console.log("Disconnected from database");
  process.exit(0);
});
