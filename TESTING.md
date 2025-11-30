# Testing Guide - TV Chef Map

This project uses Playwright for end-to-end testing, providing comprehensive browser automation and testing capabilities.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with interactive UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser windows)
npm run test:e2e:headed

# Run tests with debugging
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── tests/              # Test files
│   ├── homepage.spec.ts
│   └── restaurant-map.spec.ts
├── fixtures/           # Test data and utilities
│   └── test-data.ts
├── global-setup.ts     # Global test setup
playwright.config.ts    # Playwright configuration
```

## Available Test Scripts

- **`npm run test:e2e`** - Run all tests headlessly across configured browsers
- **`npm run test:e2e:ui`** - Launch Playwright's UI mode for interactive test development
- **`npm run test:e2e:headed`** - Run tests with visible browser windows
- **`npm run test:e2e:debug`** - Run tests in debug mode with inspector
- **`npm run test:e2e:report`** - Open the HTML test report

## Test Configuration

The project is configured to test across multiple browsers and devices:

### Browsers
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox) 
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### Features
- **Base URL**: http://localhost:3003
- **Automatic dev server**: Starts development server before tests
- **Screenshot on failure**: Captures screenshots when tests fail
- **Video recording**: Records videos for failed tests
- **Trace collection**: Collects execution traces for debugging

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Using Test Data

```typescript
import { testChefs, mockRestaurant } from '../fixtures/test-data';

test('should search for chef restaurants', async ({ page }) => {
  await page.fill('[data-testid="search"]', testChefs[0].name);
  // ... rest of test
});
```

### Common Patterns

#### Testing Map Components
```typescript
test('should display map', async ({ page }) => {
  const map = page.locator('.leaflet-container, #map');
  await expect(map).toBeVisible();
});
```

#### Testing Restaurant Cards
```typescript
test('should display restaurant cards', async ({ page }) => {
  const cards = page.locator('[data-testid="restaurant-card"]');
  await expect(cards.first()).toBeVisible();
});
```

#### Testing Search and Filters
```typescript
test('should filter restaurants', async ({ page }) => {
  await page.selectOption('[data-testid="city-filter"]', 'Chicago');
  await expect(page.locator('.restaurant-card')).toContainText('Chicago');
});
```

## Debugging Tests

### Interactive Mode
```bash
npm run test:e2e:ui
```
Opens Playwright's UI for running and debugging tests interactively.

### Debug Mode
```bash
npm run test:e2e:debug
```
Runs tests with the Playwright Inspector for step-by-step debugging.

### Visual Debugging
- Screenshots are automatically captured on test failures
- Videos are recorded for failed tests
- Traces can be viewed in the Playwright trace viewer

## Visual Testing

For comprehensive visual testing, use the existing visual testing script:

```bash
node visual-testing.js
```

This script captures screenshots across different viewports and interaction states.

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on single functionality

### Selectors
1. **Prefer data-testid**: `[data-testid="element-name"]`
2. **Semantic selectors**: `role=button`, `role=navigation`
3. **Text-based**: `page.getByText('Submit')`
4. **Avoid CSS classes**: They change frequently

### Waiting Strategies
```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="map"]');

// Wait for function
await page.waitForFunction(() => window.mapLoaded === true);
```

### Error Handling
```typescript
test('should handle errors gracefully', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  
  await page.goto('/');
  expect(errors).toHaveLength(0);
});
```

## Continuous Integration

The test configuration is CI-ready:
- Retries failed tests 2x on CI
- Runs in parallel
- Generates reports and artifacts
- Configured for headless execution

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in `playwright.config.ts`
- Use proper waiting strategies instead of fixed timeouts

**Flaky tests**
- Add proper waits for dynamic content
- Use `networkidle` load state
- Check for race conditions

**Element not found**
- Verify selectors in browser dev tools
- Check if element is rendered conditionally
- Ensure page has loaded completely

### Getting Help
- Check browser console for JavaScript errors
- Use `--headed` mode to see what's happening
- Review test traces in the HTML report
- Use the Playwright Inspector for debugging