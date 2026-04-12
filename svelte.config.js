import adapter from '@sveltejs/adapter-static';

/** GitHub project pages use a subpath (`/repo`). User/org site repo `owner.github.io` is served from `/`. Set `BASE_PATH` in CI (see workflow). */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({ strict: true }),
		paths: { base }
	}
};

export default config;
