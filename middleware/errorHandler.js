const multer = require("multer");

const errorHandler = (error, req, res, next) => {
  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    return res.status(400).send({ error: error.message });
  }
  // Handle other errors
  res.status(500).send({ error: "Internal server error" });
};

module.exports = errorHandler;
