# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MaCourse** — a single-file React shopping list app (French UI). Users plan meals by selecting menus, check recurring grocery items, and generate consolidated shopping lists with PDF export.

## Architecture

The entire app lives in `shopping-list-app.jsx` — a single React component (`ShoppingApp`) plus one helper component (`AddItemInline`). There is no build system, bundler, or package manager configured; the file is designed to be used inside a host environment that provides React and a `window.storage` API (get/set with a key).

### Key concepts

- **Data model**: One JSON object persisted via `window.storage` under the key `shopping-app-data`. Shape: `{ recurringItems, menus, savedLists, categories }`. Falls back to `DEFAULT_DATA` on first load or storage failure.
- **View routing**: String-based (`view` state) — `home | generate | list-edit | menus | menu-edit | recurring | history`. No router library; each view is a `render*` function inside the main component.
- **List generation** (`generateList`): Merges checked recurring items + selected menu ingredients, deduplicating by lowercase name and concatenating quantities for duplicates.
- **PDF export**: Uses jsPDF loaded lazily from CDN. Two-column A4 layout grouped by category.
- **Styling**: Inline styles via a `S` object at the bottom of the file. Design tokens in `C` (colors) and `F` (fonts: Playfair Display + DM Sans).

### External dependencies (loaded at runtime, not installed)

- React (provided by host)
- jsPDF 2.5.2 (CDN, loaded on demand)

## Language

All UI text is in French (no i18n). Keep UI strings in French when modifying.
