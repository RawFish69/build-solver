import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runRecipeSolverBeamSearch } from '@/domain/recipe-solver/beam-search';
import {
  DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
  NO_INGREDIENT_ID,
  type NormalizedIngredient,
  type NormalizedRecipe,
  type RecipeCatalogSnapshot,
} from '@/domain/recipe-solver/types';

// Integration test against the REAL served data files (frontend/public/*).
// Guards the post-Fruma update: recipes/ingredients for levels 106-119 must
// be present and usable by the solver, not just the pre-Fruma <=105 data.

const publicDir = resolve(process.cwd(), 'public');

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(publicDir, name), 'utf-8')) as T;
}

// Mirror of catalog-service normalizers (those are not exported).
function rangeOrZero(field?: { minimum: number; maximum: number }): [number, number] {
  return field ? [field.minimum, field.maximum] : [0, 0];
}

interface RawRecipe {
  id: number;
  name: string;
  type: string;
  skill: string;
  materials: Array<{ item: string; amount: number }>;
  healthOrDamage?: { minimum: number; maximum: number };
  durability?: { minimum: number; maximum: number };
  duration?: { minimum: number; maximum: number };
  basicDuration?: { minimum: number; maximum: number };
  lvl?: { minimum: number; maximum: number };
}

interface RawIngredient {
  id: number;
  name: string;
  displayName?: string;
  lvl: number;
  tier: number;
  skills: string[];
  ids: Record<string, { minimum: number; maximum: number } | number>;
  itemIDs: Record<string, number>;
  consumableIDs: Record<string, number>;
  posMods: Record<string, number>;
}

function normalizeRecipe(raw: RawRecipe): NormalizedRecipe {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    skill: raw.skill,
    materials: [
      { item: raw.materials[0].item, amount: raw.materials[0].amount },
      { item: raw.materials[1].item, amount: raw.materials[1].amount },
    ],
    healthOrDamage: rangeOrZero(raw.healthOrDamage),
    durability: rangeOrZero(raw.durability),
    duration: rangeOrZero(raw.duration),
    basicDuration: rangeOrZero(raw.basicDuration),
    lvl: rangeOrZero(raw.lvl),
  };
}

function normalizeIngredient(raw: RawIngredient): NormalizedIngredient {
  const ids: Record<string, { min: number; max: number }> = {};
  for (const [key, val] of Object.entries(raw.ids ?? {})) {
    if (val && typeof val === 'object' && 'minimum' in val) {
      ids[key] = { min: val.minimum, max: val.maximum };
    }
  }
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName ?? raw.name,
    lvl: raw.lvl,
    tier: raw.tier,
    skills: raw.skills ?? [],
    ids,
    itemIDs: {
      dura: raw.itemIDs?.dura ?? 0,
      strReq: raw.itemIDs?.strReq ?? 0,
      dexReq: raw.itemIDs?.dexReq ?? 0,
      intReq: raw.itemIDs?.intReq ?? 0,
      defReq: raw.itemIDs?.defReq ?? 0,
      agiReq: raw.itemIDs?.agiReq ?? 0,
    },
    consumableIDs: {
      dura: raw.consumableIDs?.dura ?? 0,
      charges: raw.consumableIDs?.charges ?? 0,
    },
    posMods: {
      left: raw.posMods?.left ?? 0,
      right: raw.posMods?.right ?? 0,
      above: raw.posMods?.above ?? 0,
      under: raw.posMods?.under ?? 0,
      touching: raw.posMods?.touching ?? 0,
      notTouching: raw.posMods?.notTouching ?? 0,
    },
  };
}

function buildSnapshot(
  recipes: NormalizedRecipe[],
  ingredients: NormalizedIngredient[],
): RecipeCatalogSnapshot {
  const noIngredient: NormalizedIngredient = {
    id: NO_INGREDIENT_ID,
    name: 'No Ingredient',
    displayName: 'No Ingredient',
    lvl: 0,
    tier: 0,
    skills: [],
    ids: {},
    itemIDs: { dura: 0, strReq: 0, dexReq: 0, intReq: 0, defReq: 0, agiReq: 0 },
    consumableIDs: { dura: 0, charges: 0 },
    posMods: { left: 0, right: 0, above: 0, under: 0, touching: 0, notTouching: 0 },
  };
  const all = [noIngredient, ...ingredients];
  const recipesById = new Map<number, NormalizedRecipe>();
  const recipesByType = new Map<string, NormalizedRecipe[]>();
  for (const r of recipes) {
    recipesById.set(r.id, r);
    const key = r.type.toUpperCase();
    const list = recipesByType.get(key) ?? [];
    list.push(r);
    recipesByType.set(key, list);
  }
  const ingredientsById = new Map<number, NormalizedIngredient>();
  const ingredientsBySkill = new Map<string, NormalizedIngredient[]>();
  const ingredientIdByName = new Map<string, number>();
  for (const ing of all) {
    ingredientsById.set(ing.id, ing);
    ingredientIdByName.set(ing.name.toLowerCase(), ing.id);
    for (const skill of ing.skills) {
      const key = skill.toUpperCase();
      const list = ingredientsBySkill.get(key) ?? [];
      list.push(ing);
      ingredientsBySkill.set(key, list);
    }
  }
  return {
    recipes,
    recipesById,
    recipesByType,
    ingredients: all,
    ingredientsById,
    ingredientsBySkill,
    ingredientIdByName,
    noIngredient,
  };
}

describe('post-Fruma recipe data (real served files)', () => {
  const recipes = loadJson<{ recipes: RawRecipe[] }>('recipes_compress.json').recipes.map(
    normalizeRecipe,
  );
  const ingredients = loadJson<RawIngredient[]>('ingreds_compress.json').map(normalizeIngredient);
  const catalog = buildSnapshot(recipes, ingredients);

  it('has recipes covering every level 106-119', () => {
    const covered = new Set<number>();
    for (const r of recipes) {
      for (let lvl = r.lvl[0]; lvl <= r.lvl[1]; lvl += 1) covered.add(lvl);
    }
    for (let lvl = 106; lvl <= 119; lvl += 1) {
      expect(covered.has(lvl), `missing recipe coverage for level ${lvl}`).toBe(true);
    }
  });

  it('has crafting ingredients available at levels 106-119', () => {
    const highLevel = ingredients.filter((i) => i.lvl >= 106 && i.lvl <= 119);
    expect(highLevel.length).toBeGreaterThan(0);
  });

  it('solves a post-105 recipe (Helmet 117-119) and returns builds', () => {
    const results = runRecipeSolverBeamSearch({
      catalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'HELMET',
        levelRange: '117-119',
        topN: 10,
        topKPerSlot: 16,
        beamWidth: 120,
        target: {},
      },
    });
    expect(results.length).toBeGreaterThan(0);
  });
});
