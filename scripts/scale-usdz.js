import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_MODEL = 'models/glb/toki-highball-complete.glb';
const OUTPUT_MODEL = 'models/glb/toki-complete-jad-02-scaled.glb.usdz';
const SCALE_FACTOR = 0.05;

async function scaleAndExportUSDZ() {
  console.log('🔧 Starting USDZ scaling process...');
  console.log(`📥 Input: ${INPUT_MODEL}`);
  console.log(`📤 Output: ${OUTPUT_MODEL}`);
  console.log(`📏 Scale: ${SCALE_FACTOR * 100}%`);
  console.log('');

  try {
    // Load the GLB file
    console.log('⏳ Loading GLB model...');
    const loader = new GLTFLoader();
    
    const inputPath = path.join(__dirname, '..', INPUT_MODEL);
    const outputPath = path.join(__dirname, '..', OUTPUT_MODEL);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Load the model
    const gltfData = fs.readFileSync(inputPath);
    const arrayBuffer = gltfData.buffer.slice(
      gltfData.byteOffset,
      gltfData.byteOffset + gltfData.byteLength
    );

    // Parse the GLTF
    loader.parse(
      arrayBuffer,
      '',
      async (gltf) => {
        console.log('✅ GLB model loaded successfully');
        
        // Scale the entire scene
        console.log(`🔄 Applying ${SCALE_FACTOR} scale...`);
        gltf.scene.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        
        // Update matrices
        gltf.scene.updateMatrixWorld(true);
        
        console.log('✅ Scale applied');

        // Export to USDZ
        console.log('⏳ Exporting to USDZ...');
        const exporter = new USDZExporter();
        
        try {
          const usdzData = await exporter.parseAsync(gltf.scene);
          
          // Write the file
          fs.writeFileSync(outputPath, Buffer.from(usdzData));
          
          console.log('✅ USDZ exported successfully!');
          console.log(`📦 Output saved to: ${OUTPUT_MODEL}`);
          
          // Get file size
          const stats = fs.statSync(outputPath);
          const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`📊 File size: ${fileSizeInMB} MB`);
          
          console.log('');
          console.log('🎉 Process complete!');
        } catch (exportError) {
          console.error('❌ Error exporting USDZ:', exportError);
          throw exportError;
        }
      },
      (error) => {
        console.error('❌ Error loading GLB:', error);
        throw error;
      }
    );

  } catch (error) {
    console.error('');
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
scaleAndExportUSDZ();

