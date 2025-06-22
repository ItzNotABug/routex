# Routex

A powerful **client-side redirection plugin for VitePress** that generates static redirect pages and handles seamless
navigation between old and new URLs.

## ✨ Features

- 🔄 **Client-side redirects** - Fast, seamless navigation without server configuration
- 📄 **Static redirect pages** - Generates HTML files for each redirect during build
- 🎨 **Custom templates** - Use your own redirect page design or stick with the beautiful default
- ⚡ **Zero JavaScript fallback** - Works even with JavaScript disabled via meta refresh
- 🔍 **SEO friendly** - Proper meta tags, canonical links, and no-index options
- 🛡️ **Validation** - Detects circular redirects, conflicts, and dead links
- ⚙️ **Flexible configuration** - Simple redirect maps or advanced options

## 📦 Installation

```bash
pnpm routex
```

## 🚀 Quick Start

Add `routex` to your VitePress configuration:

```ts
// .vitepress/config.ts
import { routex } from 'routex'
import { defineConfig } from 'vitepress'

export default defineConfig({
    // ... your VitePress config
    vite: {
        plugins: [
            routex({
                '/old-page': '/new-page',
                '/legacy/docs': '/docs',
                '/api/v1': '/api/v2'
            })
        ]
    }
})
```

Routex will automatically:

- Handle navigation seamlessly
- Inject client-side redirect scripts
- Generate redirect pages at build time

## 📖 Usage

### Simple redirects

```ts
routex({
    '/old-page': '/new-page',
    '/legacy': '/modern',
    '/blog/2023': '/blog/archive/2023'
})
```

### Advanced configuration

```ts
routex({
    rules: {
        '/old-api': '/api/v2',
        '/docs/legacy': '/docs',
        '/external-link': 'https://example.com'
    },
    options: {
        redirectDelay: 2,        // Delay in seconds (default: 0)
        addCanonical: true,      // Add canonical link tags (default: false)
        addNoIndexMeta: true,    // Add noindex meta tag (default: false)
        template: './custom-redirect.html',  // Custom template path
        overrideExisting: false, // Allow overriding existing pages (default: false)
        ignoreDeadLinks: false   // Skip validation for missing destinations (default: false)
    }
})
```

### Custom Template

Create a custom redirect template with placeholders:

```html
<!-- custom-redirect.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>Redirecting to {destination}</title>
      {metaTags}
      <style>
          body {
              font-family: system-ui;
              text-align: center;
              padding: 50px;
          }
      </style>
      <script>
          setTimeout(() => {
              location.replace('{destination}');
          }, {redirectDelay} * 1000);
      </script>
  </head>
  <body>
    <h1>🚀 Moving to a better place...</h1>
    <p>You're being redirected from <code>{source}</code> to <code>{destination}</code></p>
    <p><a href="{destination}">Click here if you're not redirected automatically</a></p>
  </body>
</html>
```

Available placeholders:

- `{source}` - Original URL path
- `{destination}` - Target URL
- `{redirectDelay}` - Delay in seconds
- `{metaTags}` - Generated meta tags (refresh, canonical, noindex)

## ⚙️ Configuration Options

| Option             | Type      | Default | Description                                   |
|--------------------|-----------|---------|-----------------------------------------------|
| `enable`           | `boolean` | `true`  | Enable/disable the plugin                     |
| `redirectDelay`    | `number`  | `0`     | Delay before redirect (seconds)               |
| `addCanonical`     | `boolean` | `false` | Add canonical link tags for SEO               |
| `addNoIndexMeta`   | `boolean` | `false` | Add noindex meta tag to prevent indexing      |
| `template`         | `string`  | `''`    | Path to custom template or inline HTML        |
| `overrideExisting` | `boolean` | `false` | Allow redirects to override existing pages    |
| `ignoreDeadLinks`  | `boolean` | `false` | Skip validation for missing destination pages |

## 🔍 Validation

Routex automatically validates your redirect configuration:

- **Self-references** - Detects redirects that point to themselves
- **Circular redirects** - Prevents infinite redirect loops
- **Path validation** - Ensures proper URL formatting
- **File conflicts** - Warns about redirects that override existing pages
- **Dead links** - Checks if destination pages exist

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `pnpm test:run`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🙏 Acknowledgments

- Built for [VitePress](https://vitepress.dev/) - The amazing static site generator
- Continuous test releases via [pkg-vc](https://pkg.vc) - Built
  by [@Torsten Dittmann](https://github.com/torstendittmann)

---

⭐ Star this repo if you find it useful!
