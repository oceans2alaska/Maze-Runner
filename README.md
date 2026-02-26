# Maze Runner

Maze Runner is a small browser game inspired by Cube Runner.
You control a triangle and dodge incoming square obstacle patterns.

## Features

- Triangle player movement with keyboard controls
- Incoming square obstacles in lane patterns
- Speed that increases over time
- Score tracking and crash/restart flow

## Controls

- Move left: `Left Arrow` or `A`
- Move right: `Right Arrow` or `D`
- Restart after crash: `R`

## Run Locally

This project has no build step.

1. Open `index.html` directly in a browser
2. Or run a simple local server in this folder, then open the served URL

Example with Python:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project Files

- `index.html` - game layout and UI
- `style.css` - visual styling
- `game.js` - game logic (movement, spawning, collision, scoring)

## Next Ideas

- Add perspective/depth effect for a more original Cube Runner feel
- Add sound effects and background music
- Add levels, difficulty presets, or a high score save
