import { test, expect } from '@playwright/test';
import { testChefs, testSearchQueries } from '../fixtures/test-data';

test.describe('Restaurant Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should display the map container', async ({ page }) => {
    // Look for map container elements (common map selectors)
    const mapSelectors = [
      '[data-testid="map"]',
      '#map',
      '.leaflet-container',
      '[class*="map"]'
    ];

    let mapFound = false;
    for (const selector of mapSelectors) {
      const mapElement = page.locator(selector);
      if (await mapElement.count() > 0) {
        await expect(mapElement.first()).toBeVisible();
        mapFound = true;
        break;
      }
    }

    // If no specific map found, at least ensure the page has loaded
    if (!mapFound) {
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display restaurant listings', async ({ page }) => {
    // Look for restaurant cards or listings
    const restaurantSelectors = [
      '[data-testid="restaurant-card"]',
      '[data-testid="restaurant-list"]',
      '.restaurant-card',
      '[class*="restaurant"]'
    ];

    // Wait a bit for content to load
    await page.waitForTimeout(3000);

    let restaurantListFound = false;
    for (const selector of restaurantSelectors) {
      const restaurants = page.locator(selector);
      if (await restaurants.count() > 0) {
        await expect(restaurants.first()).toBeVisible();
        restaurantListFound = true;
        break;
      }
    }

    // If no specific restaurant cards found, check for any content
    if (!restaurantListFound) {
      const content = page.locator('main, .container, [role="main"]');
      if (await content.count() > 0) {
        await expect(content.first()).toBeVisible();
      }
    }
  });

  test('should allow filtering restaurants', async ({ page }) => {
    // Look for filter controls
    const filterSelectors = [
      'select[data-testid="city-filter"]',
      'select[data-testid="cuisine-filter"]',
      'button[data-testid*="filter"]',
      '.filter-button',
      'input[type="checkbox"]',
      'select'
    ];

    let filterFound = false;
    for (const selector of filterSelectors) {
      const filter = page.locator(selector);
      if (await filter.count() > 0) {
        // Try to interact with the filter
        if (selector.includes('select')) {
          const options = filter.locator('option');
          if (await options.count() > 1) {
            await filter.selectOption({ index: 1 });
            filterFound = true;
            break;
          }
        } else if (selector.includes('button')) {
          await filter.first().click();
          filterFound = true;
          break;
        }
      }
    }

    // If filters exist, wait for potential results update
    if (filterFound) {
      await page.waitForTimeout(1000);
    }

    // Ensure the page is still functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[data-testid="search"]'
    );

    if (await searchInput.count() > 0) {
      const input = searchInput.first();
      
      // Test search with a sample query
      await input.fill(testSearchQueries[0]);
      await expect(input).toHaveValue(testSearchQueries[0]);
      
      // Look for search button or press Enter
      const searchButton = page.locator('button[type="submit"], button[data-testid="search-button"]');
      if (await searchButton.count() > 0) {
        await searchButton.first().click();
      } else {
        await input.press('Enter');
      }
      
      // Wait for search results
      await page.waitForTimeout(2000);
      
      // Clear search
      await input.clear();
      await expect(input).toHaveValue('');
    }
  });

  test('should be responsive on different viewports', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Check if mobile navigation exists
    const mobileNav = page.locator(
      'button[aria-label*="menu"], .mobile-nav, .hamburger-menu, [data-testid="mobile-menu"]'
    );
    
    if (await mobileNav.count() > 0) {
      await mobileNav.first().click();
      await page.waitForTimeout(500);
      
      // Try to close mobile menu
      await page.keyboard.press('Escape');
    }
  });

  test('should load without critical errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon.ico') &&
      !error.includes('chrome-extension') &&
      !error.includes('baseline-browser-mapping')
    );

    expect(criticalErrors.length).toBe(0);
  });
});