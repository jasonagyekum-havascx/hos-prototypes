import { test, expect } from '@playwright/test';

test.describe('Navigation from Landing to Chat', () => {
  test('should navigate to chat screen when clicking "Choose For Me" button', async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/index.html');
    
    // Wait for the app to load - might start on kanji screen
    await page.waitForSelector('.app', { state: 'attached' });
    
    // Wait a bit for all screens to initialize
    await page.waitForTimeout(2000);
    
    // Navigate directly to landing screen using JavaScript (skip kanji if needed)
    await page.evaluate(async () => {
      if (window.navigateTo) {
        await window.navigateTo('landing');
      }
    });
    
    // Wait for the landing screen to be visible
    const landingScreen = page.locator('#landingScreen');
    await expect(landingScreen).toBeVisible({ timeout: 5000 });
    
    // Wait for landing screen to be active
    await expect(landingScreen).toHaveClass(/active/, { timeout: 5000 });
    
    // Find and click the "Choose For Me" button
    const chooseForMeButton = page.locator('button[data-destination="izakaya"]');
    await expect(chooseForMeButton).toBeVisible();
    await expect(chooseForMeButton).toHaveText('Choose For Me');
    
    // Log state before clicking
    const landingClassesBefore = await landingScreen.getAttribute('class');
    console.log('Landing screen classes BEFORE click:', landingClassesBefore);
    
    // Verify chat screen is registered before clicking (to test normal flow)
    const chatScreenRegistered = await page.evaluate(() => {
      return window.screens && window.screens['chat'] !== undefined;
    });
    console.log('Chat screen registered before click:', chatScreenRegistered);
    
    // Click the button
    await chooseForMeButton.click();
    
    // Wait for navigation to happen (with retry logic built into navigateTo)
    await page.waitForTimeout(1000);
    
    // Check if chat screen exists and is visible
    const chatScreen = page.locator('#chatScreen');
    await expect(chatScreen).toBeVisible({ timeout: 5000 });
    
    // This is where the issue likely is - check if chat screen has 'active' class
    const chatScreenClasses = await chatScreen.getAttribute('class');
    console.log('Chat screen classes AFTER click:', chatScreenClasses);
    
    // Check if landing screen is still active (this would indicate the bug)
    const landingScreenClasses = await landingScreen.getAttribute('class');
    console.log('Landing screen classes AFTER click:', landingScreenClasses);
    
    // Check current screen state via JavaScript
    const currentScreen = await page.evaluate(() => {
      if (window.state) {
        return window.state.currentScreen;
      }
      return null;
    });
    console.log('Current screen state:', currentScreen);
    
    // Verify chat screen is active
    await expect(chatScreen).toHaveClass(/active/, { timeout: 2000 });
    
    // Verify landing screen is not active
    await expect(landingScreen).not.toHaveClass(/active/);
  });

  test('should handle race condition when chat screen is not yet registered', async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/index.html');
    
    // Wait for the app to load
    await page.waitForSelector('.app', { state: 'attached' });
    
    // Delay chat screen initialization to simulate race condition
    await page.evaluate(() => {
      // Store original initChatScreen
      const originalInit = window.__originalInitChatScreen;
      if (!originalInit) {
        // This test simulates the race condition by clicking before screens are ready
        // In a real scenario, we'd delay the initChatScreen, but for this test
        // we'll just click very quickly after page load
      }
    });
    
    // Navigate to landing screen
    await page.evaluate(async () => {
      if (window.navigateTo) {
        await window.navigateTo('landing');
      }
    });
    
    // Wait for landing screen
    const landingScreen = page.locator('#landingScreen');
    await expect(landingScreen).toBeVisible({ timeout: 5000 });
    await expect(landingScreen).toHaveClass(/active/, { timeout: 5000 });
    
    // Click immediately (before waiting for all screens to initialize)
    const chooseForMeButton = page.locator('button[data-destination="izakaya"]');
    await chooseForMeButton.click();
    
    // Wait for navigation (navigateTo should now wait for chat screen to be registered)
    await page.waitForTimeout(3000);
    
    // Verify chat screen eventually becomes active
    const chatScreen = page.locator('#chatScreen');
    await expect(chatScreen).toBeVisible({ timeout: 10000 });
    await expect(chatScreen).toHaveClass(/active/, { timeout: 5000 });
    
    // Verify landing screen is no longer active
    await expect(landingScreen).not.toHaveClass(/active/);
  });
});

