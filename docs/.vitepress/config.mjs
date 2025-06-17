import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'MCP Server',
  description: 'Documentation for Glean MCP Server',

  base: '/mcp-server/',

  // Ignore dead links during build (remove this when all pages are created)
  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/gleanwork/mcp-server' },
    ],

    search: {
      provider: 'local',
    },
  },
});
