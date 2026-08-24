/**
 * The Poké Ball catalog. `tier` follows how the games hand them out:
 *  1 — standard, always available (Poké / Great / Ultra)
 *  2 — situational, buyable or common rewards (premier … luxury)
 *  3 — rare, usually one per playthrough (master … beast)
 *  4 — cherish, only on gifted Pokémon
 *
 * Every ball is declared here; `art` decides how PokeBallGraphic paints the top
 * shell, and `fx` drives the release flash, aura and spark colors. Adding a new
 * ball is a data edit — no component changes.
 */

export type BallTier = 1 | 2 | 3 | 4;

/** How the upper shell is painted. */
export type BallArt =
  | "solid" // one flat hue (Poké, Premier, Master…)
  | "stripes" // two vertical accent stripes (Great, Sport)
  | "wedge" // angled wedges cutting in from the sides (Ultra, Beast)
  | "band" // horizontal accent band across the dome (Repeat, Timer)
  | "crest" // a small ring centred on the dome (Cherish, Love)
  | "emblem"; // the Master Ball "M" flanked by two dots

export type BallSpec = {
  /** How the top shell is painted. */
  art: BallArt;
  /** Accent used by `stripes` / `wedge` / `band` / `crest`. */
  accent: string;
  /** Center-button ring color. */
  button: string;
  /**
   * Catch multiplier fed to the Gen VIII formula (see catchOdds.ts). Conditional
   * balls carry their best-case value — Quick only pays off on turn one, Dusk in
   * the dark — which is the number this POC uses.
   */
  catchMod: number;
  fx: {
    /** Ambient aura + catch-ring hue. */
    aura: string;
    /** Release / click flash core. */
    flash: string;
    /** Spark and ember color. */
    spark: string;
  };
  id: BallId;
  label: string;
  /** Base and highlight of the upper shell. */
  shell: [string, string];
  tier: BallTier;
};

export type BallId =
  | "poke"
  | "great"
  | "ultra"
  | "premier"
  | "repeat"
  | "timer"
  | "nest"
  | "net"
  | "dive"
  | "heal"
  | "quick"
  | "dusk"
  | "luxury"
  | "master"
  | "safari"
  | "level"
  | "lure"
  | "moon"
  | "friend"
  | "love"
  | "heavy"
  | "fast"
  | "sport"
  | "dream"
  | "beast"
  | "cherish";

const WHITE_BUTTON = "#F2F5F8";

/**
 * Every `shell`, `accent` and `button` below is read off the official sprite in
 * assets/balls/ — run `python3 scripts/extract_ball_colors.py` to reprint the
 * palette of each ball's upper dome. The sprites themselves are 32x32, so they
 * cannot be blown up to the 220pt hero ball; using them as the colour source
 * keeps the drawn ball and the artwork the same object at every size.
 */
export const BALL_CATALOG: Record<BallId, BallSpec> = {
  // Tier 1 — the standard line.
  poke: {
    accent: "#FFD539",
    art: "solid",
    button: WHITE_BUTTON,
    catchMod: 1,
    fx: { aura: "#8BE5FF", flash: "#FFFFFF", spark: "#FFD539" },
    id: "poke",
    label: "Poké Ball",
    shell: ["#FF5A5F", "#D91022"],
    tier: 1,
  },
  great: {
    accent: "#BD3131",
    art: "stripes",
    button: WHITE_BUTTON,
    catchMod: 1.5,
    fx: { aura: "#3994FF", flash: "#EAF6FF", spark: "#39D5FF" },
    id: "great",
    label: "Great Ball",
    shell: ["#3994FF", "#3152D5"],
    tier: 1,
  },
  ultra: {
    accent: "#FFD539",
    art: "wedge",
    button: WHITE_BUTTON,
    catchMod: 2,
    fx: { aura: "#FFD539", flash: "#FFF6DC", spark: "#FFF65A" },
    id: "ultra",
    label: "Ultra Ball",
    shell: ["#738394", "#52626A"],
    tier: 1,
  },

  // Tier 2 — situational balls.
  premier: {
    // The sprite's dome is plain white; its red trim sits on the lower housing.
    accent: "#DECDF6",
    art: "solid",
    button: WHITE_BUTTON,
    catchMod: 1,
    fx: { aura: "#DECDF6", flash: "#FFFFFF", spark: "#FFFFFF" },
    id: "premier",
    label: "Premier Ball",
    shell: ["#FFFFFF", "#DECDF6"],
    tier: 2,
  },
  repeat: {
    accent: "#F6EE39",
    art: "band",
    button: WHITE_BUTTON,
    catchMod: 3.5, // already registered in the Pokédex
    fx: { aura: "#F6EE39", flash: "#FFF8E2", spark: "#DECD39" },
    id: "repeat",
    label: "Repeat Ball",
    shell: ["#FF9439", "#DE5A39"],
    tier: 2,
  },
  timer: {
    accent: "#DE5A39",
    art: "band",
    button: WHITE_BUTTON,
    catchMod: 4, // after ~10 turns
    fx: { aura: "#DE5A39", flash: "#FFFFFF", spark: "#FF9439" },
    id: "timer",
    label: "Timer Ball",
    shell: ["#FFFFFF", "#DECDF6"],
    tier: 2,
  },
  nest: {
    accent: "#E6E683",
    art: "wedge",
    button: WHITE_BUTTON,
    catchMod: 3.5, // against low-level Pokémon
    fx: { aura: "#7BC539", flash: "#F4FFE4", spark: "#B4F639" },
    id: "nest",
    label: "Nest Ball",
    shell: ["#7BC539", "#629441"],
    tier: 2,
  },
  net: {
    accent: "#4A5252",
    art: "stripes",
    button: WHITE_BUTTON,
    catchMod: 3.5, // Water and Bug types
    fx: { aura: "#4AB4C5", flash: "#E4FFFB", spark: "#39E6EE" },
    id: "net",
    label: "Net Ball",
    shell: ["#4AB4C5", "#4A7B8B"],
    tier: 2,
  },
  dive: {
    accent: "#DECDF6",
    art: "band",
    button: WHITE_BUTTON,
    catchMod: 3.5, // when fishing or surfacing
    fx: { aura: "#8BCDFF", flash: "#E6FAFF", spark: "#94EEF6" },
    id: "dive",
    label: "Dive Ball",
    shell: ["#8BCDFF", "#5AA4FF"],
    tier: 2,
  },
  heal: {
    accent: "#FFF6D5",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 1,
    fx: { aura: "#FF6AD5", flash: "#FFF0F7", spark: "#FFB4E6" },
    id: "heal",
    label: "Heal Ball",
    shell: ["#FF6AD5", "#EE52C5"],
    tier: 2,
  },
  quick: {
    accent: "#FFFF00",
    art: "wedge",
    button: WHITE_BUTTON,
    catchMod: 5, // first turn only
    fx: { aura: "#73BDFF", flash: "#F0FEFF", spark: "#FFFF00" },
    id: "quick",
    label: "Quick Ball",
    shell: ["#73BDFF", "#298BD5"],
    tier: 2,
  },
  dusk: {
    accent: "#62D539",
    art: "wedge",
    button: "#62D539",
    catchMod: 3, // at night or in caves
    fx: { aura: "#41AC41", flash: "#DFFFE9", spark: "#94FF52" },
    id: "dusk",
    label: "Dusk Ball",
    shell: ["#525252", "#404040"],
    tier: 2,
  },
  luxury: {
    accent: "#D59C31",
    art: "band",
    button: "#D59C31",
    catchMod: 1,
    fx: { aura: "#D59C31", flash: "#FFF6E0", spark: "#FFEE52" },
    id: "luxury",
    label: "Luxury Ball",
    shell: ["#7B7B83", "#4A5252"],
    tier: 2,
  },

  // Tier 3 — rare balls.
  master: {
    accent: "#E620C5",
    art: "emblem",
    button: WHITE_BUTTON,
    catchMod: 255, // never fails
    fx: { aura: "#B439F6", flash: "#F7ECFF", spark: "#E620C5" },
    id: "master",
    label: "Master Ball",
    shell: ["#B439F6", "#7331CD"],
    tier: 3,
  },
  safari: {
    accent: "#C5B439",
    art: "stripes",
    button: WHITE_BUTTON,
    catchMod: 1.5, // Safari Zone
    fx: { aura: "#C5B439", flash: "#F6FFE6", spark: "#DED57B" },
    id: "safari",
    label: "Safari Ball",
    shell: ["#4A9462", "#105A31"],
    tier: 3,
  },
  level: {
    accent: "#EEBD94",
    art: "band",
    button: WHITE_BUTTON,
    catchMod: 8, // when far above the target level
    fx: { aura: "#EEBD94", flash: "#FFDEBD", spark: "#DE945A" },
    id: "level",
    label: "Level Ball",
    shell: ["#DE4A39", "#9C6239"],
    tier: 3,
  },
  lure: {
    accent: "#DE5A6A",
    art: "band",
    button: WHITE_BUTTON,
    catchMod: 3, // while fishing
    fx: { aura: "#4AB4DE", flash: "#EAFBFF", spark: "#FFA4B4" },
    id: "lure",
    label: "Lure Ball",
    shell: ["#4AB4DE", "#2994CD"],
    tier: 3,
  },
  moon: {
    accent: "#F6CD41",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 4, // Moon Stone evolutions
    fx: { aura: "#F6CD41", flash: "#FFE6A4", spark: "#4AC5EE" },
    id: "moon",
    label: "Moon Ball",
    shell: ["#7B8B9C", "#627394"],
    tier: 3,
  },
  friend: {
    accent: "#C55A4A",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 1,
    fx: { aura: "#8BC539", flash: "#F2FFE9", spark: "#C55A4A" },
    id: "friend",
    label: "Friend Ball",
    shell: ["#8BC539", "#7BA439"],
    tier: 3,
  },
  love: {
    accent: "#FFC5E6",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 8, // same species, opposite gender
    fx: { aura: "#DE83B4", flash: "#FFF0F7", spark: "#FFC5E6" },
    id: "love",
    label: "Love Ball",
    shell: ["#DE83B4", "#BD5A9C"],
    tier: 3,
  },
  heavy: {
    accent: "#527BDE",
    art: "stripes",
    button: WHITE_BUTTON,
    catchMod: 1, // scales with the target weight
    fx: { aura: "#527BDE", flash: "#EFF4F8", spark: "#83ACEE" },
    id: "heavy",
    label: "Heavy Ball",
    shell: ["#94A4B4", "#738394"],
    tier: 3,
  },
  fast: {
    accent: "#F6CD39",
    art: "wedge",
    button: WHITE_BUTTON,
    catchMod: 4, // base Speed 100+
    fx: { aura: "#F6CD39", flash: "#FFFBE6", spark: "#FFB483" },
    id: "fast",
    label: "Fast Ball",
    shell: ["#EE8B41", "#CD6A29"],
    tier: 3,
  },
  sport: {
    accent: "#FFD539",
    art: "stripes",
    button: WHITE_BUTTON,
    catchMod: 1.5, // Bug-Catching Contest
    fx: { aura: "#FFD539", flash: "#FFF3E0", spark: "#FF9439" },
    id: "sport",
    label: "Sport Ball",
    shell: ["#FF9439", "#DE5A39"],
    tier: 3,
  },
  dream: {
    accent: "#FF62A4",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 4, // against sleeping Pokémon
    fx: { aura: "#FFB4D5", flash: "#FBF0FF", spark: "#FF62A4" },
    id: "dream",
    label: "Dream Ball",
    shell: ["#FFB4D5", "#E69CBD"],
    tier: 3,
  },
  beast: {
    accent: "#41ACFF",
    art: "wedge",
    button: WHITE_BUTTON,
    catchMod: 5, // Ultra Beasts only
    fx: { aura: "#41ACFF", flash: "#E6FEFF", spark: "#8BCDFF" },
    id: "beast",
    label: "Beast Ball",
    shell: ["#416AD5", "#3939B4"],
    tier: 3,
  },

  // Tier 4 — gifted only.
  cherish: {
    accent: "#FF9C9C",
    art: "crest",
    button: WHITE_BUTTON,
    catchMod: 1,
    fx: { aura: "#FF4131", flash: "#FFF3F3", spark: "#FF9C9C" },
    id: "cherish",
    label: "Cherish Ball",
    shell: ["#FF4131", "#CD3920"],
    tier: 4,
  },
};

/** Balls with hand-tuned art so far; the rest fall back to their `art` recipe. */
export const FEATURED_BALLS: BallId[] = ["poke", "great", "ultra", "dusk", "master", "cherish"];

/**
 * One line per ball, for the loadout screen. It says what the ball is FOR in the
 * games, because `catchMod` alone lies about the conditional ones: Quick sits at
 * x5 but only on turn one, Dusk at x3 only in the dark. Kept out of `BallSpec`
 * so it stays a caption, not something the capture maths can reach for.
 */
export const BALL_BLURB: Record<BallId, string> = {
  beast: "Purpose-built for catching Ultra Beasts.",
  cherish: "A rare ball reserved for event Pokémon.",
  dive: "Made for Pokémon that live underwater.",
  dream: "Brought back from dreams in the Entree Forest.",
  dusk: "Shines in dark caves and at night.",
  fast: "Made for Pokémon that are quick to flee.",
  friend: "The Pokémon it catches starts out friendly.",
  great: "A step up from the Poké Ball, noticeably better.",
  heal: "Fully heals the Pokémon it catches.",
  heavy: "The heavier the Pokémon, the better it works.",
  level: "Strong when your Pokémon is the higher level.",
  love: "Very strong on the same species, opposite gender.",
  lure: "Made for Pokémon hooked while fishing.",
  luxury: "The Pokémon inside grows friendly faster.",
  master: "Catches any wild Pokémon without fail.",
  moon: "Works best on species that evolve by Moon Stone.",
  nest: "The lower the Pokémon's level, the better it works.",
  net: "A specialist for Water- and Bug-type Pokémon.",
  poke: "The standard ball of every trainer.",
  premier: "A commemorative ball, as effective as a Poké Ball.",
  quick: "Extremely strong if thrown on the very first turn.",
  repeat: "Very strong on species already in your Pokédex.",
  safari: "A special ball used only in the Safari Zone.",
  sport: "The ball of the Bug-Catching Contest.",
  timer: "The longer the battle runs, the better it works.",
  ultra: "High-grade gear for hard-to-catch Pokémon.",
};

export function getBall(id: BallId): BallSpec {
  return BALL_CATALOG[id];
}
