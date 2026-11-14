:root {
  color-scheme: dark;
  --bg-1: #020816;
  --bg-2: #101c3a;
  --panel: rgba(18, 28, 53, 0.84);
  --panel-line: rgba(117, 181, 255, 0.4);
  --cyan: #70e5ff;
  --text: #edf7ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 18px 0;
  background:
    radial-gradient(circle at top, rgba(91, 125, 255, 0.22), transparent 35%),
    linear-gradient(180deg, var(--bg-1), var(--bg-2));
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
}

.game-shell {
  width: min(96vw, 1040px);
  display: grid;
  gap: 16px;
}

.hud {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(10, 20, 40, 0.78);
  border: 1px solid var(--panel-line);
  border-radius: 14px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
}

.hud-block {
  min-width: 150px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(112, 229, 255, 0.25);
  border-radius: 10px;
}

.label {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: rgba(237, 247, 255, 0.72);
}

#score, #wave, #health {
  font-size: 1.25rem;
  color: var(--cyan);
}

#gameCanvas {
  width: 100%;
  height: auto;
  display: block;
  background: #030a1d;
  border: 1px solid var(--panel-line);
  border-radius: 18px;
  box-shadow: 0 0 30px rgba(46, 120, 255, 0.25);
}

.panel {
  background: var(--panel);
  border: 1px solid var(--panel-line);
  border-radius: 14px;
  padding: 16px 18px;
}

.panel h1 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.panel p {
  margin: 6px 0;
  color: rgba(237, 247, 255, 0.82);
  line-height: 1.5;
}

@media (max-width: 700px) {
  .hud {
    flex-wrap: wrap;
    padding: 10px;
  }

  .hud-block {
    flex: 1 1 calc(33.333% - 8px);
    min-width: 0;
    padding: 9px;
    gap: 6px;
  }

  .label {
    letter-spacing: 0.06em;
    font-size: 0.62rem;
  }

  #score, #wave, #health {
    font-size: 1rem;
  }
}
