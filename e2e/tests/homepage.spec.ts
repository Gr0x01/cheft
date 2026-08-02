import { test, expect } from '@playwright/test';
import { nonCriticalConsolePatterns } from '../fixtures/test-data';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Cheft/);
  });

  test('should display the main navigation', async ({ page }) => {
    await expect(page.locator('header, nav, [role="banner"]').first()).toBeVisible();
  });

  test('should have a search functionality', async ({ page }) => {
    // Look for search input
    // The page ships separate mobile and desktop search inputs, only one of which
    // the current viewport reveals — match on visibility rather than DOM order.
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .filter({ visible: true });

    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      // Retry the fill: text typed before React hydrates never reaches component
      // state, and the first post-hydration render clears the input again.
      await expect(async () => {
        await searchInput.first().fill('pizza');
        await expect(searchInput.first()).toHaveValue('pizza', { timeout: 1000 });
      }).toPass({ timeout: 15000 });
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check for mobile-friendly layout
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(768);
      
      // Ensure content is visible on mobile
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should not have any console errors', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    // Not 'networkidle' — streaming map tiles mean the network never goes quiet.
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    await context.close();
    
    const criticalErrors = consoleErrors.filter(error =>
      !nonCriticalConsolePatterns.some(pattern => error.includes(pattern))
    );
    
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});