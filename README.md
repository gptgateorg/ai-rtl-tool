<div align="center">
  <img src="images/logo.png" width="112" alt="GptGate logo">
  <h1>GptGate Browser Extension</h1>
  <p>Better Persian and bidirectional text in ChatGPT, Gemini, and Claude.</p>
  <p><a href="README.fa.md">فارسی</a> · <strong>English</strong></p>
</div>

## About GptGate

AI chat interfaces do not always handle Persian, English, and math well when they appear together. Text alignment shifts, punctuation feels out of place, and formulas can become difficult to read.

GptGate fixes these issues inside the AI tools you already use. It gives you control over the direction of responses and the message composer while keeping mixed-language content and mathematical notation readable.

GptGate currently uses Chrome Manifest V3. The current version is `0.1.1`.

## Features

- Separate `RTL`, `LTR`, and automatic direction controls for responses and the composer
- Smart direction detection for Persian and English text
- Improved KaTeX and MathJax rendering inside right-to-left content
- IRANSansX font support for more readable Persian text
- A dedicated dark surface option for Claude
- Settings saved locally in your browser
- Changes applied to supported tabs without interrupting your conversation

## Supported services

| Service | Website |
| --- | --- |
| ChatGPT | `chatgpt.com` and `chat.openai.com` |
| Gemini | `gemini.google.com` |
| Claude | `claude.ai` |

## Install from source

You will need:

- Node.js 18 or newer
- npm
- A Chromium-based browser such as Google Chrome or Microsoft Edge

Install the dependencies and create a production build:

```bash
npm ci
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated `dist` folder.

For Microsoft Edge, follow the same steps from `edge://extensions`.

## Using GptGate

Open ChatGPT, Gemini, or Claude and select the GptGate icon from your browser toolbar. Response direction and composer direction can each be set to `RTL`, `LTR`, or automatic mode. Advanced settings include math rendering, the Persian font, and the Claude dark surface.

Your choices are saved automatically and applied to supported tabs.

## Development

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

The production-ready extension is generated in `dist`.

## Project structure

```text
gptgate-browser-extension/
├── manifest.json          # Manifest V3 configuration
├── background.js          # Extension service worker
├── popup.html             # Extension popup interface
├── popup.js               # Popup settings and interactions
├── src/
│   ├── shared/            # Shared behavior and settings
│   ├── chatgpt/           # ChatGPT integration
│   ├── gemini/            # Gemini integration
│   └── claude/            # Claude integration
├── images/                # Extension artwork
└── fonts/                 # Bundled interface font
```

## Browser permissions

GptGate asks only for the permissions needed to work on supported AI websites:

- `storage` keeps your preferences in the browser.
- `tabs` identifies supported tabs and applies setting changes.
- `scripting` restores the extension when a supported tab needs to be reconnected.
- Host access is limited to ChatGPT, Gemini, and Claude domains.

## Privacy

GptGate does not send your conversations or preferences to an external server. Your settings stay in browser storage. The GptGate Telegram link opens only when you choose it.

## Contributing

Bug reports, suggestions, and pull requests are welcome. If a supported website changes its interface and something stops working, opening an issue with the website name and a short description is especially helpful.

## Community

News and updates are available on the [GptGate Telegram channel](https://t.me/GptGateAI).

## Popup design and validation

The popup uses the Windows client's Mint/Deep Ink controls, IRANSansX assets and
CSS motion. It has no account or login. Its sun/moon control changes only the
popup appearance; the existing Claude surface preference remains separate.

The existing engine always fixes math when either direction is forced RTL.
The popup shows that effective state and explains why its math switch is then
disabled. The stored math preference is retained for automatic/LTR modes.

Settings continue to use `chrome.storage.sync` (Chrome can sync preferences if
browser sync is enabled). No GptGate account or server is involved.

```bash
npm ci
npx playwright install chromium
npm test
npm run test:performance
```

Tests use temporary browser profiles and isolated website fixtures, never a
personal account. `npm test` builds the extension, checks scope integrity,
exercises UI/storage/errors, compares motion with Windows, and loads the real
Manifest V3 build on three synthetic supported origins. Performance tests compare
against original commit `244006e` and write measurements under `artifacts/qa/`.
These fixtures do not certify compatibility with every current live website.

Load the generated `dist` folder with Chrome's **Load unpacked** action.
See `docs/popup-validation.md` for the measured scope and results.
