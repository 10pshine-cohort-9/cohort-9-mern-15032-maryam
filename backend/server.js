const dotenv = require("dotenv");
dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});