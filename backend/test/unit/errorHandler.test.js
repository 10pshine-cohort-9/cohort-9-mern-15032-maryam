const { expect } = require("chai");
const sinon = require("sinon");

const errorHandler = require("../../src/middlewares/errorHandler");

function mockRes() {
  return {
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
}

describe("errorHandler middleware (unit)", () => {
  afterEach(() => sinon.restore());

  it("defaults to a 500 status and generic message when the error has none", () => {
    sinon.stub(console, "error"); 
    const res = mockRes();
    const next = sinon.stub();

    errorHandler(new Error(), {}, res, next);

    expect(res.statusCode).to.equal(500);
    expect(res.body).to.deep.equal({
      success: false,
      message: "Server Error",
    });
  });

  it("uses the error's own status and message when provided", () => {
    sinon.stub(console, "error");
    const res = mockRes();
    const next = sinon.stub();

    const err = new Error("Not allowed");
    err.status = 403;

    errorHandler(err, {}, res, next);

    expect(res.statusCode).to.equal(403);
    expect(res.body.message).to.equal("Not allowed");
    expect(res.body.success).to.equal(false);
  });

  it("logs the error so it isn't silently swallowed", () => {
    const logSpy = sinon.stub(console, "error");
    const res = mockRes();

    errorHandler(new Error("boom"), {}, res, sinon.stub());

    expect(logSpy.calledOnce).to.equal(true);
  });
});
