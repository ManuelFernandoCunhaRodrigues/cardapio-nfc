import { createStandaloneApp } from './app';
import { loadEnv } from './config/env';

const env = loadEnv();

export default createStandaloneApp(env);
