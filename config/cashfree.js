const { Cashfree, CFEnvironment } = require("cashfree-pg");
const env = require("./env");

const environment =
  env.cashfree.env === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  environment,
  env.cashfree.appId,
  env.cashfree.secretKey,
  undefined,
  undefined,
  undefined,
  false
);

module.exports = { cashfree, environment, CFEnvironment };
