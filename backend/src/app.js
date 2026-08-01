const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const loggerMiddleware = require("./middlewares/loggerMiddleware");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());

app.use(loggerMiddleware);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use(errorHandler);

module.exports = app;
