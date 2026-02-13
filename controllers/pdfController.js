const fs = require("fs");
const {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
  PDFName,
} = require("pdf-lib");

exports.splitPdf = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).send({ error: "Please upload a PDF file" });
  }

  if (!req.body.pageSize) {
    return res.status(400).send({ error: "Please provide pageSize" });
  }

  const requestedSize = req.body.pageSize.toUpperCase();
  if (!["A3", "A4"].includes(requestedSize)) {
    return res
      .status(400)
      .send({ error: "Invalid pageSize. Supported sizes: A3, A4" });
  }

  try {
    const srcPdfBytes = fs.readFileSync(req.file.path);
    const srcPdfDoc = await PDFDocument.load(srcPdfBytes);
    const finalPdf = await PDFDocument.create();
    const font = await finalPdf.embedFont(StandardFonts.Helvetica);

    // Target page dimensions (landscape) for adaptive chunking
    const targetDims =
      requestedSize === "A3"
        ? { w: PageSizes.A3[1], h: PageSizes.A3[0] }
        : { w: PageSizes.A4[1], h: PageSizes.A4[0] };

    // How much source content to show per tile
    const chunkTargetW = 400;
    const chunkTargetH = 300;

    const getExcelColumnName = (colIndex) => {
      let name = "";
      while (colIndex >= 0) {
        name = String.fromCharCode((colIndex % 26) + 65) + name;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return name;
    };

    let globalRowOffset = 0;
    const srcPages = srcPdfDoc.getPages();

    for (let i = 0; i < srcPages.length; i++) {
      const srcPage = srcPages[i];
      const { width: mw, height: mh, x: mx, y: my } = srcPage.getMediaBox();

      // Calculate grid size
      let cols = Math.max(1, Math.ceil(mw / chunkTargetW));
      let rows = Math.max(1, Math.ceil(mh / chunkTargetH));

      // Force splits on large pages that would otherwise fit in 1x1
      if (
        cols === 1 &&
        rows === 1 &&
        (mw > targetDims.w * 0.9 || mh > targetDims.h * 0.9)
      ) {
        if (mw / targetDims.w > mh / targetDims.h) cols = 2;
        else rows = 2;
      }

      const chunkW = mw / cols;
      const chunkH = mh / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const [copiedPage] = await finalPdf.copyPages(srcPdfDoc, [i]);

          // CropBox bounds (PDF origin: bottom-left)
          const cropBox = [
            mx + c * chunkW, // left
            my + mh - (r + 1) * chunkH, // bottom
            mx + (c + 1) * chunkW, // right
            my + mh - r * chunkH, // top
          ];

          copiedPage.node.set(
            PDFName.of("CropBox"),
            finalPdf.context.obj(cropBox),
          );
          copiedPage.node.set(
            PDFName.of("MediaBox"),
            finalPdf.context.obj(cropBox),
          );

          finalPdf.addPage(copiedPage);

          // Add tile label
          const label = `${getExcelColumnName(c)}${globalRowOffset + r + 1}`;
          copiedPage.drawText(label, {
            x: cropBox[0] + 5,
            y: cropBox[1] + 5,
            size: 11,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }
      globalRowOffset += rows;
    }

    // Save and send
    const finalPdfBytes = await finalPdf.save();
    const baseName = req.file.originalname.replace(/\.[^/.]+$/, "");
    const outFileName = `${baseName}-${requestedSize}.pdf`;
    fs.writeFileSync(outFileName, finalPdfBytes);

    res.setHeader("X-Suggested-Filename", outFileName);
    res.download(outFileName, outFileName, (err) => {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        if (fs.existsSync(outFileName)) fs.unlinkSync(outFileName);
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
      if (err && !res.headersSent) next(err);
    });
  } catch (error) {
    console.error("CropBox Split Error:", error);
    next(error);
  }
};
