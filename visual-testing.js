const { chromium } = require('playwright');

async function testChefMapVisuals() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Test desktop viewport
  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('🎬 Starting visual testing of Chef Map luxury transformation...');
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow for any animations to settle
    
    console.log('📸 Capturing landing page overview...');
    await page.screenshot({ 
      path: 'screenshots/01-landing-page-desktop.png', 
      fullPage: true 
    });
    
    console.log('🔍 Testing navigation components...');
    
    // Test navigation hover states
    const navButtons = page.locator('nav button, header button, [role="navigation"] button');
    if (await navButtons.count() > 0) {
      await navButtons.first().hover();
      await page.waitForTimeout(300);
      await page.screenshot({ 
        path: 'screenshots/02-nav-hover-state.png' 
      });
    }
    
    // Test search input focus
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.focus();
      await page.screenshot({ 
        path: 'screenshots/03-search-input-focus.png' 
      });
    }
    
    // Test filter pills interaction
    const filterPills = page.locator('[role="button"], button').filter({ hasText: /cuisine|price|rating/i });
    if (await filterPills.count() > 0) {
      await filterPills.first().hover();
      await page.screenshot({ 
        path: 'screenshots/04-filter-pills-hover.png' 
      });
    }
    
    console.log('🏪 Testing sidebar restaurant cards...');
    
    // Capture sidebar with restaurant cards
    const sidebar = page.locator('[class*="sidebar"], [class*="restaurant"], .w-80, .w-96').first();
    if (await sidebar.count() > 0) {
      await sidebar.screenshot({ 
        path: 'screenshots/05-sidebar-restaurant-cards.png' 
      });
      
      // Test card hover effects
      const cards = page.locator('[class*="card"], [class*="restaurant"]').filter({ hasText: /\$|rating|cuisine/i });
      if (await cards.count() > 0) {
        await cards.first().hover();
        await page.screenshot({ 
          path: 'screenshots/06-restaurant-card-hover.png' 
        });
      }
    }
    
    console.log('🗺️ Testing map component styling...');
    
    // Capture map area
    const mapContainer = page.locator('[class*="map"], #map, [id*="map"]').first();
    if (await mapContainer.count() > 0) {
      await mapContainer.screenshot({ 
        path: 'screenshots/07-map-component.png' 
      });
    }
    
    console.log('🎨 Testing glassmorphic effects...');
    
    // Capture elements with glassmorphic styling
    const glassElements = page.locator('[class*="glass"], [class*="blur"], [class*="backdrop"]');
    for (let i = 0; i < Math.min(await glassElements.count(), 3); i++) {
      await glassElements.nth(i).screenshot({ 
        path: `screenshots/08-glassmorphic-element-${i + 1}.png` 
      });
    }
    
    console.log('📱 Testing tablet viewport...');
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'screenshots/09-tablet-view.png', 
      fullPage: true 
    });
    
    console.log('📱 Testing mobile viewport...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'screenshots/10-mobile-view.png', 
      fullPage: true 
    });
    
    // Test mobile navigation if different
    const mobileNav = page.locator('[class*="mobile"], [class*="hamburger"], button[aria-label*="menu"]');
    if (await mobileNav.count() > 0) {
      await mobileNav.first().click();
      await page.screenshot({ 
        path: 'screenshots/11-mobile-nav-open.png' 
      });
    }
    
    console.log('🎯 Testing specific dark luxury elements...');
    
    // Back to desktop for detailed testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Test dark theme elements
    const darkElements = page.locator('[class*="dark"], [class*="black"], [class*="luxury"]');
    if (await darkElements.count() > 0) {
      await page.screenshot({ 
        path: 'screenshots/12-dark-luxury-elements.png' 
      });
    }
    
    // Test animations by triggering interactions
    const interactiveElements = page.locator('button, [role="button"], a').filter({ hasNotText: '' });
    for (let i = 0; i < Math.min(await interactiveElements.count(), 5); i++) {
      try {
        await interactiveElements.nth(i).hover();
        await page.waitForTimeout(300); // Let animations complete
        await page.screenshot({ 
          path: `screenshots/13-interaction-${i + 1}.png` 
        });
      } catch (e) {
        console.log(`Skipped interaction ${i + 1}: ${e.message}`);
      }
    }
    
    console.log('✨ Visual testing complete! Check the screenshots folder.');
    
    // Create a summary report
    const report = `
# Visual Testing Report - Chef Map Luxury Transformation

## Screenshots Captured:
1. **01-landing-page-desktop.png** - Full page overview
2. **02-nav-hover-state.png** - Navigation hover effects
3. **03-search-input-focus.png** - Search input styling
4. **04-filter-pills-hover.png** - Filter interaction states
5. **05-sidebar-restaurant-cards.png** - Restaurant cards layout
6. **06-restaurant-card-hover.png** - Card hover effects
7. **07-map-component.png** - Map styling
8. **08-glassmorphic-element-*.png** - Glass effects
9. **09-tablet-view.png** - Tablet responsive design
10. **10-mobile-view.png** - Mobile responsive design
11. **11-mobile-nav-open.png** - Mobile navigation
12. **12-dark-luxury-elements.png** - Dark theme elements
13. **13-interaction-*.png** - Interactive elements

## Review Checklist:
- [ ] Dark luxury theme applied consistently
- [ ] Glassmorphic effects rendering properly
- [ ] Navigation interactions working
- [ ] Restaurant cards styled correctly
- [ ] Map component has premium styling
- [ ] Responsive design working across viewports
- [ ] Hover states and animations smooth
- [ ] Typography and spacing consistent with luxury aesthetic

Generated: ${new Date().toLocaleString()}
`;
    
    await require('fs').promises.writeFile('visual-testing-report.md', report);
    
  } catch (error) {
    console.error('❌ Error during visual testing:', error);
  } finally {
    await browser.close();
  }
}

testChefMapVisuals();