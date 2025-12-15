import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the Gemini SDK
      // Using JSON.stringify ensures it's a valid string or null, avoiding undefined errors
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      // Prevent crash if other process.env props are accessed (polyfilling the object)
      'process.env': {}
    },
    build: {
      outDir: 'dist',
    }
  };
});