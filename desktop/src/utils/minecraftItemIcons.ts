/**
 * Minecraft item ID to emoji icon mapping
 * This maps Minecraft item IDs to representative emoji characters
 */

const MINECRAFT_ITEM_ICONS: Record<string, string> = {
  // Tools
  'wooden_pickaxe': '⛏️',
  'stone_pickaxe': '⛏️',
  'iron_pickaxe': '⛏️',
  'diamond_pickaxe': '⛏️',
  'netherite_pickaxe': '⛏️',
  'golden_pickaxe': '⛏️',
  'wooden_axe': '🪓',
  'stone_axe': '🪓',
  'iron_axe': '🪓',
  'diamond_axe': '🪓',
  'netherite_axe': '🪓',
  'golden_axe': '🪓',
  'wooden_shovel': '🔪',
  'stone_shovel': '🔪',
  'iron_shovel': '🔪',
  'diamond_shovel': '🔪',
  'netherite_shovel': '🔪',
  'golden_shovel': '🔪',
  'wooden_hoe': '🌾',
  'stone_hoe': '🌾',
  'iron_hoe': '🌾',
  'diamond_hoe': '🌾',
  'netherite_hoe': '🌾',
  'golden_hoe': '🌾',
  'wooden_sword': '⚔️',
  'stone_sword': '⚔️',
  'iron_sword': '⚔️',
  'diamond_sword': '⚔️',
  'netherite_sword': '⚔️',
  'golden_sword': '⚔️',

  // Armor
  'leather_helmet': '🪖',
  'leather_chestplate': '🛡️',
  'leather_leggings': '👖',
  'leather_boots': '👢',
  'chainmail_helmet': '🪖',
  'chainmail_chestplate': '🛡️',
  'chainmail_leggings': '👖',
  'chainmail_boots': '👢',
  'iron_helmet': '🪖',
  'iron_chestplate': '🛡️',
  'iron_leggings': '👖',
  'iron_boots': '👢',
  'diamond_helmet': '🪖',
  'diamond_chestplate': '🛡️',
  'diamond_leggings': '👖',
  'diamond_boots': '👢',
  'netherite_helmet': '🪖',
  'netherite_chestplate': '🛡️',
  'netherite_leggings': '👖',
  'netherite_boots': '👢',
  'golden_helmet': '🪖',
  'golden_chestplate': '🛡️',
  'golden_leggings': '👖',
  'golden_boots': '👢',

  // Blocks
  'stone': '🪨',
  'granite': '🪨',
  'diorite': '🪨',
  'andesite': '🪨',
  'dirt': '🟫',
  'grass_block': '🟩',
  'cobblestone': '🪨',
  'oak_log': '🪵',
  'spruce_log': '🪵',
  'birch_log': '🪵',
  'jungle_log': '🪵',
  'acacia_log': '🪵',
  'dark_oak_log': '🪵',
  'mangrove_log': '🪵',
  'oak_planks': '🟤',
  'spruce_planks': '🟤',
  'birch_planks': '🟤',
  'jungle_planks': '🟤',
  'acacia_planks': '🟤',
  'dark_oak_planks': '🟤',
  'sand': '🟨',
  'red_sand': '🟧',
  'gravel': '🩶',
  'glass': '🟦',
  'oak_leaves': '🍃',
  'spruce_leaves': '🍃',
  'birch_leaves': '🍃',
  'jungle_leaves': '🍃',
  'acacia_leaves': '🍃',
  'dark_oak_leaves': '🍃',
  'ice': '🧊',
  'snow': '🟩',
  'clay': '⬜',
  'mycelium': '🟫',
  'end_stone': '🟨',
  'netherrack': '🟥',
  'soul_sand': '🟫',
  'crimson_nylium': '🟥',
  'warped_nylium': '🟦',

  // Ores
  'coal_ore': '🪨',
  'copper_ore': '🪨',
  'iron_ore': '🪨',
  'gold_ore': '🪨',
  'lapis_ore': '🪨',
  'diamond_ore': '🪨',
  'redstone_ore': '🪨',
  'emerald_ore': '🪨',
  'deepslate_coal_ore': '🪨',
  'deepslate_copper_ore': '🪨',
  'deepslate_iron_ore': '🪨',
  'deepslate_gold_ore': '🪨',
  'deepslate_lapis_ore': '🪨',
  'deepslate_diamond_ore': '🪨',
  'deepslate_redstone_ore': '🪨',
  'deepslate_emerald_ore': '🪨',

  // Raw Materials
  'raw_copper': '🪙',
  'raw_iron': '⬜',
  'raw_gold': '🟨',
  'coal': '⬛',
  'diamond': '💎',
  'emerald': '💚',
  'lapis_lazuli': '💙',
  'redstone': '🔴',
  'copper_ingot': '🪙',
  'iron_ingot': '⬜',
  'gold_ingot': '🟨',
  'netherite_ingot': '⬛',
  'netherite_scrap': '⬛',

  // Food
  'apple': '🍎',
  'baked_potato': '🥔',
  'beef': '🍖',
  'beetroot': '🌰',
  'bread': '🍞',
  'carrot': '🥕',
  'chicken': '🍗',
  'cod': '🐟',
  'golden_apple': '🍎',
  'golden_carrot': '🥕',
  'melon': '🍈',
  'mutton': '🍖',
  'poisonous_potato': '🥔',
  'porkchop': '🍖',
  'potato': '🥔',
  'pufferfish': '🐡',
  'pumpkin_pie': '🥧',
  'salmon': '🐠',
  'sweet_berries': '🫐',
  'tropical_fish': '🐠',
  'chorus_fruit': '🍇',
  'dried_kelp': '🟫',
  'honey_bottle': '🍯',
  'glow_berries': '✨',

  // Miscellaneous
  'stick': '🔱',
  'string': '📏',
  'wool': '☁️',
  'white_wool': '☁️',
  'orange_wool': '🧡',
  'magenta_wool': '💗',
  'light_blue_wool': '💙',
  'yellow_wool': '💛',
  'lime_wool': '💚',
  'pink_wool': '🌸',
  'gray_wool': '🩶',
  'light_gray_wool': '⬜',
  'cyan_wool': '🔵',
  'purple_wool': '💜',
  'blue_wool': '💙',
  'brown_wool': '🟤',
  'green_wool': '💚',
  'red_wool': '❤️',
  'black_wool': '⬛',
  'oak_sapling': '🌱',
  'spruce_sapling': '🌱',
  'birch_sapling': '🌱',
  'jungle_sapling': '🌱',
  'acacia_sapling': '🌱',
  'dark_oak_sapling': '🌱',
  'mangrove_propagule': '🌱',
  'flower_pot': '🪴',
  'furnace': '🔥',
  'crafting_table': '🪚',
  'chest': '📦',
  'barrel': '🛢️',
  'smoker': '💨',
  'blast_furnace': '🔥',
  'bookshelf': '📚',
  'enchanting_table': '📖',
  'ender_chest': '📦',
  'dispenser': '🎯',
  'dropper': '🎯',
  'hopper': '⏬',
  'shulker_box': '📦',
  'bed': '🛏️',
  'redstone_lamp': '💡',
  'lantern': '🔦',
  'soul_lantern': '🔦',
  'candle': '🕯️',
  'torch': '🔦',
  'soul_torch': '🔦',
  'campfire': '🔥',
  'soul_campfire': '🔥',
  'ladder': '🪜',
  'vine': '🌿',
  'cocoa': '🌴',
  'scaffolding': '🏗️',
  'cauldron': '🪣',
  'brewing_stand': '🧪',
  'bell': '🔔',
  'jukebox': '🎵',
  'note_block': '🎵',
  'armor_stand': '🧍',
  'sea_lantern': '💙',
  'item_frame': '🖼️',
  'glow_item_frame': '✨',
  'anvil': '⚒️',
  'grindstone': '⚙️',
  'smithing_table': '🔨',
  'loom': '🪡',
  'stonecutter': '⛏️',
  'respawn_anchor': '⚓',
  'lodestone': '🧭',
  'bucket': '🪣',
  'water_bucket': '💧',
  'lava_bucket': '🔥',
  'milk_bucket': '🥛',
  'powder_snow_bucket': '🟦',
  'piston': '⚙️',
  'sticky_piston': '⚙️',
  'slime_block': '🟩',
  'honey_block': '🟨',
  'tnt': '💣',
  'farmland': '🌾',
  'soul_soil': '🟫',
  'end_portal_frame': '👁️',
  'end_crystal': '💎',
  'beacon': '⭐',
  'conduit': '⚡',
  'dragon_egg': '🥚',
  'ender_pearl': '👁️',
  'blaze_rod': '🔥',
  'ghast_tear': '😢',
  'magma_cream': '🔥',
  'ender_eye': '👁️',
  'nether_star': '⭐',
  'shulker_shell': '🐚',
  'nautilus_shell': '🐚',
  'heart_of_the_sea': '💙',
  'scute': '🐢',
  'phantom_membrane': '👻',
  'saddle': '🐎',
  'name_tag': '🏷️',
  'lead': '🔗',
  'flint': '🪨',
  'flint_and_steel': '🔥',
  'paper': '📄',
  'book': '📖',
  'writable_book': '📝',
  'written_book': '📚',
  'map': '🗺️',
  'filled_map': '🗺️',
  'compass': '🧭',
  'recovery_compass': '🧭',
  'clock': '🕐',
  'spyglass': '🔭',
  'fishing_rod': '🎣',
  'carrot_on_a_stick': '🥕',
  'elytra': '👼',
  'shears': '✂️',
  'nether_wart': '🌰',
  'nether_wart_block': '🌰',
  'redstone_dust': '🔴',
  'powder_snow': '🟦',
  'sculk_catalyst': '🟦',
  'sculk_sensor': '👂',
  'sculk_shrieker': '👂',
  'sculk_vein': '🟦',
  'sculk_block': '🟦',

  // Potions
  'potion': '🧪',
  'splash_potion': '🧪',
  'lingering_potion': '🧪',
  'experience_bottle': '💫',

  // Default fallback
  'default': '📦',
};

/**
 * Get emoji icon for a Minecraft item ID
 * @param itemId The Minecraft item ID (e.g., 'minecraft:diamond_pickaxe')
 * @returns An emoji character representing the item
 */
export function getMinecraftItemIcon(itemId: string): string {
  // Remove 'minecraft:' prefix if present
  const cleanId = itemId.replace('minecraft:', '');

  // Look for exact match
  if (MINECRAFT_ITEM_ICONS[cleanId]) {
    return MINECRAFT_ITEM_ICONS[cleanId];
  }

  // Look for partial matches (e.g., 'diamond' in 'diamond_pickaxe')
  for (const [key, icon] of Object.entries(MINECRAFT_ITEM_ICONS)) {
    if (cleanId.includes(key) || key.includes(cleanId)) {
      return icon;
    }
  }

  // Check for colored wool
  if (cleanId.includes('wool')) {
    if (cleanId.includes('white')) return '☁️';
    if (cleanId.includes('orange')) return '🧡';
    if (cleanId.includes('magenta')) return '💗';
    if (cleanId.includes('light_blue')) return '💙';
    if (cleanId.includes('yellow')) return '💛';
    if (cleanId.includes('lime')) return '💚';
    if (cleanId.includes('pink')) return '🌸';
    if (cleanId.includes('gray')) return '🩶';
    if (cleanId.includes('light_gray')) return '⬜';
    if (cleanId.includes('cyan')) return '🔵';
    if (cleanId.includes('purple')) return '💜';
    if (cleanId.includes('blue')) return '💙';
    if (cleanId.includes('brown')) return '🟤';
    if (cleanId.includes('green')) return '💚';
    if (cleanId.includes('red')) return '❤️';
    if (cleanId.includes('black')) return '⬛';
    return '☁️';
  }

  // Default fallback
  return MINECRAFT_ITEM_ICONS['default'];
}
