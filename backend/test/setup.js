process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testing_key1234";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

exports.mochaHooks = {
  async beforeAll() {
    this.timeout(30000);
    mongoServer = await MongoMemoryServer.create();
    try {
      await mongoose.connect(mongoServer.getUri());
    } catch (err) {
      await mongoServer.stop();
      throw err;
    }
  },

  async afterEach() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (err) {
        console.error(`Failed to clear collection "${key}":`, err);
      }
    }
  },

  async afterAll() {
    this.timeout(10000);
    try {
      await mongoose.connection.dropDatabase();
    } catch (err) {
      console.error("Failed to drop test database:", err);
    } finally {
      await mongoose.connection.close();
      await mongoServer.stop();
    }
  },
};