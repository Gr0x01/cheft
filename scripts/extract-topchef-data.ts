import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface RawTopChefEntry {
  restaurant: string;
  chef: string;
  seasons: string[];
  country: string;
  state?: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  jamesBeard?: boolean;
}

async function extractTopChefData(): Promise<RawTopChefEntry[]> {
  console.log('🌐 Launching browser to extract Top Chef data...');
  
  const browser = await chromium.launch({ headless: false }); // Set to false to see what's happening
  const page = await browser.newPage();
  
  try {
    // Navigate to the page
    console.log('📍 Navigating to topchef.fyi...');
    await page.goto('https://topchef.fyi/top-chef-map/', {
      waitUntil: 'networkidle'
    });
    
    // Wait for the map data to load
    console.log('⏳ Waiting for map data to load...');
    await page.waitForFunction(() => {
      return typeof window.tcm_map_data !== 'undefined' && 
             window.tcm_map_data.locations && 
             window.tcm_map_data.locations.length > 0;
    }, { timeout: 30000 });
    
    // Extract the data
    console.log('📊 Extracting restaurant data...');
    const restaurants = await page.evaluate(() => {
      const data = window.tcm_map_data;
      
      if (!data || !data.locations) {
        throw new Error('No tcm_map_data found');
      }
      
      return data.locations.map((location: any) => ({
        restaurant: location.restaurant || location.name || location.title,
        chef: location.chef,
        seasons: location.seasons || [location.season],
        country: location.country || 'US',
        state: location.state,
        city: location.city,
        address: location.address,
        lat: parseFloat(location.latitude || location.lat),
        lng: parseFloat(location.longitude || location.lng),
        website: location.website,
        jamesBeard: location.james_beard || false,
        // Capture any additional fields
        raw: location
      }));
    });
    
    console.log(`✅ Successfully extracted ${restaurants.length} restaurants!`);
    
    // Log some sample data for verification
    console.log('📋 Sample entries:');
    restaurants.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.chef} - ${r.restaurant} (${r.city}, ${r.state})`);
    });
    
    return restaurants;
    
  } catch (error) {
    console.error('❌ Error extracting data:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function saveData(data: RawTopChefEntry[]) {
  const outputPath = join(__dirname, '../data/topchef-raw.json');
  
  console.log(`💾 Saving data to ${outputPath}...`);
  
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log('✅ Data saved successfully!');
  
  // Generate summary
  const summary = {
    totalRestaurants: data.length,
    uniqueChefs: new Set(data.map(r => r.chef)).size,
    cities: new Set(data.map(r => `${r.city}, ${r.state || r.country}`)).size,
    states: new Set(data.map(r => r.state).filter(Boolean)).size,
    withWebsites: data.filter(r => r.website).length,
    jamesBearAwards: data.filter(r => r.jamesBeard).length
  };
  
  console.log('📊 Data Summary:');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

// Manual extraction option (if Playwright doesn't work)
function printManualInstructions() {
  console.log(`
🔧 Manual Extraction Instructions:

If the automated extraction fails, you can extract the data manually:

1. Open https://topchef.fyi/top-chef-map/ in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Paste this code and press Enter:

   copy(JSON.stringify(tcm_map_data.locations, null, 2));

5. The data is now copied to your clipboard
6. Create a file at data/topchef-raw.json and paste the data
7. Run the import script

`);
}

// Run if called directly
if (require.main === module) {
  extractTopChefData()
    .then(saveData)
    .then(() => {
      console.log('🎉 Extraction complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Extraction failed:', error);
      console.log('\n');
      printManualInstructions();
      process.exit(1);
    });
}

export { extractTopChefData, saveData };