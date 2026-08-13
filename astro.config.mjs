// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://cannibalcode.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			theme: 'gruvbox-dark-hard',
		},
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Plex Mono',
			cssVariable: '--font-mono',
			fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/plex-mono-regular.woff2'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/plex-mono-semibold.woff2'],
						weight: 600,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/plex-mono-italic.woff2'],
						weight: 400,
						style: 'italic',
						display: 'swap',
					},
				],
			},
		},
	],
});
