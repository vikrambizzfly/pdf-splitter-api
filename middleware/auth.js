const jwt = require("jsonwebtoken");

const apiKeyAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing token",
    });
  }

  const secret = process.env.JWT_SECRET;

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Unauthorized: Token has expired"
          : "Unauthorized: Invalid token";

      return res.status(401).json({
        success: false,
        message,
      });
    }

    req.user = decoded;
    next();
  });
};

module.exports = apiKeyAuth;
