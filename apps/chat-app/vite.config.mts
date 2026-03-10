import path from 'path';
import { defineConfig } from 'vite';

const viteConfig = defineConfig({
    server: {
        fs: {
            allow: [path.resolve(__dirname, '../..')],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    clearScreen: true,
});

export default viteConfig;
