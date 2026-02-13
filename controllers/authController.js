const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { secret } = req.body;
  const masterSecret = process.env.APP_SECRET;

  if (!secret || secret !== masterSecret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid application secret",
    });
  }

  const jwtSecret = process.env.JWT_SECRET;

  const token = jwt.sign({ service: "pdf-splitter" }, jwtSecret, {
    expiresIn: "15m",
  });

  return res.json({
    success: true,
    apiToken: token,
    expiresIn: "15m",
  });
};
