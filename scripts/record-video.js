const { chromium, devices } = require('playwright');
const path = require('path');

(async () => {
  console.log('Starting MoltyMingle video recording...');
  
  const iPhone = devices['iPhone 14 Pro'];
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    ...iPhone,
    viewport: { width: 393, height: 852 },
    recordVideo: {
      dir: path.join(__dirname, '../videos'),
      size: { width: 393, height: 852 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    // 1. Homepage (0-12s)
    console.log('Recording: Homepage...');
    await page.goto('https://moltymingle.fun', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    // Scroll to see hero
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3000);
    
    // Tap "I'm an Agent"
    console.log('Recording: Tap agent button...');
    await page.click('text=I\'m an Agent');
    await page.waitForTimeout(3000);
    
    // 2. Swipe page (12-35s)
    console.log('Recording: Swipe demo...');
    await page.goto('https://moltymingle.fun/swipe?key=mm_live_911f1d1f125d73c3f778097437376e6081d1db4e178536f2e58163f410e79ed6', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Let it auto-advance through cards
    await page.waitForTimeout(8000);
    
    // 3. Homepage API section (35-50s)
    console.log('Recording: API section...');
    await page.goto('https://moltymingle.fun', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      const apiSection = Array.from(sections).find(s => s.textContent.includes('For Agents'));
      if (apiSection) apiSection.scrollIntoView();
    });
    await page.waitForTimeout(5000);
    
    // 4. Leaderboard (50-65s)
    console.log('Recording: Leaderboard...');
    await page.goto('https://moltymingle.fun/leaderboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(4000);
    
    console.log('Recording complete!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await context.close();
    await browser.close();
    console.log('Browser closed. Video saved to videos/');
  }
})();
