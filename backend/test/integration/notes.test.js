const request = require("supertest");
const { expect } = require("chai");

const app = require("../../src/app");

async function registerAndLogin() {
  const user = {
    name: "Note Tester",
    email: `tester${Date.now()}${Math.random()}@example.com`,
    password: "Abcd1234!",
  };
  await request(app).post("/api/auth/signup").send(user);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password });
  return res.body.token;
}

describe("Notes API (integration)", () => {
  let token;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/notes");
    expect(res.status).to.equal(401);
  });

  it("creates a note", async () => {
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "First note", content: "hello world" });

    expect(res.status).to.equal(201);
    expect(res.body.note.title).to.equal("First note");
    expect(res.body.note.category).to.equal("General");
  });

  it("rejects creating a note without a title", async () => {
    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "no title here" });

    expect(res.status).to.equal(400);
  });

  it("lists only the current user's notes", async () => {
    await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Note A" });

    const otherToken = await registerAndLogin();
    await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Note B" });

    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.notes).to.have.lengthOf(1);
    expect(res.body.notes[0].title).to.equal("Note A");
  });

  it("updates a note", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Old title" });

    const res = await request(app)
      .put(`/api/notes/${created.body.note._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New title" });

    expect(res.status).to.equal(200);
    expect(res.body.note.title).to.equal("New title");
  });

  it("does not let one user update another user's note", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Mine" });

    const otherToken = await registerAndLogin();

    const res = await request(app)
      .put(`/api/notes/${created.body.note._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked" });

    expect(res.status).to.equal(404);
  });

  it("toggles favorite status", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Fav me" });

    const id = created.body.note._id;

    const res = await request(app)
      .patch(`/api/notes/${id}/favorite`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.note.isFavorite).to.equal(true);
  });

  it("moves a note to trash and restores it", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Trash me" });

    const id = created.body.note._id;

    const trashRes = await request(app)
      .patch(`/api/notes/${id}/trash`)
      .set("Authorization", `Bearer ${token}`);
    expect(trashRes.body.note.isDeleted).to.equal(true);

    const restoreRes = await request(app)
      .patch(`/api/notes/${id}/restore`)
      .set("Authorization", `Bearer ${token}`);
    expect(restoreRes.body.note.isDeleted).to.equal(false);
  });

  it("permanently deletes a note", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Delete me" });

    const id = created.body.note._id;

    const delRes = await request(app)
      .delete(`/api/notes/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).to.equal(200);

    const getRes = await request(app)
      .get(`/api/notes/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).to.equal(404);
  });

  it("returns 404 for an invalid note id", async () => {
    const res = await request(app)
      .get("/api/notes/not-a-valid-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(404);
  });

  it("returns note stats", async () => {
    await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Stat note" });

    const res = await request(app)
      .get("/api/notes/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.stats.totalNotes).to.equal(1);
  });
});
