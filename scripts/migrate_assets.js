const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DB_PATH = path.join(__dirname, '../src/data/escolas_db.json');
const COLORS_PATH = path.join(__dirname, '../src/data/logos/escolas_cores_v2.json');
const LOGOS_DIR = path.join(__dirname, '../src/data/logos');
const PUBLIC_LOGOS_DIR = path.join(__dirname, '../public/logos');
const OUTPUT_ASSETS_PATH = path.join(__dirname, '../src/data/schoolAssets.json');

// --- Helper: Slugify ---
function slugify(text) {
  return text
    .toString()
    .normalize('NFD') // Normalize to NFD form (decompose accents)
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

// --- Helper: Normalize Name ---
function normalizeName(text) {
  let name = text;
  // Remove common prefixes/suffixes, case insensitive
  name = name.replace(/^Bandeira\s+(do|da|de)?\s*(GRES)?\s*/i, '');
  name = name.replace(/^GRES\s+/i, '');
  name = name.replace(/^Bandeira\s+/i, '');

  // Also handle underscores for filenames
  name = name.replace(/^Bandeira_(do|da|de)?_?(GRES)?_?/i, '');
  name = name.replace(/^GRES_/i, '');
  name = name.replace(/^Bandeira_/i, '');

  name = name.replace(/_/g, ' ');
  return slugify(name);
}

const manualMap = {
    'tradicao': 'gres-tradicao',
    'arranco-do-engenho-de-dentro': 'arranco',
    'unidos-de-santa-tereza': 'unidos-da-vila-santa-tereza',
    'flamanguaca': 'fla-manguaca',
    'academicos-do-engenho-novo': 'unidos-do-engenho-novo',
    'mocidade-unida-de-jacarepagua': 'unidos-de-jacarepagua',
    'uniao-de-cosmos': 'unidos-de-cosmos',
    'unidos-de-sao-carlos': 'uniao-de-sao-carlos',
    'unidos-da-vila-rica': 'unidos-da-villa-rica'
};

// --- Main ---
async function main() {
  console.log('Starting migration...');

  // 1. Load Data
  const dbRaw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(dbRaw);
  const schoolsDB = db.escolas;

  const colorsRaw = fs.readFileSync(COLORS_PATH, 'utf-8');
  const colorsData = JSON.parse(colorsRaw);

  // 2. Scan Logos Directory
  let logoFiles = [];
  try {
    logoFiles = fs.readdirSync(LOGOS_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
  } catch (err) {
    console.error(`Error reading logo directory: ${err.message}`);
    process.exit(1);
  }

  // 3. Prepare Maps
  const assetsMap = {};
  const matchedLogos = new Set();
  const matchedColors = new Set();

  // 4. Iterate over DB Schools
  for (const schoolName of Object.keys(schoolsDB)) {
    const originalSlug = slugify(schoolName);

    // Check manual map or use original slug
    let lookupSlug = manualMap[originalSlug] || normalizeName(schoolName);

    // --- Find Colors ---
    // Search by normalized slug
    let colorEntry = colorsData.find(c => {
        const cSlug = normalizeName(c.escola);
        return cSlug === lookupSlug || cSlug === originalSlug;
    });

    let colors = [];
    if (colorEntry) {
      colors = [colorEntry.cor_principal, colorEntry.cor_secundaria];
      matchedColors.add(colorEntry.escola);
    } else {
      console.warn(`[WARN] No colors found for: "${schoolName}" (slug: ${originalSlug}, lookup: ${lookupSlug})`);
    }

    // --- Find Logo ---
    let logoFile = logoFiles.find(file => {
        const nameWithoutExt = path.parse(file).name;
        const fSlug = normalizeName(nameWithoutExt);
        return fSlug === lookupSlug || fSlug === originalSlug;
    });

    let logoPath = null;
    if (logoFile) {
      const ext = path.extname(logoFile).toLowerCase();
      // Use the CLEAN slug for the public filename
      const newFilename = `${originalSlug}${ext}`;
      const sourcePath = path.join(LOGOS_DIR, logoFile);
      const destPath = path.join(PUBLIC_LOGOS_DIR, newFilename);

      fs.copyFileSync(sourcePath, destPath);
      logoPath = `/logos/${newFilename}`;
      matchedLogos.add(logoFile);
    } else {
      console.warn(`[WARN] No logo found for: "${schoolName}" (slug: ${originalSlug}, lookup: ${lookupSlug})`);
    }

    // Add to Assets Map
    assetsMap[originalSlug] = {
      colors: colors,
      logo: logoPath
    };
  }

  // 5. Save Assets Map
  fs.writeFileSync(OUTPUT_ASSETS_PATH, JSON.stringify(assetsMap, null, 2));
  console.log(`Assets map saved to ${OUTPUT_ASSETS_PATH}`);

  // 6. Report Unused
  const unusedLogos = logoFiles.filter(f => !matchedLogos.has(f));
  if (unusedLogos.length > 0) {
    console.log('\n--- Unused Logo Files ---');
    unusedLogos.forEach(f => {
         const nameWithoutExt = path.parse(f).name;
         console.log(`- ${f} (normalized: ${normalizeName(nameWithoutExt)})`);
    });
  }

  const unusedColors = colorsData.filter(c => !matchedColors.has(c.escola));
  if (unusedColors.length > 0) {
      console.log('\n--- Unused Color Entries ---');
      unusedColors.forEach(c => console.log(`- ${c.escola} (normalized: ${normalizeName(c.escola)})`));
  }

  console.log('\nMigration complete.');
}

main().catch(err => console.error(err));
