// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Time My Talk - UI Smoke Tests
 * 
 * These tests validate basic functionality to prevent regressions.
 * They cover the core user flows: loading, starting timer, controls, and stopping.
 */

test.describe('Time My Talk - Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Load', () => {
    test('should load the application successfully', async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle('Time My Talk');
      
      // Verify main elements are visible
      await expect(page.locator('#agenda')).toBeVisible();
      await expect(page.locator('#run-meeting-button')).toBeVisible();
      await expect(page.locator('#theme-toggle')).toBeVisible();
    });

    test('should display placeholder text in agenda textarea', async ({ page }) => {
      const textarea = page.locator('#agenda');
      await expect(textarea).toHaveAttribute('placeholder', /Introduction/);
    });

    test('should have example links visible', async ({ page }) => {
      await expect(page.locator('text=Lightning talk')).toBeVisible();
      await expect(page.locator('text=45-minute talk')).toBeVisible();
    });
  });

  test.describe('Theme Toggle', () => {
    test('should toggle theme when clicking theme button', async ({ page }) => {
      const html = page.locator('html');
      const themeButton = page.locator('#theme-toggle');
      
      // Get initial theme
      const initialTheme = await html.getAttribute('data-theme');
      
      // Click theme toggle
      await themeButton.click();
      
      // Theme should change
      const newTheme = await html.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  test.describe('Timer Start', () => {
    test('should start timer when GO button is clicked with valid agenda', async ({ page }) => {
      // Enter a simple agenda
      const agenda = page.locator('#agenda');
      await agenda.fill('00:00 Introduction\n00:30 Main topic\n01:00 FINISH');
      
      // Click GO button
      await page.locator('#run-meeting-button').click();
      
      // Timer should be visible
      await expect(page.locator('#ticker')).toBeVisible();
      
      // Ticker controls should be visible
      await expect(page.locator('#ticker-controls')).toBeVisible();
      
      // Pause button should be visible
      await expect(page.locator('#pause-button')).toBeVisible();
    });

    test('should display agenda items in ticker', async ({ page }) => {
      // Enter agenda
      await page.locator('#agenda').fill('00:00 Introduction\n00:30 Main topic\n01:00 FINISH');
      
      // Start timer
      await page.locator('#run-meeting-button').click();
      
      // Wait for ticker to be visible
      await expect(page.locator('#ticker')).toBeVisible();
      
      // Agenda items should be displayed (FINISH is not shown as a separate item)
      await expect(page.locator('.agenda-item')).toHaveCount(2);
    });

    test('should show ticker when timer starts', async ({ page }) => {
      await page.locator('#agenda').fill('00:00 Test\n01:00 FINISH');
      await page.locator('#run-meeting-button').click();
      
      // Ticker should be visible
      await expect(page.locator('#ticker')).toBeVisible();
      await expect(page.locator('#ticker-controls')).toBeVisible();
    });
  });

  test.describe('Timer Controls', () => {
    test.beforeEach(async ({ page }) => {
      // Start timer for control tests
      await page.locator('#agenda').fill('00:00 Section 1\n00:30 Section 2\n01:00 FINISH');
      await page.locator('#run-meeting-button').click();
      await expect(page.locator('#ticker')).toBeVisible();
    });

    test('should pause and resume timer', async ({ page }) => {
      const pauseButton = page.locator('#pause-button');
      
      // Click pause
      await pauseButton.click();
      
      // Button should show "Resume"
      await expect(pauseButton).toContainText('Resume');
      
      // Paused badge should appear
      await expect(page.locator('#paused-badge')).toBeVisible();
      
      // Click resume
      await pauseButton.click();
      
      // Button should show "Pause"
      await expect(pauseButton).toContainText('Pause');
      
      // Paused badge should be hidden
      await expect(page.locator('#paused-badge')).toBeHidden();
    });

    test('should add time when + button is clicked', async ({ page }) => {
      const addButton = page.locator('#add-time-btn');
      
      // Button should be visible and clickable
      await expect(addButton).toBeVisible();
      await addButton.click();
      
      // No error should occur (basic smoke test)
      await expect(page.locator('#ticker')).toBeVisible();
    });

    test('should subtract time when - button is clicked', async ({ page }) => {
      const subtractButton = page.locator('#subtract-time-btn');
      
      // Button should be visible and clickable
      await expect(subtractButton).toBeVisible();
      await subtractButton.click();
      
      // No error should occur (basic smoke test)
      await expect(page.locator('#ticker')).toBeVisible();
    });

    test('should close timer when X is clicked', async ({ page }) => {
      // Click close button
      await page.locator('#close-ticker').click();
      
      // Timer should be hidden
      await expect(page.locator('#ticker')).toBeHidden();
      
      // Input area should be visible again
      await expect(page.locator('#textarea-wrapper')).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#agenda').fill('00:00 Section 1\n00:30 Section 2\n01:00 FINISH');
      await page.locator('#run-meeting-button').click();
      await expect(page.locator('#ticker')).toBeVisible();
    });

    test('should toggle pause with Space key', async ({ page }) => {
      // Click on ticker to ensure focus is not on any input
      await page.locator('#ticker').click();
      await page.waitForTimeout(100);
      
      // Press Space to pause
      await page.keyboard.press('Space');
      
      // Should be paused - check for Resume text in button
      await expect(page.locator('#pause-button .button-text')).toHaveText('Resume');
      
      // Press Space to resume
      await page.keyboard.press('Space');
      
      // Should be running
      await expect(page.locator('#pause-button .button-text')).toHaveText('Pause');
    });

    test('should close timer with Escape key', async ({ page }) => {
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Timer should be hidden
      await expect(page.locator('#ticker')).toBeHidden();
    });

    test('should show help overlay with ? key', async ({ page }) => {
      // Click on ticker to ensure focus is not on any input
      await page.locator('#ticker').click();
      await page.waitForTimeout(100);
      
      // Press ? (Shift + /)
      await page.keyboard.press('Shift+Slash');
      
      // Help overlay should be visible
      await expect(page.locator('#keyboard-help-overlay')).toHaveClass(/visible/);
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      
      // Help overlay should not have visible class
      await expect(page.locator('#keyboard-help-overlay')).not.toHaveClass(/visible/);
    });
  });

  test.describe('Example Links', () => {
    test('should load lightning talk example', async ({ page }) => {
      // Click lightning talk link
      await page.locator('text=Lightning talk').click();
      
      // Wait for URL hash to be processed
      await page.waitForTimeout(200);
      
      // Agenda should be populated
      const agendaValue = await page.locator('#agenda').inputValue();
      expect(agendaValue.length).toBeGreaterThan(0);
      expect(agendaValue).toContain('FINISH');
    });

    test('should load 45-minute talk example', async ({ page }) => {
      // Click 45-minute talk link
      await page.locator('text=45-minute talk').click();
      
      // Wait for URL hash to be processed
      await page.waitForTimeout(200);
      
      // Agenda should be populated with content ending in FINISH
      const agendaValue = await page.locator('#agenda').inputValue();
      expect(agendaValue.length).toBeGreaterThan(0);
      expect(agendaValue).toContain('FINISH');
    });
  });

  test.describe('URL Sharing', () => {
    test('should have share URL button', async ({ page }) => {
      await expect(page.locator('#share-url')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Main elements should still be visible
      await expect(page.locator('#agenda')).toBeVisible();
      await expect(page.locator('#run-meeting-button')).toBeVisible();
      
      // Start timer
      await page.locator('#agenda').fill('00:00 Test\n01:00 FINISH');
      await page.locator('#run-meeting-button').click();
      
      // Timer should work on mobile
      await expect(page.locator('#ticker')).toBeVisible();
      await expect(page.locator('#pause-button')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper aria labels on buttons', async ({ page }) => {
      await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Toggle theme');
      
      // Start timer to check control buttons
      await page.locator('#agenda').fill('00:00 Test\n01:00 FINISH');
      await page.locator('#run-meeting-button').click();
      
      await expect(page.locator('#pause-button')).toHaveAttribute('aria-label', 'Pause/Resume timer');
      await expect(page.locator('#add-time-btn')).toHaveAttribute('aria-label', 'Add 30 seconds');
      await expect(page.locator('#subtract-time-btn')).toHaveAttribute('aria-label', 'Subtract 30 seconds');
    });
  });
});
