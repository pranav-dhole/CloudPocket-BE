import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017/cloudpockets");
    console.log("Connected to database");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("Disconnected from database");
  process.exit(0);
});
