# add-lenis

Add silky smooth scrolling to a web project using the [Lenis](https://lenis.darkroom.engineering/) library. Lenis intercepts native scroll and replaces it with a RAF-driven interpolation that feels physically weighted and natural.

## How it works

Lenis runs a `requestAnimationFrame` loop that continuously interpolates between the current scroll position and the target (where the user is trying to scroll to). The result is a smooth deceleration curve instead of a hard stop. It plays well with GSAP ScrollTrigger, CSS scroll-driven animations, and Intersection Observer patterns.

## What this skill does

1. Detects the project stack (Next.js App Router, Next.js Pages Router, React SPA, or vanilla JS)
2. Installs `lenis` via the project's package manager
3. Creates a `SmoothScroll` component (or plain JS initializer for vanilla)
4. Wires it into the appropriate root layout file
5. Verifies the build still passes

## Steps

### 1. Detect the project

Read these files if they exist to determine the stack:
- `package.json` — check for `next`, `react`, `vite`, etc.
- `app/layout.tsx` or `app/layout.js` → Next.js App Router
- `pages/_app.tsx` or `pages/_app.js` → Next.js Pages Router
- `src/main.tsx` or `src/main.jsx` → React SPA (Vite/CRA)
- `index.html` + absence of a framework → vanilla JS

Also check which package manager is in use:
- `bun.lockb` → bun
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `package-lock.json` or none of the above → npm

### 2. Install lenis

Run the appropriate install command:
- **bun:** `bun add lenis`
- **pnpm:** `pnpm add lenis`
- **yarn:** `yarn add lenis`
- **npm:** `npm install lenis`

### 3. Create the component or initializer

**Next.js App Router — create `components/SmoothScroll.tsx`:**

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
```

Use `.jsx` and remove the TypeScript type annotation (`time: number` → `time`) if the project is JavaScript.

**Next.js Pages Router — add to `pages/_app.tsx`:**

Import and render `<SmoothScroll />` (same component as above) as the first child inside the `_app` wrapper.

**React SPA (Vite / CRA) — create `src/components/SmoothScroll.tsx`:**

Same component as above, but without `"use client"` (not needed outside Next.js).

Wire it as the first child in `src/App.tsx`:
```tsx
import SmoothScroll from "./components/SmoothScroll";
// ...
return (
  <>
    <SmoothScroll />
    {/* rest of app */}
  </>
);
```

**Vanilla JS — add to the project's main entry script:**

```js
import Lenis from "lenis";

const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

### 4. Wire into App Router layout

For Next.js App Router, open `app/layout.tsx` and add `<SmoothScroll />` as the first child inside `<body>`:

```tsx
import SmoothScroll from "@/components/SmoothScroll";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
```

### 5. Verify

Run `tsc --noEmit` (if TypeScript) to catch type errors, or check the dev server starts without errors. Report any issues and fix them before finishing.

## Configuration reference

The two options used (`duration` and `easing`) are the most impactful. Other useful options to mention in a comment or offer to the user:

| Option | Default | Notes |
|---|---|---|
| `duration` | `1.2` | Seconds for scroll to settle. `1.1` is slightly snappier. |
| `easing` | built-in | The exponential easing `t => Math.min(1, 1.001 - Math.pow(2, -10 * t))` gives a natural deceleration. |
| `smoothWheel` | `true` | Set to `false` to opt out of smooth wheel; keep touch/trackpad smooth. |
| `lerp` | undefined | Alternative to duration+easing. A value like `0.1` gives a spring-like feel. |
| `infinite` | `false` | Enable for infinite scroll effects. |

## Important caveats to tell the user

- Lenis works by preventing the browser's default scroll and driving scroll via transforms. This can conflict with `position: sticky` elements — test those after installing.
- If the project uses **GSAP ScrollTrigger**, the Lenis RAF loop must call `ScrollTrigger.update()` on each frame. Show the user the integration if they mention GSAP.
- `html { scroll-behavior: smooth; }` in CSS conflicts with Lenis — remove it or it will fight Lenis on anchor link clicks.
- The `"use client"` directive is required in Next.js App Router because Lenis uses `window` and `requestAnimationFrame`.

## GSAP integration (offer if relevant)

If the project uses GSAP, replace the RAF loop with:

```ts
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ duration: 1.1, easing: ... });

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
