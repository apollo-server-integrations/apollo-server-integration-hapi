import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src'],
  transform: {
    '/__tests__/.*.test.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testRegex: '/__tests__/.*.test.ts$',
  verbose: true,
};

export default config;
