// scripts/verify_data.ts
const path = require('path');
const fs = require('fs');

// Simple verification script that bypasses TS imports for simplicity if possible,
// OR just tries to mimic the loader logic to verify the JSON data itself.
// Since running TS directly can be tricky with specific tsconfig settings for Next.js,
// I'll opt for a JS script that reads the same files and verifies the logic,
// OR I can use ts-node with --skip-project to avoid tsconfig issues.

// Let's try to verify the data integrity by checking the JSON file directly.
// This confirms the migration worked. The integration into the app is handled by schoolLoader.ts logic which I've reviewed.

const ASSETS_PATH = path.join(__dirname, '../src/data/schoolAssets.json');
const DB_PATH = path.join(__dirname, '../src/data/escolas_db.json');

console.log('Verifying data integrity...');

if (!fs.existsSync(ASSETS_PATH)) {
    console.error('ERROR: schoolAssets.json not found!');
    process.exit(1);
}

const assets = JSON.parse(fs.readFileSync(ASSETS_PATH, 'utf-8'));
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const schools = db.escolas;

let totalSchools = 0;
let schoolsWithLogo = 0;
let schoolsWithColors = 0;
let schoolsMissingLogo = [];
let schoolsMissingColors = [];

// Replicate slugify logic for checking coverage
function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

for (const name of Object.keys(schools)) {
    totalSchools++;
    const slug = slugify(name);
    const asset = assets[slug];

    if (asset && asset.logo) {
        schoolsWithLogo++;
    } else {
        schoolsMissingLogo.push(name);
    }

    if (asset && asset.colors && asset.colors.length > 0) {
        schoolsWithColors++;
    } else {
        schoolsMissingColors.push(name);
    }
}

console.log(`Total Schools in DB: ${totalSchools}`);
console.log(`Schools with Logo: ${schoolsWithLogo}`);
console.log(`Schools with Colors: ${schoolsWithColors}`);

if (schoolsMissingLogo.length > 0) {
    console.log(`\nMissing Logos (${schoolsMissingLogo.length}):`);
    schoolsMissingLogo.forEach(s => console.log(`- ${s}`));
}

if (schoolsMissingColors.length > 0) {
    console.log(`\nMissing Colors (${schoolsMissingColors.length}):`);
    schoolsMissingColors.forEach(s => console.log(`- ${s}`));
}

if (schoolsWithLogo < 50) {
    console.error('ERROR: Too few logos matched. Something is wrong.');
    process.exit(1);
}

console.log('\nVerification Passed.');
