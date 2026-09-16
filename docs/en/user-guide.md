# BeeChat — user guide

BeeChat is a one-screen chatbot with a bee avatar. Type a question, press **Enter**, and watch the answer stream in while Buzz reacts.

## 1. Requirements

- A running JiuwenSwarm gateway (BeeChat auto-tries the product gateway at
  `ws://127.0.0.1:19000/ws`, then the SDK gateways; see
  [`../../README.md`](../../README.md#gateways)).
- A modern browser (Chrome/Chromium 107+, Firefox, Safari, Edge).

## 2. Start the app

```bash
cd bee
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
| Start over | Click **New chat** |
| Retry after an error | Click **Try again** |

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

BeeChat reconnects automatically with exponential backoff.

## 6. Configuration

Set these in `bee/.env`:

| Variable | Default |
|---|---|
| `VITE_JIUWENSWARM_URL` | *unset* — tries the built-in target list |
| `VITE_GATEWAY_TOKEN` | *(empty)* |
| `VITE_AGENT_ID` | `researcher` |
| `VITE_APP_TITLE` | `BeeChat` |

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Header stays "Offline" | Confirm the gateway is running and the URL/port are correct |
| Error bubble after sending | Check the gateway logs; click **Try again** |
| No bee images | Run from the `bee/` directory so the bundled assets resolve |
