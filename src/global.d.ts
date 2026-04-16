/* Allow side-effect CSS imports (e.g. `import './globals.css'`).
   Next.js only ships declarations for *.module.css — plain CSS
   imports need an explicit ambient module so TypeScript ≥ 5.8
   (noUncheckedSideEffectImports) doesn't flag them. */
declare module '*.css';
