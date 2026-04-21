import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

function viteBase(): string {
	const raw = process.env.BASE_PATH;
	if (raw === undefined || raw === '' || raw === '/') return '/';
	return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig({
	base: viteBase(),
	plugins: [tailwindcss(), svelte()],
	publicDir: 'static',
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	}
});
