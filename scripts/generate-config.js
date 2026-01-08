#!/usr/bin/env node

/**
 * Generate config.js from .env file
 * Usage: node scripts/generate-config.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  // Read .env file
  const envPath = join(rootDir, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  
  // Parse .env file
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        envVars[key.trim()] = value.trim();
      }
    }
  });

  // Generate config.js
  const configContent = `// Configuration file - DO NOT COMMIT THIS FILE
// This file is auto-generated from .env file
// Run: node scripts/generate-config.js

window.APP_CONFIG = {
  ELEVENLABS_API_KEY: '${envVars.ELEVENLABS_API_KEY || ''}',
  ELEVENLABS_VOICE_ID: '${envVars.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'}'
};
`;

  // Write config.js
  const configPath = join(rootDir, 'config.js');
  writeFileSync(configPath, configContent, 'utf-8');
  
  console.log('✅ Generated config.js from .env file');
  console.log(`   Location: ${configPath}`);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('❌ .env file not found');
    console.error('   Create a .env file in the root directory with:');
    console.error('   ELEVENLABS_API_KEY=your-api-key-here');
    console.error('   ELEVENLABS_VOICE_ID=your-voice-id (optional)');
  } else {
    console.error('❌ Error generating config:', error.message);
  }
  process.exit(1);
}

