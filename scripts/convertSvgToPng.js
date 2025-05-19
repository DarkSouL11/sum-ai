const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function convertSvgToPng(svgPath) {
  try {
    const svgBuffer = await fs.readFile(svgPath);
    const outputPath = svgPath.replace('.svg', '.png');
    await sharp(svgBuffer)
      .png()
      .toFile(outputPath);
    console.log(`Successfully converted ${svgPath} to ${outputPath}`);
  } catch (error) {
    console.error(`Error converting ${svgPath}:`, error);
  }
}

async function main() {
  const publicDir = path.join(__dirname, '../public');
  
  try {
    const files = await fs.readdir(publicDir);
    const svgFiles = files.filter(file => file.toLowerCase().endsWith('.svg'));
    
    if (svgFiles.length === 0) {
      console.log('No SVG files found in the public directory');
      return;
    }

    console.log(`Found ${svgFiles.length} SVG files to convert`);
    
    for (const svgFile of svgFiles) {
      const svgPath = path.join(publicDir, svgFile);
      await convertSvgToPng(svgPath);
    }
    
    console.log('All conversions completed');
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main(); 