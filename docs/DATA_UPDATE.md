# Data Update Guide

For human maintainers and AI agents alike :)

This guide covers how to update game data (items, ingredients, recipes, etc.) in the build-solver from the upstream [wynnbuilder](https://github.com/wynnbuilder/wynnbuilder.github.io) source.

---

## Source of truth

All item/ingredient/recipe data originates from **wynnbuilder**:

```
../wynnbuilder.github.io/    ← upstream source
```

Upstream keeps its hand-edited "source of truth" files under `data/baseline/` (see `data/baseline/README.md` in that repo), with compressed derivatives under `data/baseline/compressed/` and persistent id/name mappings under `data/baseline/maps/`. build-solver mirrors a subset of those into flat root-level files with the names shown below — the paths differ between the two repos, but `sync-from-wynnbuilder.py` already knows the mapping.

The build-solver consumes a subset of those files. Never edit the data files in build-solver directly — make changes upstream and sync them here.

---

## File map

| build-solver file | Upstream source | Purpose | Also copy to `dist/`? |
|---|---|---|---|
| `compress.json` | `data/baseline/compressed/compress.json` | Items + accessories in compact form. Loaded by the frontend at runtime. | Yes |
| `clean.json` | `data/baseline/clean.json` | Human-readable version of item data. Not used by the frontend, useful for debugging. | No |
| `data/<version>/` | `data/<version>/` | Versioned snapshots: `items.json`, `atree.json`, `aspects.json`, `majid.json`, etc. | Yes |
| `ingreds_compress.json` | `data/baseline/compressed/ingreds_compress.json` | Ingredient data | No (rarely changes) |
| `ingreds_clean.json` | `data/baseline/ingreds_clean.json` | Human-readable ingredients | No |
| `recipes.json` | `data/baseline/recipes.json` | Crafting recipes (hand-edited source) | No (rarely changes) |
| `recipes_clean.json` / `recipes_compress.json` | `data/baseline/recipes_clean.json` / `data/baseline/compressed/recipes_compress.json` | Reviewed / compressed recipes | No (rarely changes) |
| `tomes.json` | `data/baseline/tomes.json` | Tome data | No (rarely changes) |
| `tome_map.json` | `data/baseline/maps/tome_map.json` | Persistent tome id/name mapping | No |

---

## Automated sync (preferred)

A script handles everything below automatically:

```bash
# Fetch latest data directly from GitHub (no local clone needed)
python sync-from-wynnbuilder.py

# When wynnbuilder adds a new version folder (e.g. 2.2.2.5)
python sync-from-wynnbuilder.py --bump-version 2.2.2.5

# Preview changes without writing
python sync-from-wynnbuilder.py --dry-run

# Use a local clone instead of fetching from GitHub
python sync-from-wynnbuilder.py --local ../wynnbuilder.github.io
```

The script compares Git blob SHAs so it only downloads files that actually changed.
After running, commit the modified files.

---

## Manual update steps (if needed)

### 1. Pull the latest from wynnbuilder

```bash
cd ../wynnbuilder.github.io
git pull
```

Check what changed:

```bash
git log --oneline -5
```

Look for commits mentioning items, atree, or a new version number (e.g. `2.2.2.0`).

### 2. Find the latest data version

```bash
ls data/ | grep -E '^[0-9]'
```

The newest folder name (e.g. `2.2.2.0`) is the version to sync.

### 3. Copy files into build-solver

From the repo root:

```bash
# Core item file — always update this (note: lives under data/baseline/compressed/ upstream)
cp ../wynnbuilder.github.io/data/baseline/compressed/compress.json ./compress.json
cp ./compress.json ./dist/compress.json

# Readable item file — update if you want clean.json in sync
cp ../wynnbuilder.github.io/data/baseline/clean.json ./clean.json

# New versioned data folder — copy if it doesn't exist yet
NEW_VER=2.2.2.0   # replace with the actual new version
cp -r ../wynnbuilder.github.io/data/$NEW_VER ./data/$NEW_VER
cp -r ./data/$NEW_VER ./dist/data/$NEW_VER
```

### 4. Check ingredients/recipes/tomes (if needed)

These change rarely. Verify before copying:

```bash
diff ./ingreds_compress.json ../wynnbuilder.github.io/data/baseline/compressed/ingreds_compress.json
diff ./recipes.json           ../wynnbuilder.github.io/data/baseline/recipes.json
diff ./tomes.json             ../wynnbuilder.github.io/data/baseline/tomes.json
```

If they differ and the upstream changes are intentional, copy them:

```bash
cp ../wynnbuilder.github.io/data/baseline/compressed/ingreds_compress.json ./ingreds_compress.json
cp ../wynnbuilder.github.io/data/baseline/ingreds_clean.json              ./ingreds_clean.json
cp ../wynnbuilder.github.io/data/baseline/recipes.json                    ./recipes.json
cp ../wynnbuilder.github.io/data/baseline/compressed/recipes_compress.json ./recipes_compress.json
cp ../wynnbuilder.github.io/data/baseline/recipes_clean.json              ./recipes_clean.json
cp ../wynnbuilder.github.io/data/baseline/tomes.json                      ./tomes.json
```

### 5. Verify

Sanity check the copy worked:

```bash
# compress.json should match wynnbuilder's data/baseline/compressed/compress.json exactly
diff ./compress.json ../wynnbuilder.github.io/data/baseline/compressed/compress.json
diff ./dist/compress.json ./compress.json

# New version folder should exist in both root and dist
ls ./data/ | tail -3
ls ./dist/data/ | tail -3
```

Run the dev server and confirm items load without errors:

```bash
npm run dev
```

---

## Updating the vendored legacy builder (`legacy/`)

`legacy/` is a vendored static copy of wynnbuilder's own site (builder, crafter, item pages, etc.), served at build-solver's own `/builder/` and `/crafter/` paths in production (see `.github/workflows/pages.yml`). It is a separate copy from the `data/` sync above and does not update automatically.

Refresh it whenever the version constants get bumped, so links into it don't try to decode a build hash using a version index the vendored copy doesn't know about:

```bash
SRC=../wynnbuilder.github.io
for d in atlas builder crafter css custom dev encoding_test ingredient ingredients ingredients_adv item items items_adv js map media py_script sets test_data testing thirdparty wynnfo; do
  rm -rf "legacy/$d" && cp -r "$SRC/$d" "legacy/$d"
done
cp "$SRC"/{crafter.html,customizer.html,dps_vis.html} legacy/
```

If upstream adds a new top-level folder that the served site actually depends on (check by grepping `builder/`, `crafter/`, and `js/` for references to it), add it to both the loop above and the `for dir in ...` list in `.github/workflows/pages.yml`.

---

## What NOT to update manually

- `dist/assets/` — this is generated by `npm run build`, do not touch it
- `workbench/data/` — separate legacy workbench data, not used by the main frontend
- `dps_data.json`, `tome_map.json`, `maploc_*.json`, `terrs_*.json`, `skillpoints.csv` — sync these only if upstream explicitly changed them

---

## Checklist

- [ ] Pulled latest from wynnbuilder
- [ ] Copied `compress.json` → root and `dist/`
- [ ] Copied `clean.json` → root
- [ ] Copied new `data/<version>/` → root and `dist/`
- [ ] Checked ingredients/recipes/tomes for changes
- [ ] Verified `dist/compress.json` matches root `compress.json`
- [ ] Refreshed `legacy/` if version constants were bumped
- [ ] Dev server loads items without errors
