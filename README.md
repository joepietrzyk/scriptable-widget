# Scriptable Widget

An iOS [Scriptable](https://scriptable.app) widget built with TypeScript, bundled with Bun. This project is mostly an experiment for me to try to use Claude Code with hardened security, play around with Scriptable, and learn Bun tooling at the same time.

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Scriptable](https://scriptable.app) installed on your iOS device

## Setup

```sh
bun install
```

## Development

```sh
bun run dev        # watch mode — rebuilds on save
bun run typecheck  # type-check without building
bun run build      # one-shot minified build → dist/widget.js
```

## Project Structure

```
src/
  widget.ts       # widget source
dist/
  widget.js       # bundled output (copy into Scriptable, or use the auto-updater below)
```

## Deploying to Scriptable

### Manual

Copy the contents of `dist/widget.js` directly into a new script in the Scriptable app.

### Auto-updater (recommended)

The script below self-updates from the latest GitHub Release using a two-stage check:

1. **30-minute gate** — skips the network entirely if checked recently (timestamp stored in iOS Keychain).
2. **Version tag check** — if the gate passes, hits the GitHub API; only downloads `widget.js` if the release tag has changed since the last download.
3. **Graceful fallback** — if the network fails for any reason, the cached version is used silently.

**Setup:**

1. Create a **new script** in Scriptable and paste the code below.
2. Replace `GITHUB_API_URL` with your repository's releases API URL.
3. Run it once — it will download the latest `widget.js` from your release assets and launch it.

```javascript
// Scriptable auto-updater
// Replace the URL below with your repo's GitHub Releases API endpoint
const GITHUB_API_URL =
  "https://api.github.com/repos/joepietrzyk/scriptable-widget/releases/latest";

const ASSET_NAME = "widget.js";
const CACHED_MODULE_NAME = "scriptable-widget-cache";
const KEYCHAIN_LAST_CHECKED = "assistant_widget_last_checked";
const KEYCHAIN_CACHED_TAG = "assistant_widget_cached_tag";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const fm = FileManager.local();
// importModule() looks in the Scriptable documents root, so save there.
const widgetPath = fm.joinPath(fm.documentsDirectory(), CACHED_MODULE_NAME + ".js");

async function checkAndUpdate() {
  // 30-minute gate
  if (Keychain.contains(KEYCHAIN_LAST_CHECKED)) {
    const lastChecked = parseInt(Keychain.get(KEYCHAIN_LAST_CHECKED), 10);
    if (Date.now() - lastChecked < CHECK_INTERVAL_MS) return;
  }

  // Record the attempt before the network call so a slow/failed request
  // doesn't cause every subsequent widget refresh to hammer the API.
  Keychain.set(KEYCHAIN_LAST_CHECKED, String(Date.now()));

  try {
    const req = new Request(GITHUB_API_URL);
    req.headers = { Accept: "application/vnd.github+json" };
    req.timeoutInterval = 10;
    const release = await req.loadJSON();

    // Skip download if already on this tag
    const cachedTag = Keychain.contains(KEYCHAIN_CACHED_TAG)
      ? Keychain.get(KEYCHAIN_CACHED_TAG)
      : null;
    if (cachedTag === release.tag_name) return;

    const asset = release.assets.find((a) => a.name === ASSET_NAME);
    if (!asset)
      throw new Error(
        `Asset "${ASSET_NAME}" not found in release ${release.tag_name}`,
      );

    const assetReq = new Request(asset.browser_download_url);
    assetReq.timeoutInterval = 10;
    const code = await assetReq.loadString();

    fm.writeString(widgetPath, code);
    Keychain.set(KEYCHAIN_CACHED_TAG, release.tag_name);

    console.log(`Updated to ${release.tag_name}`);
  } catch (e) {
    // Network or API failure — fall through to cached version below
    console.error(`Update check failed: ${e.message}`);
  }
}

(async () => {
  await checkAndUpdate();

  if (!fm.fileExists(widgetPath)) {
    throw new Error(
      "No cached widget found. Check your GITHUB_API_URL and ensure a release with a widget.js asset exists.",
    );
  }

  await importModule(CACHED_MODULE_NAME).main();
})();
```
