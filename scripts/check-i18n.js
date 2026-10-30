#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../locales/en.json');
const kmPath = path.join(__dirname, '../locales/km.json');

if (!fs.existsSync(enPath) || !fs.existsSync(kmPath)) {
  console.error('Translation files in /locales missing!');
  process.exit(1);
}

// Keep messages directory in sync
const msgEnPath = path.join(__dirname, '../messages/en.json');
const msgKmPath = path.join(__dirname, '../messages/km.json');
if (fs.existsSync(path.dirname(msgEnPath))) {
  fs.copyFileSync(enPath, msgEnPath);
  fs.copyFileSync(kmPath, msgKmPath);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const km = JSON.parse(fs.readFileSync(kmPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(getKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const enKeys = getKeys(en);
const kmKeys = getKeys(km);

const missingInKm = enKeys.filter(k => !kmKeys.includes(k));
const missingInEn = kmKeys.filter(k => !enKeys.includes(k));

let hasErrors = false;

if (missingInKm.length > 0) {
  console.error(`Keys present in en.json but missing in km.json (${missingInKm.length}):`);
  missingInKm.forEach(k => console.error(`  - ${k}`));
  hasErrors = true;
}

if (missingInEn.length > 0) {
  console.error(`Keys present in km.json but missing in en.json (${missingInEn.length}):`);
  missingInEn.forEach(k => console.error(`  - ${k}`));
  hasErrors = true;
}

if (!hasErrors) {
  console.log(`Success! All ${enKeys.length} translation keys match between en.json and km.json.`);
  process.exit(0);
} else {
  process.exit(1);
}

