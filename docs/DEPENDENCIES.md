# Phase 1 dependency compatibility evidence

Reviewed 2026-11-14 before installation:

- [Official Next.js installation guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx): Node >=20.9; App Router and strict TypeScript supported. Node 24.22.1 is pinned for this environment.
- [Official React Three Fiber installation guide](https://github.com/pmndrs/react-three-fiber/blob/master/docs/getting-started/installation.mdx): Fiber 9 pairs with React 19; Next.js integration supports `transpilePackages: ['three']`.
- [Official shadcn manual setup](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/manual.mdx): Tailwind styles, component aliases, native component source, and composable primitives. FitSpace uses the shadcn Button composition pattern (CVA, Radix Slot, merged classes), themed to the project, with `components.json` for future additions.
- Official npm package manifests checked for Next 16.4.6, React 19.3.1, Fiber 9.8.2, Drei 10.7.9, Three 0.187.0, and test tooling. Fiber supports React >=19 <19.4; Drei supports React 19/Fiber 9/Three >=0.159. Exact versions and transitive checksums are in `package.json` and `pnpm-lock.yaml`.
- TypeScript 5.9.3 is selected instead of the new major compiler to limit framework/tooling migration risk.
- Use ESLint 10.15.0 with `@eslint/js` 10.0.1, `typescript-eslint` 8.72.2 (declares ESLint 10 and TypeScript <6.1 support), React Hooks 7.1.1 (declares ESLint 10 support), and the matching Next.js plugin 16.4.6. The aggregated Next ESLint config pulled older plugins whose peers excluded ESLint 10; direct compatible flat configuration preserves recommended TypeScript, Hooks, and Next rules without that conflict. No deprecated ESLint pin or peer override is retained. Accessibility behavior is covered by native semantic controls and targeted browser/component tests; a full accessibility audit remains Phase 9.
- Vite is used only by Vitest; the Next.js application uses its own build pipeline. No unused Vite React plugin is installed.

No verification bypasses are used. pnpm retains registry integrity/supply-chain checks. Package release-age exceptions automatically recorded by pnpm are explicit version-specific entries, not TLS/signature/checksum overrides.
