import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/TV Chef Map/);
  });

  test('should display the main navigation', async ({ page }) => {
    // Test for common navigation elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should have a search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      await searchInput.first().fill('pizza');
      await expect(searchInput.first()).toHaveValue('pizza');
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

  test('should not have any console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for any lazy-loaded content
    await page.waitForTimeout(2000);
    
    expect(consoleErrors.length).toBe(0);
  });
});