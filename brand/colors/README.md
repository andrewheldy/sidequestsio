# Color tokens

`colors.json` is the machine-readable primitive palette. `semantic-colors.json` resolves every light and dark background, surface, border, text, interaction, status, XP, Points, reward, achievement, focus, and disabled token to HEX, RGB, HSL, and its suggested CSS variable. `tokens.css` provides the same primitives plus theme aliases.

Import `tokens.css` once near the application root. Product components should use semantic aliases such as `--color-bg`, `--color-surface`, `--color-text`, `--color-primary`, and `--color-focus-ring`. Use primitive names only for intentional brand moments such as XP, Points, rewards, achievements, or campaign art.

Ocean communicates XP and active discovery. Gold communicates spendable Points. Coral is reserved for rewards and rare celebratory emphasis. Palm communicates success and verified physical presence. Never use Gold for ordinary buttons or Coral as ambient decoration.
