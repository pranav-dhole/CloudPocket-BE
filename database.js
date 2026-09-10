import { MongoClient } from "mongodb";
import { readFile } from "fs/promises";

const client = new MongoClient("mongodb://localhost:27017/");
await client.connect();

const db = client.db("cloudpockets");
const usersCollection = db.collection("users");
const foldersCollection = db.collection("folders");
const filesCollection = db.collection("files");

const filesRawdata = await readFile("./filesDB.json", "utf-8");
const foldersRawdata = await readFile("./foldersDB.json", "utf-8");
const usersRawdata = await readFile("./usersDB.json", "utf-8");

const filesData = JSON.parse(filesRawdata);
const foldersData = JSON.parse(foldersRawdata);
const usersData = JSON.parse(usersRawdata);

usersCollection.insertMany(usersData);
foldersCollection.insertMany(foldersData);
filesCollection.insertMany(filesData);

client.close();
