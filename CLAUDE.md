# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single self-contained file, `Marmara Restaurant Website.html` (~2 MB, one git commit). There is **no build system, package manager, dependency install, lint, or test suite** — opening the file in a browser runs the entire site. All assets (fonts, images, JS) are embedded inline as base64.

This file is a **generated bundle**, not hand-authored source. It is the export of a design-canvas tool (note the `.dc.html` source names and `x-dc` / `helmet` custom elements). Treat it as build output: small surgical edits are possible, but it is not structured for comfortable hand-editing, and there is no source these pages were "compiled" from in this repo.

## Architecture

Three layers, from outermost in:

1. **Shell** (top of file, lines ~1–17 and the router at the bottom). A fixed splash screen plus a single `<iframe id="frame">`. The shell owns navigation and swaps page content into the iframe via `frame.srcdoc`.

2. **`PAGES` object** (`const PAGES = { ... }`). Maps a page key to a full HTML document string. Six pages: `home`, `menu`, `catering`, `about`, `visit`, `admin`. `FILE_MAP` translates the original `*.dc.html` filenames (e.g. `Menu.dc.html`) to these keys. Routing is hash-based (`#menu`), driven by:
   - a delegated click handler that intercepts `<a href$=".dc.html">` links inside the iframe,
   - `hashchange`, and
   - `postMessage({ marmaraNav: "...dc.html" })`.

3. **Per-page bundler runtime** (repeated inside each page string). Each page is itself a mini-bundle containing three `<script type="__bundler/...">` blocks:
   - `__bundler/manifest` — UUID → `{ mime, compressed, data }`, where `data` is base64 (gzip when `compressed`). Decoded at runtime into `blob:` URLs via `DecompressionStream`.
   - `__bundler/ext_resources` — maps resource ids to manifest UUIDs.
   - `__bundler/template` — the actual page HTML as an escaped JSON string, with asset UUIDs inline as placeholders.

   On `DOMContentLoaded` the runtime decodes assets to blob URLs, string-replaces every UUID in the template with its blob URL, injects a `window.__resources` map, reparses with `DOMParser`, and swaps in the document. Scripts are re-created (DOMParser scripts are inert) so they execute in order; `text/babel` scripts are fetched/inlined and transpiled with **Babel standalone** — i.e. pages are React apps (React → ReactDOM → Babel → `text/babel`) transformed in the browser.

## Working with the file

- **View it:** open `Marmara Restaurant Website.html` in a browser (or `file://` it). No server needed.
- **Find a page's real content:** search for its key in `PAGES` (`grep -n '^"menu":'`), then the `__bundler/template` block within that page. Page bodies are escaped JSON strings, so newlines are `\\n` and quotes are `\\"`.
- **Editing caveat:** the bundler runtime strips `integrity`/`crossorigin` and assumes the manifest/template script tags exist and are well-formed. Asset bytes are referenced by UUID; you cannot change an embedded image/font without re-encoding its base64 manifest entry. Prefer regenerating from the source design tool over hand-patching binary assets here.
- The file is large; use `grep -n` / `awk` ranges rather than reading it whole.
