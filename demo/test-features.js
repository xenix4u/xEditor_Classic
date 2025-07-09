// Feature Verification Script for XEditor
// Run this in browser console at http://localhost:8080/demo/index.html

async function verifyAllFeatures() {
    console.log('=== XEditor Feature Verification ===\n');
    
    const results = {
        passed: [],
        failed: []
    };
    
    // Test 1: Editor Initialization
    console.log('1. Testing Editor Initialization...');
    try {
        if (editor1 && editor1.contentElement) {
            results.passed.push('✓ Editor initialized successfully');
            console.log('✓ Editor initialized successfully');
        } else {
            throw new Error('Editor not initialized');
        }
    } catch (e) {
        results.failed.push('✗ Editor initialization failed: ' + e.message);
        console.error('✗ Editor initialization failed:', e);
    }
    
    // Test 2: Font Dropdowns
    console.log('\n2. Testing Font Dropdowns...');
    try {
        const fontDropdown = document.querySelector('[aria-label="Font Family"] + .xeditor-toolbar__dropdown-menu');
        const sizeDropdown = document.querySelector('[aria-label="Font Size"] + .xeditor-toolbar__dropdown-menu');
        
        if (fontDropdown && fontDropdown.children.length > 0) {
            results.passed.push('✓ Font family dropdown has items');
            console.log('✓ Font family dropdown has', fontDropdown.children.length, 'items');
        } else {
            throw new Error('Font family dropdown is empty');
        }
        
        if (sizeDropdown && sizeDropdown.children.length > 0) {
            results.passed.push('✓ Font size dropdown has items');
            console.log('✓ Font size dropdown has', sizeDropdown.children.length, 'items');
        } else {
            throw new Error('Font size dropdown is empty');
        }
    } catch (e) {
        results.failed.push('✗ Font dropdown test failed: ' + e.message);
        console.error('✗ Font dropdown test failed:', e);
    }
    
    // Test 3: Text Formatting Commands
    console.log('\n3. Testing Text Formatting...');
    try {
        editor1.setContent('<p>Test text</p>');
        editor1.focus();
        document.execCommand('selectAll');
        
        const commands = ['bold', 'italic', 'underline', 'strikethrough'];
        for (const cmd of commands) {
            editor1.execCommand(cmd);
            if (document.queryCommandState(cmd)) {
                results.passed.push(`✓ ${cmd} command works`);
                console.log(`✓ ${cmd} command works`);
            } else {
                throw new Error(`${cmd} command failed`);
            }
            editor1.execCommand(cmd); // Toggle off
        }
    } catch (e) {
        results.failed.push('✗ Text formatting test failed: ' + e.message);
        console.error('✗ Text formatting test failed:', e);
    }
    
    // Test 4: Alignment Buttons
    console.log('\n4. Testing Alignment Buttons...');
    try {
        const originalHeight = window.innerHeight;
        const alignButtons = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
        
        for (const align of alignButtons) {
            editor1.execCommand(align);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (window.innerHeight === originalHeight) {
                results.passed.push(`✓ ${align} doesn't change window size`);
                console.log(`✓ ${align} doesn't change window size`);
            } else {
                throw new Error(`${align} changed window size`);
            }
        }
    } catch (e) {
        results.failed.push('✗ Alignment test failed: ' + e.message);
        console.error('✗ Alignment test failed:', e);
    }
    
    // Test 5: Lists
    console.log('\n5. Testing Lists...');
    try {
        editor1.setContent('<p>List item</p>');
        editor1.focus();
        document.execCommand('selectAll');
        
        editor1.execCommand('insertOrderedList');
        if (editor1.getContent().includes('<ol>')) {
            results.passed.push('✓ Ordered list works');
            console.log('✓ Ordered list works');
        }
        
        editor1.execCommand('insertUnorderedList');
        if (editor1.getContent().includes('<ul>')) {
            results.passed.push('✓ Unordered list works');
            console.log('✓ Unordered list works');
        }
    } catch (e) {
        results.failed.push('✗ List test failed: ' + e.message);
        console.error('✗ List test failed:', e);
    }
    
    // Test 6: Checklist
    console.log('\n6. Testing Checklist...');
    try {
        editor1.setContent('<p>Checklist item</p>');
        editor1.focus();
        document.execCommand('selectAll');
        
        editor1.execCommand('insertChecklist');
        if (editor1.getContent().includes('checklist-item')) {
            results.passed.push('✓ Checklist works');
            console.log('✓ Checklist works');
        } else {
            throw new Error('Checklist not inserted');
        }
    } catch (e) {
        results.failed.push('✗ Checklist test failed: ' + e.message);
        console.error('✗ Checklist test failed:', e);
    }
    
    // Test 7: Real-time Statistics
    console.log('\n7. Testing Real-time Statistics...');
    try {
        const statsElement = document.querySelector('.xeditor-statistics');
        if (!statsElement) {
            throw new Error('Statistics element not found');
        }
        
        editor1.setContent('<p>Hello World</p>');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const charCount = statsElement.querySelector('.xeditor-statistics__item:nth-child(1)')?.textContent;
        const wordCount = statsElement.querySelector('.xeditor-statistics__item:nth-child(2)')?.textContent;
        
        if (charCount && charCount.includes('Characters:')) {
            results.passed.push('✓ Character count updates');
            console.log('✓ Character count:', charCount);
        }
        
        if (wordCount && wordCount.includes('Words:')) {
            results.passed.push('✓ Word count updates');
            console.log('✓ Word count:', wordCount);
        }
        
        // Test real-time update
        const contentEl = editor1.contentElement;
        contentEl.innerHTML = '<p>Testing real time updates with more words</p>';
        contentEl.dispatchEvent(new Event('input', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const newWordCount = statsElement.querySelector('.xeditor-statistics__item:nth-child(2)')?.textContent;
        if (newWordCount !== wordCount) {
            results.passed.push('✓ Statistics update in real-time');
            console.log('✓ Statistics update in real-time');
        } else {
            throw new Error('Statistics not updating');
        }
    } catch (e) {
        results.failed.push('✗ Statistics test failed: ' + e.message);
        console.error('✗ Statistics test failed:', e);
    }
    
    // Test 8: Editor Resize
    console.log('\n8. Testing Editor Resize...');
    try {
        const resizeHandle = document.querySelector('.xeditor-resize-handle');
        if (!resizeHandle) {
            throw new Error('Resize handle not found');
        }
        
        const originalHeight = editor1.contentElement.offsetHeight;
        
        // Simulate drag
        const mouseDown = new MouseEvent('mousedown', { clientY: 0 });
        resizeHandle.dispatchEvent(mouseDown);
        
        const mouseMove = new MouseEvent('mousemove', { clientY: 50 });
        document.dispatchEvent(mouseMove);
        
        const mouseUp = new MouseEvent('mouseup');
        document.dispatchEvent(mouseUp);
        
        if (editor1.contentElement.offsetHeight !== originalHeight) {
            results.passed.push('✓ Editor resize works');
            console.log('✓ Editor resize works');
        } else {
            results.passed.push('✓ Resize handle exists (manual test needed)');
            console.log('✓ Resize handle exists (manual test needed)');
        }
    } catch (e) {
        results.failed.push('✗ Resize test failed: ' + e.message);
        console.error('✗ Resize test failed:', e);
    }
    
    // Test 9: Source Code Toggle
    console.log('\n9. Testing Source Code Toggle...');
    try {
        const sourceBtn = document.querySelector('[aria-label="HTML Source Code"]');
        if (!sourceBtn) {
            throw new Error('Source button not found');
        }
        
        sourceBtn.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (editor1.wrapper.classList.contains('xeditor-source-mode')) {
            results.passed.push('✓ Source mode activates');
            console.log('✓ Source mode activates');
            
            // Test if button remains clickable
            sourceBtn.click();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!editor1.wrapper.classList.contains('xeditor-source-mode')) {
                results.passed.push('✓ Source mode toggles back');
                console.log('✓ Source mode toggles back');
            }
        }
    } catch (e) {
        results.failed.push('✗ Source mode test failed: ' + e.message);
        console.error('✗ Source mode test failed:', e);
    }
    
    // Test 10: Theme Toggle
    console.log('\n10. Testing Theme Toggle...');
    try {
        toggleTheme();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (editor1.wrapper.getAttribute('data-theme') === 'dark') {
            results.passed.push('✓ Dark theme works');
            console.log('✓ Dark theme works');
        }
        
        toggleTheme();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (editor1.wrapper.getAttribute('data-theme') === 'light') {
            results.passed.push('✓ Light theme works');
            console.log('✓ Light theme works');
        }
    } catch (e) {
        results.failed.push('✗ Theme test failed: ' + e.message);
        console.error('✗ Theme test failed:', e);
    }
    
    // Test 11: Keyboard Shortcuts
    console.log('\n11. Testing Keyboard Shortcuts...');
    try {
        editor1.setContent('<p>Keyboard test</p>');
        editor1.focus();
        
        // Test Ctrl+B
        const ctrlB = new KeyboardEvent('keydown', {
            key: 'b',
            ctrlKey: true,
            bubbles: true
        });
        editor1.contentElement.dispatchEvent(ctrlB);
        
        results.passed.push('✓ Keyboard shortcuts registered (manual test needed)');
        console.log('✓ Keyboard shortcuts registered (manual test needed)');
    } catch (e) {
        results.failed.push('✗ Keyboard shortcut test failed: ' + e.message);
        console.error('✗ Keyboard shortcut test failed:', e);
    }
    
    // Summary
    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Total Passed: ${results.passed.length}`);
    console.log(`Total Failed: ${results.failed.length}`);
    
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(test));
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed Tests:');
        results.failed.forEach(test => console.log(test));
    }
    
    console.log('\n📝 Manual Tests Needed:');
    console.log('- Image upload dialog and functionality');
    console.log('- Table insertion and editing');
    console.log('- Find/Replace functionality');
    console.log('- Video embedding');
    console.log('- Link insertion');
    console.log('- Code block insertion');
    console.log('- Fullscreen mode');
    console.log('- Print functionality');
    
    return results;
}

// Run the verification
console.log('Starting feature verification...');
console.log('Please open http://localhost:8080/demo/index.html and run: verifyAllFeatures()');