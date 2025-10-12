module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './', // ✅ Makes "@/components" work
          },
        },
      ],
      require.resolve('expo-router/babel'), // ✅ Required for Expo Router
    ],
  };
};
