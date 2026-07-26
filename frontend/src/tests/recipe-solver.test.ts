import { describe, expect, it } from 'vitest';
import { runRecipeSolverBeamSearch } from '@/domain/recipe-solver/beam-search';
import {
  DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
  NO_INGREDIENT_ID,
  RECIPE_TYPE_TO_SKILL,
  RECIPE_TYPES,
  type NormalizedIngredient,
  type NormalizedRecipe,
  type RecipeCatalogSnapshot,
  type RecipeSolverProgressEvent,
} from '@/domain/recipe-solver/types';

function makeIngredient(
  id: number,
  name: string,
  ids: Record<string, { min: number; max: number }>,
): NormalizedIngredient {
  return {
    id,
    name,
    displayName: name,
    lvl: 1,
    tier: 1,
    skills: ['ARMOURING'],
    ids,
    itemIDs: { dura: 0, strReq: 0, dexReq: 0, intReq: 0, defReq: 0, agiReq: 0 },
    consumableIDs: { dura: 0, charges: 0 },
    posMods: { left: 0, right: 0, above: 0, under: 0, touching: 0, notTouching: 0 },
  };
}

function makeCatalog(extraIngredients: NormalizedIngredient[]): RecipeCatalogSnapshot {
  const recipe: NormalizedRecipe = {
    id: 100,
    name: 'Helmet-103-105',
    type: 'HELMET',
    skill: 'ARMOURING',
    materials: [
      { item: 'Refined Wood', amount: 1 },
      { item: 'Refined Ore', amount: 1 },
    ],
    healthOrDamage: [0, 0],
    durability: [100, 100],
    duration: [0, 0],
    basicDuration: [0, 0],
    lvl: [103, 105],
  };

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

  const recipes = [recipe];
  const ingredients = [noIngredient, ...extraIngredients];
  const recipesById = new Map<number, NormalizedRecipe>([[recipe.id, recipe]]);
  const recipesByType = new Map<string, NormalizedRecipe[]>([['HELMET', recipes]]);
  const ingredientsById = new Map<number, NormalizedIngredient>();
  const ingredientsBySkill = new Map<string, NormalizedIngredient[]>();
  const ingredientIdByName = new Map<string, number>();

  for (const ingredient of ingredients) {
    ingredientsById.set(ingredient.id, ingredient);
    ingredientIdByName.set(ingredient.name.toLowerCase(), ingredient.id);
    ingredientIdByName.set(ingredient.displayName.toLowerCase(), ingredient.id);
    for (const skill of ingredient.skills) {
      const key = skill.toUpperCase();
      const existing = ingredientsBySkill.get(key);
      if (existing) {
        existing.push(ingredient);
      } else {
        ingredientsBySkill.set(key, [ingredient]);
      }
    }
  }

  return {
    recipes,
    recipesById,
    recipesByType,
    ingredients,
    ingredientsById,
    ingredientsBySkill,
    ingredientIdByName,
    noIngredient,
  };
}

function makeCatalogForRecipe(
  recipeType: string,
  recipeSkill: string,
  levelRange: string,
  extraIngredients: NormalizedIngredient[],
): RecipeCatalogSnapshot {
  const recipeName = `${recipeType.charAt(0)}${recipeType.slice(1).toLowerCase()}-${levelRange}`;
  const [minLevelRaw, maxLevelRaw] = levelRange.split('-').map((value) => Number(value));
  const minLevel = Number.isFinite(minLevelRaw) ? minLevelRaw : 103;
  const maxLevel = Number.isFinite(maxLevelRaw) ? maxLevelRaw : 105;
  const recipe: NormalizedRecipe = {
    id: 200,
    name: recipeName,
    type: recipeType,
    skill: recipeSkill,
    materials: [
      { item: 'Refined Wood', amount: 1 },
      { item: 'Refined Ore', amount: 1 },
    ],
    healthOrDamage: [100, 200],
    durability: [100, 100],
    duration: [0, 0],
    basicDuration: [0, 0],
    lvl: [minLevel, maxLevel],
  };

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

  const recipes = [recipe];
  const ingredients = [noIngredient, ...extraIngredients];
  const recipesById = new Map<number, NormalizedRecipe>([[recipe.id, recipe]]);
  const recipesByType = new Map<string, NormalizedRecipe[]>([[recipeType.toUpperCase(), recipes]]);
  const ingredientsById = new Map<number, NormalizedIngredient>();
  const ingredientsBySkill = new Map<string, NormalizedIngredient[]>();
  const ingredientIdByName = new Map<string, number>();

  for (const ingredient of ingredients) {
    ingredientsById.set(ingredient.id, ingredient);
    ingredientIdByName.set(ingredient.name.toLowerCase(), ingredient.id);
    ingredientIdByName.set(ingredient.displayName.toLowerCase(), ingredient.id);
    for (const skill of ingredient.skills) {
      const key = skill.toUpperCase();
      const existing = ingredientsBySkill.get(key);
      if (existing) {
        existing.push(ingredient);
      } else {
        ingredientsBySkill.set(key, [ingredient]);
      }
    }
  }

  return {
    recipes,
    recipesById,
    recipesByType,
    ingredients,
    ingredientsById,
    ingredientsBySkill,
    ingredientIdByName,
    noIngredient,
  };
}

function makeWeaponsmithingDistractor(id: number): NormalizedIngredient {
  return {
    ...makeIngredient(id, `Distractor ${id}`, { sdPct: { min: 450, max: 450 } }),
    lvl: 104,
    tier: 2,
    skills: ['WEAPONSMITHING'],
  };
}

describe('recipe solver threshold handling', () => {
  const catalog = makeCatalog([
    makeIngredient(1, 'Mana Dust', { mr: { min: 10, max: 10 } }),
    makeIngredient(2, 'Damage Dust', { sdPct: { min: 300, max: 300 } }),
  ]);

  it('treats advanced ID thresholds as hard constraints', () => {
    const results = runRecipeSolverBeamSearch({
      catalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'HELMET',
        levelRange: '103-105',
        topN: 10,
        topKPerSlot: 12,
        beamWidth: 80,
        target: {
          mr: { min: 999 },
        },
      },
    });

    expect(results).toHaveLength(0);
  });

  it('returns only threshold-satisfying candidates when thresholds are feasible', () => {
    const results = runRecipeSolverBeamSearch({
      catalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'HELMET',
        levelRange: '103-105',
        topN: 20,
        topKPerSlot: 20,
        beamWidth: 160,
        target: {
          mr: { min: 40 },
        },
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((candidate) => (candidate.stats.maxRolls.mr ?? 0) >= 40)).toBe(true);
  });

  it('supports charge thresholds for consumable recipes', () => {
    const chargeCatalog = makeCatalogForRecipe('POTION', 'ALCHEMISM', '103-105', [
      {
        ...makeIngredient(3, 'Charge Dust', {}),
        lvl: 104,
        skills: ['ALCHEMISM'],
        consumableIDs: { dura: 0, charges: 1 },
      },
    ]);

    const results = runRecipeSolverBeamSearch({
      catalog: chargeCatalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'POTION',
        levelRange: '103-105',
        topN: 20,
        topKPerSlot: 20,
        beamWidth: 160,
        target: {
          charges: { min: 8 },
        },
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((candidate) => candidate.stats.charges >= 8)).toBe(true);
  });

  it('enforces Eyes Yet Open as must-include with lq min target', () => {
    const eyesYetOpenId = 3;
    const mustIncludeCatalog = makeCatalogForRecipe('SPEAR', 'WEAPONSMITHING', '103-105', [
      {
        ...makeIngredient(eyesYetOpenId, 'Eyes Yet Open', { lq: { min: 1, max: 2 } }),
        lvl: 104,
        tier: 2,
        skills: ['WEAPONSMITHING', 'WOODWORKING'],
      },
    ]);

    const results = runRecipeSolverBeamSearch({
      catalog: mustIncludeCatalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'SPEAR',
        levelRange: '103-105',
        topN: 20,
        topKPerSlot: 20,
        beamWidth: 200,
        mustIncludeIngredients: [eyesYetOpenId],
        target: {
          lq: { min: 12 },
        },
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((candidate) => candidate.ingredientIds.includes(eyesYetOpenId))).toBe(true);
    expect(results.every((candidate) => (candidate.stats.maxRolls.lq ?? 0) >= 12)).toBe(true);
    expect(results.every((candidate) => candidate.ingredientIds.every((id) => id === eyesYetOpenId))).toBe(true);
  });

  it('finds Eyes Yet Open lq>=12 under heavy distractor pressure', () => {
    const eyesYetOpenId = 9991;
    const distractors = Array.from({ length: 90 }, (_, index) => makeWeaponsmithingDistractor(8000 + index));
    const catalog = makeCatalogForRecipe('SPEAR', 'WEAPONSMITHING', '103-105', [
      ...distractors,
      {
        ...makeIngredient(eyesYetOpenId, 'Eyes Yet Open', { lq: { min: 1, max: 2 }, hpBonus: { min: -430, max: -375 } }),
        lvl: 104,
        tier: 2,
        skills: ['WEAPONSMITHING', 'WOODWORKING'],
      },
    ]);

    const results = runRecipeSolverBeamSearch({
      catalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'SPEAR',
        levelRange: '103-105',
        topN: 10,
        topKPerSlot: 10,
        beamWidth: 8,
        mustIncludeIngredients: [eyesYetOpenId],
        target: {
          lq: { min: 12 },
        },
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((candidate) => candidate.ingredientIds.includes(eyesYetOpenId))).toBe(true);
    expect(results.every((candidate) => (candidate.stats.maxRolls.lq ?? 0) >= 12)).toBe(true);
  });

  describe('ingredient level range filter', () => {
    it('includes ingredient at exactly minIngredientLevel boundary', () => {
      const ing = { ...makeIngredient(1, 'Boundary Ing', { mr: { min: 10, max: 10 } }), lvl: 80 };
      const testCatalog = makeCatalog([ing]);
      const results = runRecipeSolverBeamSearch({
        catalog: testCatalog,
        constraints: {
          ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
          recipeType: 'HELMET',
          levelRange: '103-105',
          minIngredientLevel: 80,
          maxIngredientLevel: 105,
          topN: 10,
          topKPerSlot: 20,
          beamWidth: 100,
          target: { mr: { min: 10 } },
        },
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((c) => c.ingredientIds.includes(1))).toBe(true);
    });

    it('excludes ingredient one below minIngredientLevel', () => {
      const ing = { ...makeIngredient(1, 'Below Min Ing', { mr: { min: 10, max: 10 } }), lvl: 79 };
      const testCatalog = makeCatalog([ing]);
      const results = runRecipeSolverBeamSearch({
        catalog: testCatalog,
        constraints: {
          ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
          recipeType: 'HELMET',
          levelRange: '103-105',
          minIngredientLevel: 80,
          maxIngredientLevel: 105,
          topN: 10,
          topKPerSlot: 20,
          beamWidth: 100,
          target: { mr: { min: 10 } },
        },
      });
      expect(results).toHaveLength(0);
    });

    it('includes ingredient at exactly maxIngredientLevel boundary', () => {
      const ing = { ...makeIngredient(1, 'Max Boundary Ing', { mr: { min: 10, max: 10 } }), lvl: 100 };
      const testCatalog = makeCatalog([ing]);
      const results = runRecipeSolverBeamSearch({
        catalog: testCatalog,
        constraints: {
          ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
          recipeType: 'HELMET',
          levelRange: '103-105',
          minIngredientLevel: 1,
          maxIngredientLevel: 100,
          topN: 10,
          topKPerSlot: 20,
          beamWidth: 100,
          target: { mr: { min: 10 } },
        },
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((c) => c.ingredientIds.includes(1))).toBe(true);
    });

    it('excludes ingredient one above maxIngredientLevel', () => {
      const ing = { ...makeIngredient(1, 'Above Max Ing', { mr: { min: 10, max: 10 } }), lvl: 101 };
      const testCatalog = makeCatalog([ing]);
      const results = runRecipeSolverBeamSearch({
        catalog: testCatalog,
        constraints: {
          ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
          recipeType: 'HELMET',
          levelRange: '103-105',
          minIngredientLevel: 1,
          maxIngredientLevel: 100,
          topN: 10,
          topKPerSlot: 20,
          beamWidth: 100,
          target: { mr: { min: 10 } },
        },
      });
      expect(results).toHaveLength(0);
    });

    it('single-level band only includes ingredient at exactly that level', () => {
      const ing = { ...makeIngredient(1, 'Exact Ing', { mr: { min: 10, max: 10 } }), lvl: 100 };
      const ingLow = { ...makeIngredient(2, 'Low Ing', { mr: { min: 10, max: 10 } }), lvl: 99 };
      const ingHigh = { ...makeIngredient(3, 'High Ing', { mr: { min: 10, max: 10 } }), lvl: 101 };
      const testCatalog = makeCatalog([ing, ingLow, ingHigh]);
      const results = runRecipeSolverBeamSearch({
        catalog: testCatalog,
        constraints: {
          ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
          recipeType: 'HELMET',
          levelRange: '103-105',
          minIngredientLevel: 100,
          maxIngredientLevel: 100,
          topN: 10,
          topKPerSlot: 20,
          beamWidth: 100,
          target: { mr: { min: 10 } },
        },
      });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every((c) => c.ingredientIds.every((id) => id === 1 || id === NO_INGREDIENT_ID)),
      ).toBe(true);
    });
  });

  it('reports unsatisfiable threshold detail for impossible lq min', () => {
    const eyesYetOpenId = 10001;
    const catalog = makeCatalogForRecipe('SPEAR', 'WEAPONSMITHING', '103-105', [
      {
        ...makeIngredient(eyesYetOpenId, 'Eyes Yet Open', { lq: { min: 1, max: 2 } }),
        lvl: 104,
        tier: 2,
        skills: ['WEAPONSMITHING', 'WOODWORKING'],
      },
    ]);

    const progress: RecipeSolverProgressEvent[] = [];
    const results = runRecipeSolverBeamSearch({
      catalog,
      constraints: {
        ...DEFAULT_RECIPE_SOLVER_CONSTRAINTS,
        recipeType: 'SPEAR',
        levelRange: '103-105',
        topN: 10,
        topKPerSlot: 10,
        beamWidth: 20,
        mustIncludeIngredients: [eyesYetOpenId],
        target: {
          lq: { min: 13 },
        },
      },
      onProgress: (event) => progress.push(event),
    });

    expect(results).toHaveLength(0);
    const final = [...progress].reverse().find((event) => event.phase === 'complete');
    expect(final?.detail ?? '').toContain('Unsatisfiable threshold');
  });
});

describe('RECIPE_TYPE_TO_SKILL', () => {
  // Wynncraft crafting professions. Armouring makes helmets and chestplates;
  // Tailoring makes leggings and boots. (Regression: chestplate was tailoring.)
  const EXPECTED: Record<string, string> = {
    HELMET: 'ARMOURING', CHESTPLATE: 'ARMOURING', LEGGINGS: 'TAILORING', BOOTS: 'TAILORING',
    SPEAR: 'WEAPONSMITHING', DAGGER: 'WEAPONSMITHING',
    WAND: 'WOODWORKING', BOW: 'WOODWORKING', RELIK: 'WOODWORKING',
    RING: 'JEWELING', NECKLACE: 'JEWELING', BRACELET: 'JEWELING',
    POTION: 'ALCHEMISM', SCROLL: 'SCRIBING', FOOD: 'COOKING',
  };

  it('chestplate is armouring, not tailoring', () => {
    expect(RECIPE_TYPE_TO_SKILL.CHESTPLATE).toBe('ARMOURING');
  });

  it('maps every recipe type to its correct profession', () => {
    expect(RECIPE_TYPE_TO_SKILL).toEqual(EXPECTED);
  });

  it('has an entry for every recipe type', () => {
    for (const type of RECIPE_TYPES) {
      expect(RECIPE_TYPE_TO_SKILL[type], `missing skill for ${type}`).toBeTruthy();
    }
  });
});
