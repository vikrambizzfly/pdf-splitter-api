const express = require("express");
const upload = require("../middleware/upload");
const { splitPdf } = require("../controllers/index");

const router = express.Router();

router.post("/pdf/split", upload.single("file"), splitPdf);

module.exports = router;
