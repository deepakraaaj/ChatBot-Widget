# Production Checklist

Use this before promoting a widget build to production.

## 1. Build And Artifact

- [ ] Run `npm run build` and confirm it passes cleanly.
- [ ] Confirm `dist/kritibot-widget.js` and `dist/kritibot-widget.sri.json` came from the same build.
- [ ] Update the deployed script tag with the latest SRI hash.
- [ ] Confirm the production snippet does not reference `localhost`.

## 2. Embed Configuration

- [ ] Confirm `backendUrl` is present in production config.
- [ ] If config is injected later via `window.KritiBot.init(...)`, set `data-auto-init="false"` on the script tag.
- [ ] Verify any target selector exists on the real host page.
- [ ] Verify request headers are correct and safe for browser use.

## 3. Backend And Network

- [ ] Verify CORS allows the production origin for `/session/start` and `/chat`.
- [ ] Verify the backend accepts the `x-user-context` header.
- [ ] Verify authentication headers/tokens are available before the first chat request.
- [ ] Test timeout behavior with a slow backend.
- [ ] Test session expiry and reconnect behavior.
- [ ] Confirm streaming responses are not broken by proxies or CDN rules.

## 4. Security

- [ ] Verify CSP allows the widget script and backend `connect-src`.
- [ ] Verify SRI works with `crossorigin="anonymous"` from the real CDN domain.
- [ ] Confirm no secrets are embedded in the widget bundle.
- [ ] Review microphone permissions if voice input is enabled.

## 5. Functional Smoke Test

- [ ] Open the widget and send a first message successfully.
- [ ] Close and reopen the widget.
- [ ] Clear chat while a response is streaming.
- [ ] Destroy and re-initialize the widget from the global API.
- [ ] Test quick actions, option buttons, and table responses.
- [ ] Test on mobile-sized screens and narrow desktop layouts.

## 6. Observability And Rollback

- [ ] Check browser console for runtime errors and warnings.
- [ ] Confirm backend logs show session creation and chat requests as expected.
- [ ] Have a rollback bundle URL and SRI hash ready.
- [ ] Monitor script load failures, request failures, and timeout rates after release.

## 7. Release Gate

- [ ] Deploy to staging first.
- [ ] Run the full host-page smoke test on staging.
- [ ] Promote the exact same artifact to production.
