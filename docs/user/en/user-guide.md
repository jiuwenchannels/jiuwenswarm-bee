# BeeChat — user guide

BeeChat is your bee in the JiuwenSwarm — a one-screen chatbot with a bee avatar. Type a question, press **Enter**, and watch the answer stream in while Buzz reacts.

## 1. Requirements

- A running JiuwenSwarm gateway (BeeChat auto-tries the product gateway at
  `ws://127.0.0.1:19000/ws`, then the SDK gateways; see
  [`../../../README.md`](../../../README.md#gateways)).
- A modern browser (Chrome/Chromium 107+, Firefox, Safari, Edge).

## 2. Start the app

```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

Open the printed URL (default `http://localhost:5175`).

## 3. Use it

| Action | How |
|---|---|
| Send a message | Type, then press **Enter** or click **Send** |
| New line | **Shift + Enter** |
| Stop a reply | Click **Stop** while Buzz is answering |
| Copy / edit / regenerate | Hover a message for its action row |
| New chat | Click **New chat** (header **+** or the sidebar) |
| Browse history | Click the **☰** button (top-left): search, rename, delete |
| Switch theme | Click the theme button to cycle **System → Light → Dark** |
| Change connection | **Settings** (gear): gateway URL, agent, mode, voice |
| Command palette | Press **⌘/Ctrl + K** |
| Focus the message box | Press **`/`** |
| Retry after an error | Click **Try again** on the failed reply |

Replies render as Markdown — headings, lists, tables and links are formatted, and code
blocks have a language label and a **Copy** button.

Conversations, drafts, themes and settings are saved in your browser (localStorage) and
restored on reload. Nothing is uploaded; the only network traffic is the chat stream to
your gateway.

## 4. The bee tells you the state

| Avatar | Meaning |
|---|---|
| Static bee, "Buzz is ready" | Idle, waiting for you |
| Flying bee, "Buzz is thinking…" | Your message is being processed |
| Static bee, "Buzz is answering…" | The reply is streaming |
| Grey bee, "Buzz hit a problem" | Something failed; use **Try again** |

## 5. Connection status

The dot in the header shows the gateway state:

| Dot | Status |
|---|---|
| Green | Connected |
| Amber | Connecting / reconnecting |
| Red | Offline |

BeeChat reconnects automatically with exponential backoff. If your gateway is on another
host, open **Settings** and set the **Gateway URL** (e.g. `ws://192.168.1.5:19000/ws`).

## 5. Configuration

Settings you change in the app (theme, voice, gateway URL, agent, mode, language) are
persisted locally and override the build-time defaults. The build-time variables in
`apps/web/.env` are the starting defaults:

| Variable | Default |
|---|---|
| `VITE_JIUWENSWARM_URL` | *unset* — tries the built-in target list |
| `VITE_GATEWAY_TOKEN` | *(empty)* |
| `VITE_AGENT_ID` | `researcher` |
| `VITE_AGENT_MODE` | `agent` |
| `VITE_APP_TITLE` | `BeeChat` |
| `VITE_LOCALE` | *auto* (`en`/`zh` from the browser) |

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Header stays "Offline" | Confirm the gateway is running; set the URL in **Settings**, then **Reconnect** |
| Error bubble after sending | Check the gateway logs; click **Try again** |
| No bee images | Run from the `apps/web/` directory so the bundled assets resolve |
