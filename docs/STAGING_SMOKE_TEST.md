# Staging Smoke Test

Run this on the real staging host page before production.

## Setup

- Use the exact CDN URL and SRI hash planned for production.
- Open browser devtools before testing.
- Confirm the page has either one target container or two if you want to test target moves.

## 1. Initial Load

- [ ] Load the page and confirm the widget appears once.
- [ ] Run `document.querySelectorAll('[data-kritibot-root]').length` and confirm it returns `1`.
- [ ] Confirm there are no console errors.

## 2. Basic Chat Flow

- [ ] Open the widget and send a message.
- [ ] Confirm `/session/start` and `/chat` succeed.
- [ ] Confirm streamed or final assistant output renders correctly.
- [ ] In a multi-step workflow, confirm only the latest option menu stays clickable and earlier menus become disabled after the next step appears.

## 3. In-Place Update

- [ ] Call `window.KritiBot.update({ userName: "Staging User" })`.
- [ ] Confirm the widget does not disappear and remount.
- [ ] Confirm `document.querySelectorAll('[data-kritibot-root]').length` is still `1`.
- [ ] Confirm the current open/closed state is preserved.
- [ ] Confirm the current chat content is preserved unless you intentionally re-init.

## 4. Target Move

- [ ] If you have a second container, call `window.KritiBot.update({ target: "#second-target" })`.
- [ ] Confirm the same widget moves to the new container.
- [ ] Confirm there is still only one `[data-kritibot-root]` element on the page.
- [ ] Confirm the widget still opens, closes, and sends messages after the move.

## 5. Lifecycle Checks

- [ ] Call `window.KritiBot.destroy()` and confirm the widget is removed.
- [ ] Confirm `document.querySelectorAll('[data-kritibot-root]').length` returns `0`.
- [ ] Call `window.KritiBot.init({...})` again and confirm the widget comes back cleanly.

## 6. Stress Checks

- [ ] Open and close the widget repeatedly.
- [ ] Clear chat while a response is in flight.
- [ ] Trigger `window.KritiBot.update(...)` more than once in a row.
- [ ] Confirm no duplicate roots, no broken styles, and no stalled requests remain.
