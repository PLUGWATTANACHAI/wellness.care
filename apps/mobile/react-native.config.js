const path = require("node:path");

module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: {
          sourceDir: path.join(__dirname, "node_modules/expo/android"),
          packageImportPath: "import expo.modules.ExpoModulesPackage;",
          packageInstance: "new ExpoModulesPackage()",
        },
        ios: {},
      },
    },
  },
};
