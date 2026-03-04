## PromptFlow – Intelligent Teleprompter

PromptFlow is a browser-based teleprompter that takes plain text, formats it for spoken delivery, and presents it in a smooth, controllable reading view.

### Features

- **Speech‑friendly formatting**
  - Paste any text and click **Format for speech**.
  - Text is cleaned, split on punctuation, and wrapped to ~8–12 words per line.
  - Blank lines separate logical thought groups for easier breathing and emphasis.

- **Teleprompter reading view**
  - Large, centered text with adjustable font size and line spacing.
  - Smooth auto‑scroll powered by `requestAnimationFrame`.
  - Mirror mode for physical teleprompter setups.
  - Optional fullscreen mode that hides the side panel.

- **Playback controls**
  - Play / pause, faster / slower, scroll back / forward, and restart.
  - Keyboard shortcuts (all remappable):
    - Play / Pause – Space (default)
    - Speed up / slow down – ArrowUp / ArrowDown
    - Scroll back / forward – ArrowLeft / ArrowRight
    - Restart – `r`
  - Hold **Shift** while playing to temporarily slow the scroll.

- **Custom hotkeys and settings**
  - Change each action’s key and prevent duplicate bindings.
  - Settings (speed, font size, line spacing, mirror, theme, hotkeys) are saved in `localStorage`.
  - Scroll position is also persisted so refreshes don’t lose your place.

### Getting started

From the `promptflow` directory:

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (for example `http://localhost:5173`).

### How to use

1. Paste your script into the **Script** textarea on the left.
2. Click **Format for speech** to generate the teleprompter script.
3. Adjust **scroll speed**, **font size**, and **line spacing** under *Display & speed*.
4. Press **Play** (button or hotkey) to start auto‑scroll.
5. Use keyboard or on‑screen controls to fine‑tune speed, jump back/forward, or restart.
6. Click **Full screen** to hide the side panel; a floating control panel appears.
   - Press **Esc** or click **Exit** in the floating panel to restore the full layout.

### Tech stack

- React + TypeScript + Vite
- Plain CSS for styling (no Tailwind or runtime CSS framework)

### Development scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # run ESLint
```
