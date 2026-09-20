import { connectDB } from "../database";

const db = await connectDB();

// files collection validation
await db.command({
  collMod: "files",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "fileExtension", "name", "parentFolderId"],
      properties: {
        _id: {
          bsonType: "objectId",
        },
        fileExtension: {
          bsonType: "string",
        },
        name: {
          bsonType: "string",
        },
        parentFolderId: {
          bsonType: "objectId",
        },
      },
      additionalProperties: false,
    },
  },
});

// folders collection validation
await db.command({
  collMod: "folders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "parentFolderId", "userId"],
      properties: {
        _id: {
          bsonType: "objectId",
        },
        name: {
          bsonType: "string",
        },
        parentFolderId: {
          bsonType: ["null", "objectId"],
        },
        userId: {
          bsonType: "objectId",
        },
      },
      additionalProperties: false,
    },
  },
});

// users collection validation
await db.command({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "email", "name", "password", "rootFolderId"],
      properties: {
        _id: {
          bsonType: "objectId",
        },
        email: {
          bsonType: "string",
        },
        name: {
          bsonType: "string",
        },
        password: {
          bsonType: "string",
        },
        rootFolderId: {
          bsonType: "objectId",
        },
      },
      additionalProperties: false,
    },
  },
});
