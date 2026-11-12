const path = require('path');

// O npm instala o expo-modules-core aninhado em node_modules/expo/node_modules
// (o react-native-worklets 0.13, exigido pelo react-native-reanimated que o
// expo-router traz, fica fora do peer range dele). O Metro resolve assim mesmo,
// mas o setup do jest-expo procura na raiz — então apontamos para onde ele está.
const expoModulesCoreDir = path.dirname(
  require.resolve('expo-modules-core/package.json', {
    paths: [path.dirname(require.resolve('expo/package.json'))],
  }),
);

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^expo-modules-core$': expoModulesCoreDir,
    '^expo-modules-core/(.*)$': `${expoModulesCoreDir}/$1`,
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: ['src/lib/**/*.ts'],
};
