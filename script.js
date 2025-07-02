// Chart Data Scraper for Scalable Capital - Direct element interaction
async function scrapeChartData() {
    const STEP_SIZE = 2; // pixels between each position
    const DELAY_MS = 50; // shorter delay since we're not waiting for mouse movement
    const data = [];
    const seenDataPoints = new Set();
    
    console.log('🔍 Looking for chart elements...');
    
    // Find the chart container and interactive elements
    let chartContainer = null;
    let interactiveElements = [];
    
    // Try different selectors for Scalable Capital charts
    const chartSelectors = [
        'svg', // Most financial charts use SVG
        '[data-testid*="chart"]',
        '.recharts-wrapper',
        '.chart-container',
        'canvas'
    ];
    
    for (const selector of chartSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 200 && rect.height > 100) { // Reasonable chart size
                chartContainer = element;
                console.log(`📊 Found chart container: ${selector}`);
                break;
            }
        }
        if (chartContainer) break;
    }
    
    if (!chartContainer) {
        console.error('❌ Chart container not found. Please check the page structure.');
        return;
    }
    
    // Get chart boundaries
    const rect = chartContainer.getBoundingClientRect();
    const startX = rect.left + 10;
    const endX = rect.right - 10;
    const centerY = rect.top + rect.height / 2;
    
    console.log(`📐 Chart area: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    console.log(`🎯 Scanning from X=${Math.round(startX)} to X=${Math.round(endX)}`);
    
    // Function to get current tooltip data
    function getCurrentData() {
        const timestamps = document.querySelectorAll('[data-testid="labelTextDate"]');
        const prices = document.querySelectorAll('[data-testid="labelTextPrice"]');
        
        if (timestamps.length > 0 && prices.length > 0) {
            const date = timestamps[0].textContent.trim();
            const price = prices[0].textContent.trim();
            return { date, price };
        }
        return null;
    }
    
    // Function to trigger hover at specific coordinates
    async function triggerHoverAt(x, y) {
        // Calculate relative position within the chart
        const relativeX = x - rect.left;
        const relativeY = y - rect.top;
        
        // Create mouse events
        const events = ['mouseenter', 'mouseover', 'mousemove'];
        
        for (const eventType of events) {
            const event = new MouseEvent(eventType, {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1
            });
            
            // Dispatch to chart container
            chartContainer.dispatchEvent(event);
            
            // Also try dispatching to any SVG elements inside
            const svgElements = chartContainer.querySelectorAll('*');
            svgElements.forEach(el => {
                if (el.getBoundingClientRect().width > 0) {
                    el.dispatchEvent(event);
                }
            });
        }
        
        // Wait for tooltip to update
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    console.log('🚀 Starting data collection...');
    let collectedCount = 0;
    let lastLoggedProgress = 0;
    
    // Scan across the chart
    for (let x = startX; x <= endX; x += STEP_SIZE) {
        await triggerHoverAt(x, centerY);
        
        const currentData = getCurrentData();
        if (currentData && currentData.date && currentData.price) {
            const dataKey = `${currentData.date}_${currentData.price}`;
            if (!seenDataPoints.has(dataKey)) {
                seenDataPoints.add(dataKey);
                data.push({
                    date: currentData.date,
                    price: currentData.price
                });
                collectedCount++;
                
                // Log new data points
                if (collectedCount <= 10 || collectedCount % 5 === 0) {
                    console.log(`📈 Point ${collectedCount}: ${currentData.date} - ${currentData.price}`);
                }
            }
        }
        
        // Progress updates
        const progress = Math.round(((x - startX) / (endX - startX)) * 100);
        if (progress >= lastLoggedProgress + 10) {
            console.log(`⏳ Progress: ${progress}% (${collectedCount} points found)`);
            lastLoggedProgress = progress;
        }
    }
    
    console.log('\n✅ Collection completed!');
    console.log(`📊 Total unique data points: ${data.length}`);
    
    // Sort data by date (attempt to parse dates for proper sorting)
    data.sort((a, b) => {
        try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        } catch {
            return a.date.localeCompare(b.date);
        }
    });
    
    return data;
}

// Function to export data as CSV
function exportToCSV(data, filename = 'scalable_capital_data.csv') {
    if (!data || data.length === 0) {
        console.error('❌ No data to export');
        return;
    }
    
    // Create CSV content
    const csvHeader = 'Date,Price';
    const csvRows = data.map(row => {
        // Clean the price (remove currency symbols, spaces)
        const cleanPrice = row.price.replace(/[€$£¥,\s]/g, '').replace(/\./g, '.');
        return `"${row.date}","${cleanPrice}"`;
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`💾 CSV exported as: ${filename}`);
    console.log(`📝 Contains ${data.length} rows`);
    
    // Also log the CSV content to console for copying
    console.log('\n📋 CSV Content (copy if download doesn\'t work):');
    console.log(csvContent);
}

// Main execution function
async function runScraper() {
    console.log('🎬 Starting Scalable Capital chart scraper...');
    console.log('📌 Make sure the chart page is loaded and visible');
    
    try {
        const data = await scrapeChartData();
        
        if (data && data.length > 0) {
            // Store in global variable
            window.scrapedData = data;
            
            // Show sample data
            console.log('\n📋 Sample of collected data:');
            console.table(data.slice(0, 5));
            
            // Automatically export to CSV
            exportToCSV(data);
            
            console.log('\n🎉 Scraping completed successfully!');
            console.log('💡 Data stored in window.scrapedData');
            console.log('💡 CSV file should be downloading automatically');
            
        } else {
            console.error('❌ No data was collected. Check if:');
            console.error('   - The chart is visible on screen');
            console.error('   - Tooltips appear when you hover manually');
            console.error('   - The page is fully loaded');
        }
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
    }
}

// Alternative manual trigger function if automatic doesn't work
function manualTrigger() {
    console.log('🔧 Manual trigger mode - hover over chart points manually');
    console.log('📝 Each time you hover, data will be collected');
    
    const data = [];
    const seenDataPoints = new Set();
    
    function collectCurrentData() {
        const timestamps = document.querySelectorAll('[data-testid="labelTextDate"]');
        const prices = document.querySelectorAll('[data-testid="labelTextPrice"]');
        
        if (timestamps.length > 0 && prices.length > 0) {
            const date = timestamps[0].textContent.trim();
            const price = prices[0].textContent.trim();
            const dataKey = `${date}_${price}`;
            
            if (!seenDataPoints.has(dataKey)) {
                seenDataPoints.add(dataKey);
                data.push({ date, price });
                console.log(`✅ Collected: ${date} - ${price} (Total: ${data.length})`);
            }
        }
        
        window.manualData = data;
    }
    
    // Set up interval to check for new data
    const interval = setInterval(collectCurrentData, 200);
    
    console.log('🎯 Move your mouse over the chart to collect data');
    console.log('⏹️  Run clearInterval(' + interval + ') to stop');
    console.log('💾 Run exportToCSV(window.manualData) to export when done');
    
    return interval;
}

// Start the scraper
runScraper();
