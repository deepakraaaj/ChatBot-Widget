# KritiBot Widget

Standalone embeddable chatbot widget for script-tag usage.

## Checklists

- [LIGHTWEIGHT_CHECKLIST.md](./LIGHTWEIGHT_CHECKLIST.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md)

## Build

```bash
npm install
npm run build
```

`npm run build` now runs a full TypeScript check before producing the embed bundle.

Optional debug build with source maps:

```bash
KRITIBOT_SOURCEMAP=true npm run build
```

Voice input is disabled in the default production build to keep the embed bundle smaller. Enable it explicitly when needed:

```bash
KRITIBOT_ENABLE_VOICE=true npm run build
```

Output bundle:

- `dist/kritibot-widget.js`
- `dist/kritibot-widget.sri.json`

`vite.embed.config.ts` now replaces `process.env.NODE_ENV` at build time, so the browser bundle does not depend on a global `process` object. Source maps are disabled by default in embed builds.

The build now also enforces a default bundle budget of `275 kB` raw / `85 kB` gzip.

`backendUrl` is required for a working chat session. If you load the script first and inject runtime config later, disable auto-init on the script tag and call `window.KritiBot.init(...)` yourself.

## Serve Dist Locally

After building, serve the `dist` folder:

```bash
npx serve -l 8081 --config serve.json
```

Then access:

- `http://localhost:8081/kritibot-widget.js`
- `http://localhost:8081/kritibot-widget.sri.json`

If you are iterating on source changes, rebuild continuously in a second terminal:

```bash
npm run build:watch
```

Notes:

- `304 Not Modified` responses are normal revalidation behavior.
- If your widget changes are not visible, make sure the `dist/kritibot-widget.js` timestamp changes after edits (watch mode above handles this).

## Script-tag usage

```html
<script
  src="https://your-cdn.example.com/kritibot-widget.js"
  integrity="sha384-<from dist/kritibot-widget.sri.json>"
  crossorigin="anonymous"
  data-backend-url="https://api.example.com"
  data-user-id="123"
  data-user-name="Deepak Raj"
  data-company-id="42"
  data-company-name="Kriti"
></script>
```

## API

The script exposes `window.KritiBot`:

- `init(config)`
- `destroy()`
- `version`
- `apiVersion`

Backward compatibility:

- `update(config)` is still available as an alias.
- `update(config)` now rerenders the existing widget in place instead of recreating the host mount.

Example:

```html
<script src="https://your-cdn.example.com/kritibot-widget.js" data-auto-init="false"></script>
<script>
  window.KritiBot.init({
    backendUrl: "https://api.example.com",
    userId: "123",
    userName: "Deepak Raj",
    companyId: "42",
    companyName: "Kriti",
    requestHeaders: {
      Authorization: "Bearer <token>"
    }
  });
</script>
```

## Shim + Fallback + Retry Strategy

The embed runtime now consumes a pre-load queue (`window.KritiBot.q`) if you use a shim before the real script arrives.

```html
<script>
  window.KritiBot = window.KritiBot || {
    q: [],
    init: function (cfg) {
      this.q.push(["init", cfg]);
    },
    destroy: function () {
      this.q.push(["destroy"]);
    },
  };
</script>
```

Use a loader with retry + fallback CDN URLs:

```html
<script>
  (function loadWidget(urls, retries) {
    let index = 0;
    let attempts = 0;

    function inject(url) {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.integrity = "sha384-<from dist/kritibot-widget.sri.json>";
      s.onload = function () {
        window.KritiBot.init({ backendUrl: "https://api.example.com" });
      };
      s.onerror = function () {
        attempts += 1;
        if (attempts <= retries) return inject(url);
        index += 1;
        if (index < urls.length) return inject(urls[index]);
        console.error("KritiBot: failed to load all widget sources.");
      };
      document.head.appendChild(s);
    }

    inject(urls[index]);
  })(
    [
      "https://cdn-primary.example.com/kritibot-widget.js",
      "https://cdn-backup.example.com/kritibot-widget.js",
    ],
    2
  );
</script>
```

Use `data-auto-init="false"` when the script itself does not carry `data-backend-url`:

```html
<script
  src="https://cdn-primary.example.com/kritibot-widget.js"
  data-auto-init="false"
></script>
```
