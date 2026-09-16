# Naming and copy

Single source of truth for names, the character, and the "hive" vocabulary. When copy
or identifiers drift, this file wins.

## The names

| Thing | Name | Notes |
|---|---|---|
| Platform | **JiuwenSwarm** | the swarm itself — the agent runtime and the gateways behind it |
| Product | **BeeChat** | the user-facing name of this channel |
| Repo / package id | `jiuwenswarm-bee` | identifier only — not a brand name; use it in paths, package names, and installers |
| Character | **Buzz** | the mascot; one bee = one agent/session. Name is localized — see below |
| Desktop shell | BeeChat desktop | Electron and Tauri builds of the same app |
| Views | **full site**, **avatar view** (`#avatar`) | the two URL-hash views of the web build |

**The mascot is "your bee in the swarm."** Buzz is one worker among many; the swarm is
the platform and everything behind the gateway. One BeeChat session is one bee.

### Localized character name

The character name is not a single global string — it lives in the UI language pack
(`bee/src/i18n/`), so each audience gets the name that is best for it:

| Locale | Name | Why |
|---|---|---|
| `en` | **Buzz** | the English bee-sound pun; reads naturally in state labels ("Buzz is thinking…") |
| `zh` | **嗡嗡** | the Chinese buzz onomatopoeia; idiomatic and instantly read as a bee |

`VITE_LOCALE` (falling back to the browser language, default `en`) selects both the UI
strings and the name. The GUI also has an **EN / 中文 switch** (footer on the full site,
meta row in the avatar view); that choice is persisted (`beechat.locale`) and overrides
`VITE_LOCALE`. If 嗡嗡 ever feels too sound-like, **蜜蜜 ("Mimi")** is the warm
alternative — it is a one-line change in `bee/src/i18n/zh.ts`.

## Swarm vs. swarm mode

These are different and must not be conflated:

- **The swarm** = the JiuwenSwarm platform. Everyday brand context; safe to allude to.
- **swarm mode / team mode** = multi-agent orchestration. **BeeChat does not implement
  it.** If you ever refer to it, say "swarm mode" in full and make clear it is not this
  channel.

Do not let the bee naming imply BeeChat is multi-agent. It is a single-session Q&A
channel.

## The hive lexicon

A small, closed vocabulary. It is **brand flavor**, not protocol terminology.

| Term | Bee reality | Meaning here | Status |
|---|---|---|---|
| **pollen** | what a bee carries to and from the hive | the context you bring: your question, and later any attachments/memory | reserved |
| **waggle** | the dance a bee uses to tell the swarm where a source is | the **working/thinking** state — the bee dancing while it works | internal |
| **honey** | the finished product of the hive | a **finished answer** — the result of a run | reserved |

Keep the list closed. Don't invent new bee words ad hoc; add them here first.

## Usage rules

1. **Critical text stays plain.** In UI states, buttons, errors, and technical docs use
   clear words: *answer*, *question*, *thinking*, *session*, *agent*, *gateway*. The bee
   vocabulary must never make something harder to understand.
2. **The lexicon is for internal names, docs flavor, and optional feature labels.**
   It is encouraged in code comments, design docs, roadmap items, and playful feature
   surfaces — not in the path a first-time user must follow.
3. **The character name comes from the language pack** (`Buzz` / `嗡嗡`). Never hardcode
   it in a component; read it from `bee/src/i18n`.
4. **Test id prefix is `bee-*`** (for example `bee-avatar`, `bee-swarm`, `bee-message`).
   The historical `beeline-*` prefix from the original design notes is abandoned.
5. **Product name is "BeeChat";** the repo/package id `jiuwenswarm-bee` appears only in
   technical contexts (paths, npm names, installers).

## Where the lexicon may appear next

Planned, optional, and only if it stays clear:

- a **honey** cue when an answer finishes (a small, non-blocking flourish),
- **waggle** as the internal name for the working state and any future activity view,
- **pollen** for any future context/attachment surface.

These are ideas, not commitments — see [roadmap.md](roadmap.md).
