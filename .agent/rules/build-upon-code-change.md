# Build Upon Code Change

When changes are made to the code in the following modules, you must run the corresponding build command to ensure the `target` or `dist` folder is in sync and contains the latest updates.

## Modules and Build Commands

| Module | Build Command | Output Directory |
| :--- | :--- | :--- |
| **portal** | `npm run build` (runs `next build`) | `.next` |
| **checkmate** | `npm run build` (runs `nest build`) | `dist` |
| **stash** | `npm run build` (runs `nest build`) | `dist` |

> [!IMPORTANT]
> Always verify the build is successful before proceeding to the next step.
