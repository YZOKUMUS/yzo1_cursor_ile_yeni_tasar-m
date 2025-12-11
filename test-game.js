/**
 * TEST GAME - Otomatik Test Scripti
 * Arapça Kelime Öğrenme Sistemi için test yardımcıları
 * 
 * Kullanım: Browser console'da çalıştırın
 * Örnek: testGame.runAllTests()
 */

const testGame = {
    results: [],
    app: null,

    // Test sonuçlarını kaydet
    logResult(testName, passed, message = '') {
        this.results.push({
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message || (passed ? 'PASSED' : 'FAILED')}`);
    },

    // Test başlatma
    init() {
        // LearningSystem instance'ını bul
        if (window.app) {
            this.app = window.app;
        } else {
            console.error('❌ LearningSystem instance bulunamadı!');
            return false;
        }
        return true;
    },

    // Test 1: Initialization Test
    testInitialization() {
        console.log('\n🧪 Test 1: Initialization Test');
        try {
            if (!this.app) {
                this.logResult('Initialization', false, 'App instance bulunamadı');
                return;
            }

            // Check if app is initialized
            const hasWords = Array.isArray(this.app.words);
            const hasProgress = typeof this.app.userProgress === 'object';
            
            this.logResult('Words loaded', hasWords, hasWords ? `${this.app.words.length} kelime yüklendi` : 'Kelime yüklenemedi');
            this.logResult('Progress loaded', hasProgress, hasProgress ? 'Progress yüklendi' : 'Progress yüklenemedi');
            
            // Check initial values
            const initialXP = this.app.userProgress.xp || 0;
            const initialLevel = this.app.userProgress.level || 1;
            const initialHearts = this.app.userProgress.hearts || 5;
            
            this.logResult('Initial XP', initialXP === 0, `XP: ${initialXP}`);
            this.logResult('Initial Level', initialLevel === 1, `Level: ${initialLevel}`);
            this.logResult('Initial Hearts', initialHearts === 5, `Hearts: ${initialHearts}`);
            
        } catch (error) {
            this.logResult('Initialization', false, `Hata: ${error.message}`);
        }
    },

    // Test 2: Gamification Systems Test
    testGamification() {
        console.log('\n🧪 Test 2: Gamification Systems Test');
        try {
            // Test XP System
            const initialXP = this.app.userProgress.xp || 0;
            this.app.addXP(10);
            const newXP = this.app.userProgress.xp || 0;
            this.logResult('XP Addition', newXP === initialXP + 10, `XP: ${initialXP} → ${newXP}`);

            // Test Level Calculation
            const level = this.app.calculateLevel(newXP);
            const expectedLevel = Math.floor(newXP / 100) + 1;
            this.logResult('Level Calculation', level === expectedLevel, `Level: ${level} (Expected: ${expectedLevel})`);

            // Test Hearts System
            const initialHearts = this.app.userProgress.hearts || 5;
            this.app.loseHeart();
            const newHearts = this.app.userProgress.hearts || 0;
            this.logResult('Lose Heart', newHearts === initialHearts - 1, `Hearts: ${initialHearts} → ${newHearts}`);

            // Test Gems System
            const initialGems = this.app.userProgress.gems || 0;
            this.app.userProgress.gems = (this.app.userProgress.gems || 0) + 10;
            this.app.validateGems();
            const newGems = this.app.userProgress.gems || 0;
            this.logResult('Gems Addition', newGems === initialGems + 10, `Gems: ${initialGems} → ${newGems}`);

            // Test Streak System
            const initialStreak = this.app.userProgress.streak || 0;
            this.app.checkDailyStreak();
            const newStreak = this.app.userProgress.streak || 0;
            this.logResult('Streak Check', typeof newStreak === 'number', `Streak: ${newStreak}`);

        } catch (error) {
            this.logResult('Gamification', false, `Hata: ${error.message}`);
        }
    },

    // Test 3: Date and Streak Tracking Test
    testDateTracking() {
        console.log('\n🧪 Test 3: Date and Streak Tracking Test');
        try {
            // Test getLocalDateString
            const today = this.app.getLocalDateString();
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            this.logResult('Date Format', datePattern.test(today), `Today: ${today}`);

            // Test lastStudyDate tracking
            const lastStudyDate = this.app.userProgress.lastStudyDate;
            this.logResult('Last Study Date', typeof lastStudyDate === 'string' || lastStudyDate === null, 
                `Last Study Date: ${lastStudyDate || 'null'}`);

            // Test getTodayActivity
            const activity = this.app.getTodayActivity();
            const hasActivity = typeof activity === 'object' && 
                               typeof activity.wordsLearned === 'number' && 
                               typeof activity.xpGained === 'number';
            this.logResult('Today Activity', hasActivity, 
                `Words: ${activity.wordsLearned}, XP: ${activity.xpGained}`);

        } catch (error) {
            this.logResult('Date Tracking', false, `Hata: ${error.message}`);
        }
    },

    // Test 4: Performance Utilities Test
    testPerformance() {
        console.log('\n🧪 Test 4: Performance Utilities Test');
        try {
            // Test debounce function exists
            const hasDebounce = typeof this.app.debounce === 'function';
            this.logResult('Debounce Function', hasDebounce, hasDebounce ? 'Mevcut' : 'Bulunamadı');

            // Test throttle function exists
            const hasThrottle = typeof this.app.throttle === 'function';
            this.logResult('Throttle Function', hasThrottle, hasThrottle ? 'Mevcut' : 'Bulunamadı');

            // Test animate function exists
            const hasAnimate = typeof this.app.animate === 'function';
            this.logResult('Animate Function', hasAnimate, hasAnimate ? 'Mevcut' : 'Bulunamadı');

            // Test lazy loading observer
            const hasLazyObserver = this.app.lazyObserver !== null && this.app.lazyObserver !== undefined;
            this.logResult('Lazy Loading Observer', hasLazyObserver, hasLazyObserver ? 'Mevcut' : 'Bulunamadı');

        } catch (error) {
            this.logResult('Performance', false, `Hata: ${error.message}`);
        }
    },

    // Test 5: Accessibility Test
    testAccessibility() {
        console.log('\n🧪 Test 5: Accessibility Test');
        try {
            // Test ARIA labels
            const buttons = document.querySelectorAll('button');
            let buttonsWithAria = 0;
            buttons.forEach(btn => {
                if (btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby')) {
                    buttonsWithAria++;
                }
            });
            const ariaRatio = buttons.length > 0 ? (buttonsWithAria / buttons.length) : 0;
            this.logResult('ARIA Labels', ariaRatio > 0.5, 
                `${buttonsWithAria}/${buttons.length} buton ARIA label'a sahip`);

            // Test modal ARIA attributes
            const modals = document.querySelectorAll('.modal');
            let modalsWithAria = 0;
            modals.forEach(modal => {
                if (modal.hasAttribute('role') && modal.hasAttribute('aria-modal')) {
                    modalsWithAria++;
                }
            });
            this.logResult('Modal ARIA', modalsWithAria === modals.length, 
                `${modalsWithAria}/${modals.length} modal ARIA attribute'a sahip`);

            // Test tabindex attributes
            const focusableElements = document.querySelectorAll('[tabindex]');
            this.logResult('Tabindex Attributes', focusableElements.length > 0, 
                `${focusableElements.length} element tabindex'e sahip`);

        } catch (error) {
            this.logResult('Accessibility', false, `Hata: ${error.message}`);
        }
    },

    // Test 6: Error Handling Test
    testErrorHandling() {
        console.log('\n🧪 Test 6: Error Handling Test');
        try {
            // Test escapeHtml function
            const hasEscapeHtml = typeof this.app.escapeHtml === 'function';
            this.logResult('escapeHtml Function', hasEscapeHtml, hasEscapeHtml ? 'Mevcut' : 'Bulunamadı');

            if (hasEscapeHtml) {
                const testHtml = '<script>alert("XSS")</script>';
                const escaped = this.app.escapeHtml(testHtml);
                const isEscaped = !escaped.includes('<script>');
                this.logResult('XSS Protection', isEscaped, `Escaped: ${escaped}`);
            }

            // Test validation functions
            const hasValidateHearts = typeof this.app.validateHearts === 'function';
            const hasValidateGems = typeof this.app.validateGems === 'function';
            const hasValidateXP = typeof this.app.validateXP === 'function';
            
            this.logResult('validateHearts', hasValidateHearts, hasValidateHearts ? 'Mevcut' : 'Bulunamadı');
            this.logResult('validateGems', hasValidateGems, hasValidateGems ? 'Mevcut' : 'Bulunamadı');
            this.logResult('validateXP', hasValidateXP, hasValidateXP ? 'Mevcut' : 'Bulunamadı');

        } catch (error) {
            this.logResult('Error Handling', false, `Hata: ${error.message}`);
        }
    },

    // Test 7: Local Storage Test
    testLocalStorage() {
        console.log('\n🧪 Test 7: Local Storage Test');
        try {
            // Test saveProgress
            const initialProgress = JSON.stringify(this.app.userProgress);
            this.app.saveProgress();
            const savedProgress = localStorage.getItem('learningProgress');
            this.logResult('Save Progress', savedProgress !== null, 
                savedProgress ? 'Progress kaydedildi' : 'Progress kaydedilemedi');

            // Test loadProgress
            const loadedProgress = this.app.loadProgress();
            const progressLoaded = typeof loadedProgress === 'object';
            this.logResult('Load Progress', progressLoaded, 
                progressLoaded ? 'Progress yüklendi' : 'Progress yüklenemedi');

        } catch (error) {
            this.logResult('Local Storage', false, `Hata: ${error.message}`);
        }
    },

    // Tüm testleri çalıştır
    runAllTests() {
        console.log('🚀 TEST GAME BAŞLATILIYOR...\n');
        console.log('='.repeat(50));
        
        this.results = [];
        
        if (!this.init()) {
            console.error('❌ Test başlatılamadı!');
            return;
        }

        this.testInitialization();
        this.testGamification();
        this.testDateTracking();
        this.testPerformance();
        this.testAccessibility();
        this.testErrorHandling();
        this.testLocalStorage();

        // Sonuçları özetle
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SONUÇLARI ÖZETİ');
        console.log('='.repeat(50));
        
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

        console.log(`Toplam Test: ${total}`);
        console.log(`✅ Başarılı: ${passed}`);
        console.log(`❌ Başarısız: ${failed}`);
        console.log(`📊 Başarı Oranı: ${successRate}%`);

        // Başarısız testleri listele
        const failedTests = this.results.filter(r => !r.passed);
        if (failedTests.length > 0) {
            console.log('\n❌ BAŞARISIZ TESTLER:');
            failedTests.forEach(test => {
                console.log(`  - ${test.test}: ${test.message}`);
            });
        }

        console.log('\n' + '='.repeat(50));
        
        return {
            total,
            passed,
            failed,
            successRate,
            results: this.results
        };
    },

    // Belirli bir testi çalıştır
    runTest(testName) {
        if (!this.init()) {
            console.error('❌ Test başlatılamadı!');
            return;
        }

        const testMap = {
            'init': this.testInitialization.bind(this),
            'gamification': this.testGamification.bind(this),
            'date': this.testDateTracking.bind(this),
            'performance': this.testPerformance.bind(this),
            'accessibility': this.testAccessibility.bind(this),
            'error': this.testErrorHandling.bind(this),
            'storage': this.testLocalStorage.bind(this)
        };

        if (testMap[testName]) {
            testMap[testName]();
        } else {
            console.error(`❌ Test bulunamadı: ${testName}`);
            console.log('Mevcut testler:', Object.keys(testMap).join(', '));
        }
    }
};

// Global olarak erişilebilir yap
window.testGame = testGame;

// Kullanım talimatları
console.log(`
🎮 TEST GAME YÜKLENDİ!

Kullanım:
  testGame.runAllTests()           - Tüm testleri çalıştır
  testGame.runTest('init')         - Belirli bir testi çalıştır
  
Mevcut testler:
  - init           : Initialization testi
  - gamification   : Gamification sistemleri testi
  - date           : Tarih ve streak takibi testi
  - performance    : Performans optimizasyonları testi
  - accessibility  : Erişilebilirlik testi
  - error          : Hata yönetimi testi
  - storage        : Local storage testi

Örnek: testGame.runAllTests()
`);

