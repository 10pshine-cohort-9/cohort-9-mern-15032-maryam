const { expect } = require("chai");
const sinon = require("sinon");
const User = require("../../src/models/User");
const authController = require("../../src/controllers/authController");

function mockReqRes(body = {}, user = null) {
  const req = { body, user };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}

describe("authController (unit)", () => {
  afterEach(() => sinon.restore());

  describe("signup", () => {
    it("rejects when a required field is missing", async () => {
      const { req, res } = mockReqRes({ name: "Muhammad Usman Khan", email: "usman@test.com" });
      await authController.signup(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.success).to.equal(false);
    });

    it("rejects an invalid email format", async () => {
      const { req, res } = mockReqRes({
        name: "Muhammad Usman Khan",
        email: "not-an-email",
        password: "Usm@n456",
      });
      await authController.signup(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/email/i);
    });

    it("rejects a password that fails the strength rules", async () => {
      const { req, res } = mockReqRes({
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        password: "weak456",
      });
      await authController.signup(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/password/i);
    });

    it("rejects when the email is already registered", async () => {
      sinon.stub(User, "findOne").resolves({ _id: "existing" });
      const { req, res } = mockReqRes({
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        password: "Usm@n456",
      });
      await authController.signup(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/exists/i);
    });

    it("creates the user and returns 201 on valid input", async () => {
      sinon.stub(User, "findOne").resolves(null);
      sinon.stub(User, "create").resolves({
        _id: "new-user-id",
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
      });

      const { req, res } = mockReqRes({
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        password: "Usm@n456",
      });
      await authController.signup(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.body.success).to.equal(true);
      expect(res.body.user.email).to.equal("usman@test.com");
      expect(res.body.user.password).to.equal(undefined);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(User, "findOne").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        password: "Usm@n456",
      });
      await authController.signup(req, res);
      expect(res.statusCode).to.equal(500);
      expect(res.body.success).to.equal(false);
    });
  });

  describe("login", () => {
    it("rejects missing credentials", async () => {
      const { req, res } = mockReqRes({ email: "usman@test.com" });
      await authController.login(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects an invalid email format", async () => {
      const { req, res } = mockReqRes({
        email: "not-an-email",
        password: "Usm@n456",
      });
      await authController.login(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/email/i);
    });

    it("rejects when the user does not exist", async () => {
      sinon.stub(User, "findOne").returns({
        select: sinon.stub().resolves(null),
      });
      const { req, res } = mockReqRes({
        email: "rabianoman@test.com",
        password: "Usm@n456",
      });
      await authController.login(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/invalid email/i);
    });

    it("rejects a wrong password", async () => {
      const bcrypt = require("bcryptjs");
      const realHash = await bcrypt.hash("CorrectPass1!", 10);
      sinon.stub(User, "findOne").returns({
        select: sinon.stub().resolves({
          _id: "user-id",
          email: "usman@test.com",
          password: realHash,
        }),
      });

      const { req, res } = mockReqRes({
        email: "usman@test.com",
        password: "WrongPass1!",
      });
      await authController.login(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/wrong password/i);
    });

    it("returns a token and user on correct credentials", async () => {
      const bcrypt = require("bcryptjs");
      const realHash = await bcrypt.hash("CorrectPass1!", 10);
      sinon.stub(User, "findOne").returns({
        select: sinon.stub().resolves({
          _id: "user-id",
          name: "Muhammad Usman Khan",
          email: "usman@test.com",
          password: realHash,
          avatar: null,
        }),
      });

      const { req, res } = mockReqRes({
        email: "usman@test.com",
        password: "CorrectPass1!",
      });
      await authController.login(req, res);

      expect(res.statusCode).to.equal(null); 
      expect(res.body.success).to.equal(true);
      expect(res.body.token).to.be.a("string");
      expect(res.body.user.email).to.equal("usman@test.com");
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(User, "findOne").returns({
        select: sinon.stub().rejects(new Error("DB down")),
      });
      const { req, res } = mockReqRes({
        email: "usman@test.com",
        password: "Usm@n456",
      });
      await authController.login(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("getMe", () => {
    it("returns 404 when the user no longer exists", async () => {
      sinon.stub(User, "findById").resolves(null);
      const { req, res } = mockReqRes({}, { id: "gone" });
      await authController.getMe(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("returns the current user's profile", async () => {
      sinon.stub(User, "findById").resolves({
        _id: "user-1",
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        avatar: null,
        createdAt: new Date("2024-01-01"),
      });
      const { req, res } = mockReqRes({}, { id: "user-1" });
      await authController.getMe(req, res);
      expect(res.body.success).to.equal(true);
      expect(res.body.user.email).to.equal("usman@test.com");
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(User, "findById").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({}, { id: "user-1" });
      await authController.getMe(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("updateProfile", () => {
    it("rejects when there is nothing to update", async () => {
      const { req, res } = mockReqRes({}, { id: "user-1" });
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects an empty name", async () => {
      const { req, res } = mockReqRes({ name: "   " }, { id: "user-1" });
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/name/i);
    });

    it("rejects an invalid email format", async () => {
      const { req, res } = mockReqRes({ email: "not-an-email" }, { id: "user-1" });
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/email/i);
    });

    it("rejects an email already used by another account", async () => {
      sinon.stub(User, "findOne").resolves({ _id: "someone-else" });
      const { req, res } = mockReqRes(
        { email: "taken@test.com" },
        { id: "user-1" },
      );
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/already in use/i);
    });

    it("returns 404 when the user no longer exists", async () => {
      sinon.stub(User, "findByIdAndUpdate").resolves(null);
      const { req, res } = mockReqRes({ name: "New Name" }, { id: "gone" });
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("updates the name and email successfully", async () => {
      sinon.stub(User, "findOne").resolves(null);
      sinon.stub(User, "findByIdAndUpdate").resolves({
        _id: "user-1",
        name: "New Name",
        email: "new@test.com",
        avatar: null,
        createdAt: new Date("2024-01-01"),
      });

      const { req, res } = mockReqRes(
        { name: "New Name", email: "new@test.com" },
        { id: "user-1" },
      );
      await authController.updateProfile(req, res);

      expect(res.body.success).to.equal(true);
      expect(res.body.user.name).to.equal("New Name");
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(User, "findByIdAndUpdate").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ name: "New Name" }, { id: "user-1" });
      await authController.updateProfile(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("updateAvatar", () => {
    it("rejects a non-string, non-null avatar", async () => {
      const { req, res } = mockReqRes({ avatar: 12345 }, { id: "user-1" });
      await authController.updateAvatar(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects an avatar that is too large", async () => {
      const { req, res } = mockReqRes(
        { avatar: "x".repeat(2_000_001) },
        { id: "user-1" },
      );
      await authController.updateAvatar(req, res);
      expect(res.statusCode).to.equal(400);
      expect(res.body.message).to.match(/too large/i);
    });

    it("returns 404 when the user no longer exists", async () => {
      sinon.stub(User, "findByIdAndUpdate").resolves(null);
      const { req, res } = mockReqRes({ avatar: "data:image/png;base64,abc" }, { id: "gone" });
      await authController.updateAvatar(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("sets a new avatar successfully", async () => {
      sinon.stub(User, "findByIdAndUpdate").resolves({
        _id: "user-1",
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        avatar: "data:image/png;base64,abc",
        createdAt: new Date("2024-01-01"),
      });

      const { req, res } = mockReqRes(
        { avatar: "data:image/png;base64,abc" },
        { id: "user-1" },
      );
      await authController.updateAvatar(req, res);

      expect(res.body.success).to.equal(true);
      expect(res.body.user.avatar).to.equal("data:image/png;base64,abc");
    });

    it("removes the avatar when null is sent", async () => {
      sinon.stub(User, "findByIdAndUpdate").resolves({
        _id: "user-1",
        name: "Muhammad Usman Khan",
        email: "usman@test.com",
        avatar: null,
        createdAt: new Date("2024-01-01"),
      });

      const { req, res } = mockReqRes({ avatar: null }, { id: "user-1" });
      await authController.updateAvatar(req, res);

      expect(res.body.user.avatar).to.equal(null);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(User, "findByIdAndUpdate").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ avatar: null }, { id: "user-1" });
      await authController.updateAvatar(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });
});