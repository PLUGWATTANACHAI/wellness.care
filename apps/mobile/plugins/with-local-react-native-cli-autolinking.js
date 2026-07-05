const { withSettingsGradle } = require("expo/config-plugins");

const LOCAL_RN_CONFIG_COMMAND =
  "['node', 'node_modules/@react-native-community/cli/build/bin.js', 'config']";

function withLocalReactNativeCliAutolinking(config) {
  return withSettingsGradle(config, (modConfig) => {
    const original = modConfig.modResults.contents;
    let contents = original
      .replace(
        /ex\.autolinkLibrariesFromCommand\(\s*expoAutolinking\.rnConfigCommand\s*\)/g,
        `ex.autolinkLibrariesFromCommand(${LOCAL_RN_CONFIG_COMMAND})`,
      )
      .replace(
        /ex\.autolinkLibrariesFromCommand\(\s*\)/g,
        `ex.autolinkLibrariesFromCommand(${LOCAL_RN_CONFIG_COMMAND})`,
      );

    if (contents === original && !contents.includes(LOCAL_RN_CONFIG_COMMAND)) {
      throw new Error(
        "Unable to pin React Native autolinking command in android/settings.gradle",
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = withLocalReactNativeCliAutolinking;
