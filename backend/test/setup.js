process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testing_key1234";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

exports.mochaHooks = {
  async beforeAll() {
    this.timeout(30000);
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  },

  async afterEach() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  },

  async afterAll() {
    this.timeout(10000);
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  },
};