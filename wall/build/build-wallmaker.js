({
  // Basic setup
  baseUrl: "../public/js/lib",
  name: "../../wall-maker/js/main",
  mainConfigFile: "../public/wall-maker/js/main.js",
  out: "../public/wall-maker/js/wallmaker.js",

  // Include require in the package
  paths: { requireLib: "require" },
  include: "requireLib"
})
