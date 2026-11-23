import { createClient } from "redis";

export const redisClient = createClient();

redisClient.on("error", (err) => {
  console.log("error occured in redis");
  console.log(err.message);
  process.exit(1);
});

await redisClient.connect();
