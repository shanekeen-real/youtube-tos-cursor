import { test, expect } from '@playwright/test';

test('User can analyze a YouTube URL and see results', async ({ page }) => {
  // 1. Go to the homepage
  await page.goto('/');

  // 2. Verify we're on the homepage with the correct title
  await expect(page).toHaveTitle(/YouTube TOS/);

  // 3. Click the "Analyze by URL" toggle button
  await page.click('button:has-text("Analyze by URL")');

  // 4. Enter a YouTube URL in the input field
  const urlInput = page.locator('#url-input');
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // 5. Click the "Full Report" button
  await page.click('button:has-text("Full Report")');

  // 6. Wait for navigation to the results page
  // The URL should contain scanId parameter
  await page.waitForURL(/\/results\?scanId=/);

  // 7. Check that the results page displays key elements
  await expect(page.locator('h1')).toHaveText(/Scan Results/);
  
  // 8. Verify risk score and risk level are displayed
  await expect(page.locator('text=Risk Score')).toBeVisible();
  await expect(page.locator('text=Risk Level')).toBeVisible();
  
  // 9. Check that content title is shown
  await expect(page.locator('text=Content Title')).toBeVisible();

  // 10. Verify policy category analysis section exists
  await expect(page.locator('text=Policy Category Analysis')).toBeVisible();

  // 11. Check that at least one policy category is displayed
  // Look for any category with a risk score percentage
  await expect(page.locator('text=/\\d+%/')).toBeVisible();

  console.log('✅ E2E test completed successfully - user can analyze YouTube URL and view results');
});

test('User can analyze text content and see results', async ({ page }) => {
  // 1. Go to the homepage
  await page.goto('/');

  // 2. Ensure we're in text analysis mode (default)
  await page.click('button:has-text("Analyze by Text")');

  // 3. Enter sample text content
  const textInput = page.locator('#tos-input');
  await textInput.fill('This is a sample text content for testing policy analysis.');

  // 4. Click the "Full Report" button
  await page.click('button:has-text("Full Report")');

  // 5. Wait for navigation to the results page
  await page.waitForURL(/\/results\?scanId=/);

  // 6. Verify results page elements
  await expect(page.locator('h1')).toHaveText(/Scan Results/);
  await expect(page.locator('text=Risk Score')).toBeVisible();

  console.log('✅ Text analysis E2E test completed successfully');
});

test('User can perform free scan with text content', async ({ page }) => {
  // 1. Go to the homepage
  await page.goto('/');

  // 2. Ensure we're in text analysis mode
  await page.click('button:has-text("Analyze by Text")');

  // 3. Enter sample text content
  const textInput = page.locator('#tos-input');
  await textInput.fill('This is a sample text content for testing free scan.');

  // 4. Click the "Free Scan" button
  await page.click('button:has-text("Free Scan")');

  // 5. Wait for the free scan result to appear (inline, no redirect)
  await expect(page.locator('text=/\\d+%/')).toBeVisible();

  // 6. Verify the free scan result card is displayed
  await expect(page.locator('text=Policy Analysis')).toBeVisible();

  console.log('✅ Free scan E2E test completed successfully');
}); 