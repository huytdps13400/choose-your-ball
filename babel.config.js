module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    // This install keeps Expo's version-matched preset nested under `expo`.
    // Resolve from Expo so Metro works whether npm nests or hoists the preset.
    presets: [
      require.resolve("babel-preset-expo", {
        paths: [require.resolve("expo/package.json")],
      }),
    ],
    plugins: [["react-native-worklets/plugin", {}]],
  };
};
