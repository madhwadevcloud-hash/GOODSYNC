const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] || '.';
const oldName = /GOODSYNK ERP/g;
const newName = 'GOODSYNK ERP';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
                walk(fullPath);
            }
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            const skipExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.exe', '.dll', '.lock', '.json']; 
            // I'll skip .json and .lock just in case, but maybe I should check package.json
            if (!skipExts.includes(ext)) {
                try {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('GOODSYNK ERP')) {
                        content = content.replace(oldName, newName);
                        fs.writeFileSync(fullPath, content, 'utf8');
                        console.log(`Updated: ${fullPath}`);
                    }
                } catch (e) {
                    // console.error(`Error reading ${fullPath}: ${e.message}`);
                }
            } else if (ext === '.json' && file === 'package.json') {
                // Special case for package.json to update name if it was GOODSYNK ERP (though it's usually institute-erp-app)
                try {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('GOODSYNK ERP')) {
                        content = content.replace(oldName, newName);
                        fs.writeFileSync(fullPath, content, 'utf8');
                        console.log(`Updated: ${fullPath}`);
                    }
                } catch (e) {}
            }
        }
    }
}

walk(rootDir);
