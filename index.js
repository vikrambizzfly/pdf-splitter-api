require("dotenv/config");
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const apiKeyAuth = require("./middleware/auth");
const { pdfRoutes, authRoutes } = require("./routes/index");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    exposedHeaders: ["Content-Disposition", "X-Suggested-Filename"],
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "PDF Splitter API is running" });
});

app.use("/api/auth", authRoutes);

app.use("/api", apiKeyAuth, pdfRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
