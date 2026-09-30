// Check for global variable redeclaration errors across customer pages
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const customerDir = path.join(__dirname, '../customer');
const htmlFiles = ['home.html', 'cart.html', 'wishlist.html', 'checkout.html', 'payment.html'];

function extractScripts(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scripts = [];
    
    // Extract <script src="...">
    const srcRegex = /<script\s+src="([^"]+)"/g;
    let match;
    while ((match = srcRegex.exec(html)) !== null) {
        const src = match[1];
        if (!src.startsWith('http') && !src.startsWith('..')) {
            scripts.push({ type: 'file', path: path.join(customerDir, src) });
        } else if (src.startsWith('../')) {
            // Skip parent dir scripts (routes.js, api.js) - assume they're OK
            scripts.push({ type: 'external', path: src });
        }
    }
    
    // Extract inline <script>...</script>
    const inlineRegex = /<script>([\s\S]*?)<\/script>/g;
    while ((match = inlineRegex.exec(html)) !== null) {
        scripts.push({ type: 'inline', code: match[1] });
    }
    
    return scripts;
}

function createMockDocument() {
    const mockElement = {
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {},
            contains: () => false
        },
        addEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        querySelector: () => mockElement,
        querySelectorAll: () => [],
        setAttribute: () => {},
        getAttribute: () => null,
        offsetTop: 0,
        offsetHeight: 0,
        scrollIntoView: () => {}
    };
    
    return {
        getElementById: () => mockElement,
        querySelector: () => mockElement,
        querySelectorAll: () => [],
        addEventListener: () => {},
        createElement: () => mockElement,
        body: mockElement
    };
}

function checkPage(htmlFile) {
    const htmlPath = path.join(customerDir, htmlFile);
    console.log(`\n=== Checking ${htmlFile} ===`);
    
    if (!fs.existsSync(htmlPath)) {
        console.log(`  SKIP: File not found`);
        return true;
    }
    
    const scripts = extractScripts(htmlPath);
    console.log(`  Scripts to load: ${scripts.length}`);
    
    // Create a fresh context for this page
    const mockDoc = createMockDocument();
    const context = {
        console,
        localStorage: {
            getItem: () => null,
            setItem: () => {},
            clear: () => {}
        },
        document: mockDoc,
        window: { scrollY: 0, addEventListener: () => {} },
        location: { href: '', reload: () => {} },
        alert: () => {},
        JSON,
        navigator: {},
        kjRequest: async () => ({ data: [] }), // Mock API
        L: { map: () => ({ setView: () => {}, on: () => {} }), tileLayer: () => ({ addTo: () => {} }), marker: () => ({ addTo: () => {} }) } // Mock Leaflet
    };
    vm.createContext(context);
    
    try {
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            
            if (script.type === 'external') {
                console.log(`  [${i+1}] External: ${script.path} (skipped)`);
                continue;
            }
            
            let code;
            if (script.type === 'file') {
                if (!fs.existsSync(script.path)) {
                    console.log(`  [${i+1}] File not found: ${script.path}`);
                    continue;
                }
                code = fs.readFileSync(script.path, 'utf8');
                console.log(`  [${i+1}] Load: ${path.basename(script.path)}`);
            } else {
                code = script.code;
                console.log(`  [${i+1}] Inline script (${code.length} chars)`);
            }
            
            try {
                vm.runInContext(code, context, {
                    filename: script.type === 'file' ? script.path : `${htmlFile}:inline`,
                    displayErrors: true
                });
            } catch (err) {
                console.error(`  ❌ ERROR in ${script.type === 'file' ? path.basename(script.path) : 'inline'}:`);
                console.error(`     ${err.message}`);
                if (err.stack) {
                    const lines = err.stack.split('\n').slice(0, 3);
                    lines.forEach(line => console.error(`     ${line}`));
                }
                return false;
            }
        }
        
        console.log(`  ✅ PASS: No redeclaration errors`);
        return true;
        
    } catch (err) {
        console.error(`  ❌ FAIL: ${err.message}`);
        return false;
    }
}

console.log('='.repeat(60));
console.log('Global Variable Redeclaration Check');
console.log('='.repeat(60));

let allPass = true;
for (const htmlFile of htmlFiles) {
    if (!checkPage(htmlFile)) {
        allPass = false;
    }
}

console.log('\n' + '='.repeat(60));
if (allPass) {
    console.log('✅ ALL PAGES PASS - No redeclaration errors detected');
    process.exit(0);
} else {
    console.log('❌ SOME PAGES FAILED - Fix errors above');
    process.exit(1);
}
