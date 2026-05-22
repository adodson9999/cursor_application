import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

/** Number of random UI interactions to perform per monkey run. */
const MONKEY_ACTIONS = 50;

test.skip("Chaos: monkey test performs random UI interactions without crashing Cursor", async ({ firstWindow }) => {
  const actions = ["click", "scroll", "keyboard"] as const;

  for (let i = 0; i < MONKEY_ACTIONS; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];

    // Stage 2: use page.mouse / page.keyboard for each action type.
    // For now, assert the window remains visible after each nominal iteration.
    switch (action) {
      case "click":
        // Stage 2: pick a random coordinate within viewport bounds and left-click
        break;
      case "scroll":
        // Stage 2: scroll a random amount at a random position
        break;
      case "keyboard":
        // Stage 2: press a random printable key or safe modifier combo
        break;
    }

    const isVisible = await firstWindow.isVisible("body");
    expect(isVisible, `Window became non-responsive after monkey action ${i}`).toBe(true);
  }
});
