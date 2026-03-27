const fs = require('fs');
const path = require('path');

// Configuration - you can also load this from a config file
const config = {
    targetFolder: './', // Change this
    excludeDirs: [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.cache',
        'logs',
        'tmp',
        '.vscode',
        '.idea'
    ],
    excludeFiles: [
        '.DS_Store',
        '*.log',
        '*.lock',
        'package-lock.json',
        'yarn.lock'
    ],
    allowedExtensions: [
        '.js', '.jsx', '.ts', '.tsx',  // JavaScript/TypeScript files
        '.vue',                         // Vue files
        '.json',                         // JSON files
        '.md', '.markdown',               // Markdown files
        '.html', '.htm',                   // HTML files
        '.css', '.scss', '.sass', '.less', // Stylesheets
        '.yml', '.yaml',                   // YAML files
        '.txt',                            // Text files
        '.sh', '.bash',                     // Shell scripts
        '.bat', '.cmd',                       // Batch files (optional)
        '.cjs', '.mjs'                        // CommonJS and ES modules
    ],
    verbose: true,  // Show detailed output
    dryRun: false   // Set to true to only show what would be changed without actually changing
};

function matchesExcludePattern(filePath, patterns) {
    const fileName = path.basename(filePath);
    return patterns.some(pattern => {
        if (pattern.includes('*')) {
            // Simple wildcard pattern matching
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(fileName);
        }
        return fileName === pattern;
    });
}

function shouldExcludeDir(dirPath) {
    const dirName = path.basename(dirPath);
    return config.excludeDirs.includes(dirName);
}

function shouldExcludeFile(filePath) {
    return matchesExcludePattern(filePath, config.excludeFiles);
}

function convertToLF(filePath, dryRun = false) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('\r\n')) {
            if (!dryRun) {
                content = content.replace(/\r\n/g, '\n');
                fs.writeFileSync(filePath, content, 'utf8');
            }
            return true;
        }
        return false;
    } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
        return false;
    }
}

function walkDir(dir) {
    let stats = {
        totalProcessed: 0,
        totalConverted: 0,
        skippedDirs: 0,
        skippedFiles: 0,
        errors: []
    };
    
    try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            
            try {
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    if (shouldExcludeDir(filePath)) {
                        if (config.verbose) {
                            console.log(`⏭️  Skipping directory: ${filePath}`);
                        }
                        stats.skippedDirs++;
                    } else {
                        const subStats = walkDir(filePath);
                        stats.totalProcessed += subStats.totalProcessed;
                        stats.totalConverted += subStats.totalConverted;
                        stats.skippedDirs += subStats.skippedDirs;
                        stats.skippedFiles += subStats.skippedFiles;
                        stats.errors.push(...subStats.errors);
                    }
                } else {
                    stats.totalProcessed++;
                    
                    // Check if file should be excluded
                    if (shouldExcludeFile(filePath)) {
                        if (config.verbose) {
                            console.log(`⏭️  Skipping excluded file: ${filePath}`);
                        }
                        stats.skippedFiles++;
                        return;
                    }
                    
                    // Check file extension
                    const ext = path.extname(filePath).toLowerCase();
                    if (config.allowedExtensions.includes(ext)) {
                        const converted = convertToLF(filePath, config.dryRun);
                        if (converted) {
                            stats.totalConverted++;
                            if (config.verbose) {
                                console.log(`${config.dryRun ? '🔍 Would convert' : '✅ Converted'}: ${filePath}`);
                            }
                        } else if (config.verbose) {
                            console.log(`ℹ️  No CRLF found: ${filePath}`);
                        }
                    } else {
                        if (config.verbose) {
                            console.log(`⏭️  Skipping file (extension not allowed): ${filePath}`);
                        }
                        stats.skippedFiles++;
                    }
                }
            } catch (err) {
                stats.errors.push({ file: filePath, error: err.message });
            }
        });
    } catch (err) {
        stats.errors.push({ dir, error: err.message });
    }
    
    return stats;
}

// Main execution
console.log('🔍 Starting line ending conversion...');
console.log('📋 Configuration:');
console.log(`   📁 Target folder: ${config.targetFolder}`);
console.log(`   🚫 Excluded directories: ${config.excludeDirs.join(', ')}`);
console.log(`   🚫 Excluded files: ${config.excludeFiles.join(', ')}`);
console.log(`   📄 Allowed extensions: ${config.allowedExtensions.join(', ')}`);
console.log(`   🔧 Dry run mode: ${config.dryRun ? 'ON' : 'OFF'}`);
console.log('-----------------------------------');

const startTime = Date.now();

if (!fs.existsSync(config.targetFolder)) {
    console.error(`❌ Error: Target folder "${config.targetFolder}" does not exist!`);
    process.exit(1);
}

const stats = walkDir(config.targetFolder);
const endTime = Date.now();

console.log('-----------------------------------');
console.log(`✅ ${config.dryRun ? 'Dry run' : 'Conversion'} complete!`);
console.log('📊 Statistics:');
console.log(`   - Total files processed: ${stats.totalProcessed}`);
console.log(`   - Files ${config.dryRun ? 'to be converted' : 'converted'}: ${stats.totalConverted}`);
console.log(`   - Files unchanged: ${stats.totalProcessed - stats.totalConverted}`);
console.log(`   - Directories skipped: ${stats.skippedDirs}`);
console.log(`   - Files skipped: ${stats.skippedFiles}`);
console.log(`   - Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach(err => {
        console.log(`   - ${err.file || err.dir}: ${err.error}`);
    });
}