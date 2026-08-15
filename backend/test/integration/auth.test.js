const request = require("supertest");
const { expect } = require("chai");

const app = require("../../src/app");

describe("Auth API (integration)", () => {
  const user = {
    name: "Saba Noman",
    email: "saba@example.com",
    password: "Abcd1234!",
  };

  it("signs a new user up", async () => {
    const res = await request(app).post("/api/auth/signup").send(user);

    expect(res.status).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(res.body.user.email).to.equal(user.email);
    expect(res.body.user.password).to.equal(undefined);
  });

  it("rejects signup with a duplicate email", async () => {
    await request(app).post("/api/auth/signup").send(user);
    const res = await request(app).post("/api/auth/signup").send(user);

    expect(res.status).to.equal(400);
  });

  it("logs the user in and returns a token", async () => {
    await request(app).post("/api/auth/signup").send(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a("string");
    expect(res.body.user.email).to.equal(user.email);
  });

  it("rejects login with the wrong password", async () => {
    await request(app).post("/api/auth/signup").send(user);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPass1!" });

    expect(res.status).to.equal(400);
  });

  it("rejects login for an email that was never registered", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "rabianoman@example.com", password: "Abcd1234!" });

    expect(res.status).to.equal(400);
  });

  it("returns the logged-in user's profile from /me", async () => {
    await request(app).post("/api/auth/signup").send(user);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).to.equal(200);
    expect(res.body.user.email).to.equal(user.email);
  });

  it("rejects /me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).to.equal(401);
  });

  it("rejects /me with a garbage token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).to.equal(401);
  });

  it("updates the user's profile name", async () => {
    await request(app).post("/api/auth/signup").send(user);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password });

    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ name: "Saba Updated" });

    expect(res.status).to.equal(200);
    expect(res.body.user.name).to.equal("Saba Updated");
  });
});