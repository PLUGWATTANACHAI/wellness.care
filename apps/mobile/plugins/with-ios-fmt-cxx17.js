const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const FMT_CXX17_HOOK = `
    # Wellnest: Xcode 26.4 workaround for React Native fmt consteval compile errors.
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

function insertFmtHook(contents) {
  if (contents.includes("Wellnest: Xcode 26.4 workaround")) {
    return contents;
  }

  const postInstallCall = /(\s+react_native_post_install\([\s\S]*?\n\s+\))/m;
  if (postInstallCall.test(contents)) {
    return contents.replace(postInstallCall, `$1\n${FMT_CXX17_HOOK}`);
  }

  const postInstallBlock = /(post_install do \\|installer\\|\\n)/m;
  if (postInstallBlock.test(contents)) {
    return contents.replace(postInstallBlock, `$1${FMT_CXX17_HOOK}\n`);
  }

  return `${contents.trimEnd()}

post_install do |installer|
${FMT_CXX17_HOOK}
end
`;
}

function withIosFmtCxx17(config) {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      const contents = fs.readFileSync(podfilePath, "utf8");
      fs.writeFileSync(podfilePath, insertFmtHook(contents));
      return modConfig;
    },
  ]);
}

module.exports = withIosFmtCxx17;
