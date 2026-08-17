const { expect } = require("chai");
const sinon = require("sinon");
const Note = require("../../src/models/Note");
const noteController = require("../../src/controllers/noteController");

const { escapeRegex, normalizeCategory, categoryMatchRegex } =
  noteController._internal;

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, query: {}, user: { id: "user-1" }, ...overrides };
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

describe("noteController — helper functions (unit)", () => {
  describe("escapeRegex", () => {
    it("escapes regex metacharacters so they're treated as literal text", () => {
      const result = escapeRegex("a+b*c?");
      expect(result).to.equal("a\\+b\\*c\\?");
    });

    it("leaves plain alphanumeric text unchanged", () => {
      expect(escapeRegex("meeting notes")).to.equal("meeting notes");
    });
  });

  describe("normalizeCategory", () => {
    it("collapses extra whitespace and title-cases the result", () => {
      expect(normalizeCategory("  work   notes  ")).to.equal("Work Notes");
    });

    it("treats different casings as the same category", () => {
      expect(normalizeCategory("WORK")).to.equal(normalizeCategory("work"));
    });
  });

  describe("categoryMatchRegex", () => {
    it("matches the same category regardless of internal spacing/casing", () => {
      const regex = categoryMatchRegex("Work Notes");
      expect(regex.test("work  notes")).to.equal(true);
      expect(regex.test("WORK NOTES")).to.equal(true);
      expect(regex.test("Personal")).to.equal(false);
    });
  });
});

describe("noteController — validation (unit)", () => {
  afterEach(() => sinon.restore());

  describe("createNote", () => {
    it("rejects a missing title", async () => {
      const { req, res } = mockReqRes({ body: { content: "hello" } });
      await noteController.createNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects a title longer than 100 characters", async () => {
      const { req, res } = mockReqRes({ body: { title: "x".repeat(101) } });
      await noteController.createNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects a non-string content value", async () => {
      const { req, res } = mockReqRes({ body: { title: "Valid", content: 123 } });
      await noteController.createNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects a non-string category value", async () => {
      const { req, res } = mockReqRes({ body: { title: "Valid", category: 123 } });
      await noteController.createNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("defaults category to General when none is given", async () => {
      const createStub = sinon.stub(Note, "create").resolves({
        _id: "note-1",
        title: "Valid",
        content: "",
        category: "General",
      });

      const { req, res } = mockReqRes({ body: { title: "Valid" } });
      await noteController.createNote(req, res);

      expect(res.statusCode).to.equal(201);
      expect(createStub.firstCall.args[0].category).to.equal("General");
    });

    it("normalizes a supplied category before saving", async () => {
      const createStub = sinon.stub(Note, "create").resolves({
        _id: "note-1",
        title: "Valid",
        category: "Work",
      });

      const { req, res } = mockReqRes({ body: { title: "Valid", category: "  work  " } });
      await noteController.createNote(req, res);

      expect(createStub.firstCall.args[0].category).to.equal("Work");
    });

    it("returns 400 on a mongoose ValidationError", async () => {
      const err = new Error("bad data");
      err.name = "ValidationError";
      sinon.stub(Note, "create").rejects(err);

      const { req, res } = mockReqRes({ body: { title: "Valid" } });
      await noteController.createNote(req, res);

      expect(res.statusCode).to.equal(400);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "create").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ body: { title: "Valid" } });
      await noteController.createNote(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("updateNote", () => {
    it("returns 404 when the note doesn't belong to the user", async () => {
      sinon.stub(Note, "findOne").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "missing" }, body: { title: "New" } });
      await noteController.updateNote(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("rejects clearing the title to an empty string", async () => {
      sinon.stub(Note, "findOne").resolves({ save: sinon.stub().resolves() });
      const { req, res } = mockReqRes({ params: { id: "note-1" }, body: { title: "   " } });
      await noteController.updateNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("rejects a non-string content value", async () => {
      sinon.stub(Note, "findOne").resolves({ save: sinon.stub().resolves() });
      const { req, res } = mockReqRes({
        params: { id: "note-1" },
        body: { content: 123 },
      });
      await noteController.updateNote(req, res);
      expect(res.statusCode).to.equal(400);
    });

    it("updates title, content and category successfully", async () => {
      const note = {
        title: "Old",
        content: "old content",
        category: "General",
        save: sinon.stub().resolves(),
      };
      sinon.stub(Note, "findOne").resolves(note);

      const { req, res } = mockReqRes({
        params: { id: "note-1" },
        body: { title: "New", content: "new content", category: "work" },
      });
      await noteController.updateNote(req, res);
      expect(res.body.success).to.equal(true);
      expect(note.title).to.equal("New");
      expect(note.category).to.equal("Work");
      expect(note.save.calledOnce).to.equal(true);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "findOne").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ params: { id: "note-1" }, body: { title: "New" } });
      await noteController.updateNote(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("getNotes", () => {
    it("caps the page limit at 50 even if a larger value is requested", async () => {
      const findStub = sinon.stub(Note, "find").returns({
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([]),
      });
      sinon.stub(Note, "countDocuments").resolves(0);

      const { req, res } = mockReqRes({ query: { limit: "1000" } });
      await noteController.getNotes(req, res);

      expect(res.body.pagination.limit).to.equal(50);
      expect(findStub.called).to.equal(true);
    });

    it("filters by the trash flag when filter=trash", async () => {
      const findStub = sinon.stub(Note, "find").returns({
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([]),
      });
      sinon.stub(Note, "countDocuments").resolves(0);

      const { req, res } = mockReqRes({ query: { filter: "trash" } });
      await noteController.getNotes(req, res);

      expect(findStub.firstCall.args[0].isDeleted).to.equal(true);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "find").throws(new Error("DB down"));
      const { req, res } = mockReqRes({});
      await noteController.getNotes(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("getNoteById", () => {
    it("returns 404 when the note is not found", async () => {
      sinon.stub(Note, "findOne").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.getNoteById(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("returns the note when found", async () => {
      sinon.stub(Note, "findOne").resolves({ _id: "n1", title: "Hi" });
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.getNoteById(req, res);
      expect(res.body.note.title).to.equal("Hi");
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "findOne").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.getNoteById(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("toggleFavorite", () => {
    it("returns 404 when the note doesn't belong to the user", async () => {
      sinon.stub(Note, "findOne").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.toggleFavorite(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("flips isFavorite and saves", async () => {
      const note = { _id: "n1", isFavorite: false, save: sinon.stub().resolves() };
      sinon.stub(Note, "findOne").resolves(note);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.toggleFavorite(req, res);
      expect(note.isFavorite).to.equal(true);
      expect(note.save.calledOnce).to.equal(true);
    });
  });

  describe("trashNote / restoreNote / deleteNote", () => {
    it("trashNote returns 404 when not found", async () => {
      sinon.stub(Note, "findOneAndUpdate").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.trashNote(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("trashNote marks the note deleted", async () => {
      sinon.stub(Note, "findOneAndUpdate").resolves({ _id: "n1", isDeleted: true });
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.trashNote(req, res);
      expect(res.body.note.isDeleted).to.equal(true);
    });

    it("restoreNote returns 404 when not found", async () => {
      sinon.stub(Note, "findOneAndUpdate").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.restoreNote(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("restoreNote un-marks the note as deleted", async () => {
      sinon.stub(Note, "findOneAndUpdate").resolves({ _id: "n1", isDeleted: false });
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.restoreNote(req, res);
      expect(res.body.note.isDeleted).to.equal(false);
    });

    it("deleteNote returns 404 when not found", async () => {
      sinon.stub(Note, "findOneAndDelete").resolves(null);
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.deleteNote(req, res);
      expect(res.statusCode).to.equal(404);
    });

    it("deleteNote removes the note permanently", async () => {
      sinon.stub(Note, "findOneAndDelete").resolves({ _id: "n1" });
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.deleteNote(req, res);
      expect(res.body.success).to.equal(true);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "findOneAndDelete").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({ params: { id: "n1" } });
      await noteController.deleteNote(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("getStats", () => {
    it("returns aggregated counts for the current user", async () => {
      const countStub = sinon.stub(Note, "countDocuments");
      countStub.onCall(0).resolves(5); 
      countStub.onCall(1).resolves(2); 
      countStub.onCall(2).resolves(1); 
      sinon.stub(Note, "aggregate").resolves([
        { _id: "work", count: 3 },
        { _id: "personal", count: 2 },
      ]);
      const { req, res } = mockReqRes({
        user: { id: "64a1f7c2e1b1c9a1d2e3f4a5" },
      });
      await noteController.getStats(req, res);

      expect(res.body.stats.totalNotes).to.equal(5);
      expect(res.body.stats.favorites).to.equal(2);
      expect(res.body.stats.trashItems).to.equal(1);
      expect(res.body.stats.categories).to.equal(2);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "countDocuments").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({});
      await noteController.getStats(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });

  describe("getCategories", () => {
    it("returns normalized category names with counts", async () => {
      sinon.stub(Note, "aggregate").resolves([
        { _id: "work", count: 4 },
        { _id: "personal notes", count: 1 },
      ]);

      const { req, res } = mockReqRes({
        user: { id: "64a1f7c2e1b1c9a1d2e3f4a5" },
      });
      await noteController.getCategories(req, res);

      expect(res.body.success).to.equal(true);
      expect(res.body.categories).to.deep.equal([
        { name: "Work", count: 4 },
        { name: "Personal Notes", count: 1 },
      ]);
    });

    it("returns 500 when the database throws unexpectedly", async () => {
      sinon.stub(Note, "aggregate").rejects(new Error("DB down"));
      const { req, res } = mockReqRes({});
      await noteController.getCategories(req, res);
      expect(res.statusCode).to.equal(500);
    });
  });
});
