// Learning System Application
class LearningSystem {
    constructor() {
        this.words = [];
        this.userProgress = this.loadProgress();
        this.currentMode = null;
        this.currentQuestion = null;
        this.sessionStats = { correct: 0, wrong: 0 };
        this.audioCache = new Map();
        this.currentAudio = null; // Track currently playing audio
        this.isModalOpen = false; // Track if any modal is open
        this.lastClickTime = 0; // For debouncing
        this.isProcessingAnswer = false; // Prevent double processing
        
        // Lazy loading observer
        this.lazyObserver = null;
        this.initLazyLoading();
        
        this.init();
    }

    // Initialize lazy loading with Intersection Observer
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        // Load lazy content
                        if (element.dataset.lazySrc) {
                            element.src = element.dataset.lazySrc;
                            element.removeAttribute('data-lazy-src');
                        }
                        if (element.dataset.lazyContent) {
                            element.innerHTML = element.dataset.lazyContent;
                            element.removeAttribute('data-lazy-content');
                        }
                        this.lazyObserver.unobserve(element);
                    }
                });
            }, {
                rootMargin: '50px' // Start loading 50px before element is visible
            });
        }
    }

    // Utility: Lazy load element
    observeLazyElement(element) {
        if (this.lazyObserver && element) {
            this.lazyObserver.observe(element);
        }
    }

    // Utility: Debounce function for performance optimization
    debounce(func, wait = 300) {
        let timeoutId = null;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    // Utility: Throttle function for scroll/resize events
    throttle(func, limit = 100) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Utility: Animate with requestAnimationFrame for better performance
    animate(callback) {
        requestAnimationFrame(callback);
    }

    async init() {
        // First, update dashboard immediately to clear any HTML default values
        this.updateDashboard();
        
        // If user has no progress, ensure clean state is saved
        if (!this.hasAnyProgress() && 
            (this.userProgress.streak || 0) === 0 &&
            (this.userProgress.gems || 0) === 0) {
            // Ensure all values are truly zero/clean
            this.userProgress.xp = 0;
            this.userProgress.level = 1;
            this.userProgress.crownLevel = 1;
            this.userProgress.streak = 0;
            this.userProgress.dailyProgress = 0;
            this.userProgress.gems = 0;
            this.userProgress.league = null; // No league until user plays
            this.userProgress.leagueXP = 0;
            this.userProgress.words = {};
            this.userProgress.badges = [];
            this.userProgress.weakWords = [];
            this.userProgress.chapters = {};
            this.userProgress.skillTree = {};
            this.userProgress.stories = {};
            this.userProgress.challenges = {};
            this.userProgress.lastChestDate = null;
            this.userProgress.lastGiftDate = null;
            this.userProgress.lastStudyDate = null;
            // Save clean state
            this.saveProgress();
        }
        
        await this.loadWords();
        this.setupEventListeners();
        this.initDarkMode();
        this.initModalsAccessibility(); // Initialize modals with proper ARIA attributes
        this.updateDashboard(); // Update again after loading
        this.checkDailyStreak();
        this.initHeartsRefillTimer();
        this.initChapters();
        // Lazy load non-critical content
        this.animate(() => {
            this.initSkillTree();
            this.initStories();
            this.initChallenges();
            this.initTestOut();
            this.initLeaderboard();
            this.initShop();
            this.initFriends();
        });
        this.checkDailyChest();
        this.checkGiftChest();
        this.setupNotifications();
        this.checkOfflineStatus();
        
        // Final update to ensure everything is correct
        this.updateDashboard();
    }

    // Initialize modals with proper ARIA attributes for accessibility
    initModalsAccessibility() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.hasAttribute('role')) {
                modal.setAttribute('role', 'dialog');
            }
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-hidden', 'true');
            
            // Ensure close buttons have proper attributes
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn && !closeBtn.hasAttribute('aria-label')) {
                closeBtn.setAttribute('aria-label', 'Modalı kapat');
            }
        });
    }

    async loadWords() {
        try {
            // Check if offline and use cached data
            if (!navigator.onLine) {
                const offlineWords = this.getOfflineWords();
                if (offlineWords && offlineWords.length > 0) {
                    this.words = offlineWords;
                    console.log(`Loaded ${this.words.length} words from offline cache`);
                    this.showToast('📥 Çevrimdışı modda: İndirilen dersler kullanılıyor', 'info');
                    return;
                } else {
                    this.showToast('⚠️ İnternet bağlantısı gerekli!', 'error');
                    return;
                }
            }
            
            const response = await fetch('data.json.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.words = await response.json();
            
            // Edge case: Validate loaded words
            if (!Array.isArray(this.words)) {
                throw new Error('Loaded data is not an array');
            }
            
            if (this.words.length === 0) {
                console.warn('No words loaded from data.json.json');
                // Try offline cache
                const offlineWords = this.getOfflineWords();
                if (offlineWords && offlineWords.length > 0) {
                    this.words = offlineWords;
                    this.showToast('📥 Çevrimdışı modda: İndirilen dersler kullanılıyor', 'info');
                } else {
                    this.showToast('❌ Kelime verisi yüklenemedi!', 'error');
                }
            } else {
                console.log(`Loaded ${this.words.length} words`);
            }
        } catch (error) {
            console.error('Error loading words:', error);
            // Try to load from offline cache as fallback
            const offlineWords = this.getOfflineWords();
            if (offlineWords && offlineWords.length > 0) {
                this.words = offlineWords;
                this.showToast('📥 Çevrimdışı modda: İndirilen dersler kullanılıyor', 'info');
            } else {
                // Edge case: No words available at all
                this.words = [];
                this.showToast('❌ Kelime verisi yüklenemedi! Lütfen sayfayı yenileyin.', 'error');
            }
        }
    }

    loadProgress() {
        const saved = localStorage.getItem('learningProgress');
        if (saved) {
            try {
                const progress = JSON.parse(saved);
                
                // CRITICAL: Check if user has actually played any games
                // If no XP and no words learned, reset everything to zero
                // Check if user has real progress (simplified check)
                const hasRealProgress = (progress.xp || 0) > 0 || 
                                       (progress.words && Object.keys(progress.words).length > 0) ||
                                       (progress.dailyProgress && progress.dailyProgress > 0);
                
                if (!hasRealProgress) {
                    // User hasn't played - clear localStorage and return completely clean state
                    console.log('No real progress detected, clearing localStorage and returning clean state');
                    localStorage.removeItem('learningProgress');
                    // Fall through to default return below
                } else {
                    // User has progress - clean and validate data
                    // Clean chapters data - validate and fix invalid entries
                    const cleanedChapters = {};
                    if (progress.chapters && typeof progress.chapters === 'object') {
                        Object.keys(progress.chapters).forEach(chapterId => {
                            const chapterData = progress.chapters[chapterId];
                            // Only keep if it has valid structure
                            if (chapterData && typeof chapterData === 'object') {
                                const learnedWords = chapterData.learnedWords || [];
                                const completed = learnedWords.length;
                                const total = chapterData.total || 0;
                                
                                // Validate: if user has no XP and no words learned, chapters can't be completed
                                // Check if user has real progress
                                const hasRealProgress = (progress.xp || 0) > 0 || Object.keys(progress.words || {}).length > 0;
                                
                                if (!hasRealProgress) {
                                    // User hasn't played - reset all chapter progress
                                    cleanedChapters[chapterId] = {
                                        completed: 0,
                                        total: 0,
                                        learnedWords: []
                                    };
                                } else if (chapterData.completed > 0 && learnedWords.length === 0) {
                                    // Invalid state - completed > 0 but no learnedWords - reset it
                                    cleanedChapters[chapterId] = {
                                        completed: 0,
                                        total: total,
                                        learnedWords: []
                                    };
                                } else {
                                    // Use learnedWords length as source of truth
                                    cleanedChapters[chapterId] = {
                                        completed: learnedWords.length,
                                        total: total,
                                        learnedWords: learnedWords
                                    };
                                }
                            }
                        });
                    }
                    
                    // Ensure new fields exist and validate values
                    return {
                        words: progress.words || {},
                        xp: Math.max(0, progress.xp || 0), // Ensure non-negative
                        level: Math.max(1, Math.floor((progress.xp || 0) / 100) + 1), // Will be recalculated in updateDashboard
                        crownLevel: Math.max(1, progress.crownLevel || 1),
                        streak: Math.max(0, progress.streak || 0), // Ensure non-negative
                        lastStudyDate: progress.lastStudyDate || null,
                        dailyProgress: Math.max(0, progress.dailyProgress || 0), // Ensure non-negative
                        dailyGoal: progress.dailyGoal || 20,
                        badges: progress.badges || [],
                        weakWords: progress.weakWords || [],
                        hearts: progress.hearts !== undefined ? Math.max(0, Math.min(progress.hearts, progress.maxHearts || 5)) : 5,
                        maxHearts: progress.maxHearts || 5,
                        gems: Math.max(0, progress.gems || 0), // Ensure non-negative
                        league: (progress.xp || 0) > 0 ? (progress.league || 'bronze') : null, // No league if no XP
                        leagueXP: Math.max(0, progress.leagueXP || 0), // Ensure non-negative
                        friends: progress.friends || [],
                        chapters: cleanedChapters, // Use cleaned chapters
                        skillTree: progress.skillTree || {},
                        stories: progress.stories || {},
                        challenges: progress.challenges || {},
                        lastChestDate: progress.lastChestDate || null,
                        lastGiftDate: progress.lastGiftDate || null,
                        heartsRefillTime: progress.heartsRefillTime || null,
                        isPremium: progress.isPremium || false,
                        offlineLessons: progress.offlineLessons || [],
                        errorAnalysis: progress.errorAnalysis || {},
                        darkMode: progress.darkMode || false,
                        notifications: progress.notifications !== undefined ? progress.notifications : true
                    };
                }
            } catch (e) {
                console.error('Error parsing progress:', e);
                // Return default if parse fails
            }
        }
        return {
            words: {},
            xp: 0,
            level: 1,
            crownLevel: 1,
            streak: 0,
            lastStudyDate: null,
            dailyProgress: 0,
            dailyGoal: 20,
            badges: [],
            weakWords: [],
            hearts: 5,
            maxHearts: 5,
            gems: 0,
            league: null, // No league until user plays
            leagueXP: 0,
            friends: [],
            chapters: {},
            skillTree: {},
            stories: {},
            challenges: {},
            lastChestDate: null,
            lastGiftDate: null,
            heartsRefillTime: null,
            isPremium: false,
            offlineLessons: [],
            errorAnalysis: {},
            darkMode: false,
            notifications: true
        };
    }

    // XSS Protection: Escape HTML special characters
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveProgress() {
        try {
            localStorage.setItem('learningProgress', JSON.stringify(this.userProgress));
        } catch (e) {
            console.error('Error saving progress:', e);
            // If storage is full, try to clear old data
            if (e.name === 'QuotaExceededError') {
                this.showToast('⚠️ Depolama alanı dolu! Eski veriler temizleniyor...', 'warning');
                // Clear old offline data
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('offline_')) {
                            localStorage.removeItem(key);
                        }
                    }
                    // Try again
                    localStorage.setItem('learningProgress', JSON.stringify(this.userProgress));
                } catch (e2) {
                    console.error('Error clearing storage:', e2);
                    this.showToast('❌ Veriler kaydedilemedi!', 'error');
                }
            }
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Dashboard mode selection with debouncing
        const learningModeCards = document.querySelectorAll('.learning-mode-card');
        console.log(`Found ${learningModeCards.length} learning mode cards`);
        learningModeCards.forEach(card => {
            const debouncedClick = this.debounce(() => {
                const mode = card.dataset.mode;
                console.log(`Learning mode clicked: ${mode}`);
                this.startLearningMode(mode);
            }, 300);
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedClick();
            });
            
            // Keyboard navigation support
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedClick();
                }
            });
        });

        // Back button with debouncing
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            const debouncedBack = this.debounce(() => {
                this.showDashboard();
            }, 200);
            backBtn.addEventListener('click', debouncedBack);
            backBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedBack();
                }
            });
        }

        // Answer options with debouncing (already has debouncing in handleAnswer)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                this.handleAnswer(e.target);
            }
        });

        // Answer options keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('option-btn')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleAnswer(e.target);
                }
            }
        });

        // Next button with debouncing
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            const debouncedNext = this.debounce(() => {
                this.nextQuestion();
            }, 200);
            nextBtn.addEventListener('click', debouncedNext);
            nextBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedNext();
                }
            });
        }

        // Error analysis button
        const errorAnalysisBtn = document.getElementById('error-analysis-btn');
        if (errorAnalysisBtn) {
            const debouncedErrorAnalysis = this.debounce(() => {
                this.showErrorAnalysis();
            }, 200);
            errorAnalysisBtn.addEventListener('click', debouncedErrorAnalysis);
            errorAnalysisBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedErrorAnalysis();
                }
            });
        }

        // Navigation tabs with debouncing
        const navTabs = document.querySelectorAll('.nav-tab');
        console.log(`Found ${navTabs.length} navigation tabs`);
        navTabs.forEach(tab => {
            const debouncedTabSwitch = this.debounce(() => {
                const tabName = tab.dataset.tab;
                console.log(`Tab clicked: ${tabName}`);
                this.switchTab(tabName);
            }, 200);
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedTabSwitch();
            });
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedTabSwitch();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const tabs = Array.from(document.querySelectorAll('.nav-tab'));
                    const currentIndex = tabs.indexOf(tab);
                    const nextIndex = e.key === 'ArrowLeft' 
                        ? (currentIndex - 1 + tabs.length) % tabs.length
                        : (currentIndex + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    debouncedTabSwitch.call({ dataset: { tab: tabs[nextIndex].dataset.tab } });
                }
            });
        });

        // Theme toggle with debouncing
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const debouncedThemeToggle = this.debounce(() => {
                console.log('Theme toggle clicked');
                this.toggleDarkMode();
            }, 200);
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedThemeToggle();
            });
            themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedThemeToggle();
                }
            });
        }

        // Badges button with debouncing
        const badgesBtn = document.getElementById('badges-btn');
        if (badgesBtn) {
            const debouncedBadges = this.debounce(() => {
                console.log('Badges button clicked');
                this.renderBadges();
                this.showModal('badges-modal');
            }, 200);
            badgesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedBadges();
            });
            badgesBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedBadges();
                }
            });
        }

        // Shop button with debouncing
        const shopBtn = document.getElementById('shop-btn');
        if (shopBtn) {
            const debouncedShop = this.debounce(() => {
                console.log('Shop button clicked');
                this.showModal('shop-modal');
            }, 200);
            shopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedShop();
            });
            shopBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedShop();
                }
            });
        }

        // Leaderboard button with debouncing
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        if (leaderboardBtn) {
            const debouncedLeaderboard = this.debounce(() => {
                console.log('Leaderboard button clicked');
                this.updateLeaderboard();
                this.showModal('leaderboard-modal');
            }, 200);
            leaderboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedLeaderboard();
            });
            leaderboardBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedLeaderboard();
                }
            });
        }

        // Friends button with debouncing
        const friendsBtn = document.getElementById('friends-btn');
        if (friendsBtn) {
            const debouncedFriends = this.debounce(() => {
                console.log('Friends button clicked');
                this.showModal('friends-modal');
            }, 200);
            friendsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedFriends();
            });
            friendsBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedFriends();
                }
            });
        }

        // Daily chest button with debouncing
        const dailyChestBtn = document.getElementById('daily-chest-btn');
        if (dailyChestBtn) {
            const debouncedDailyChest = this.debounce(() => {
                console.log('Daily chest button clicked');
                this.openDailyChest();
            }, 200);
            dailyChestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedDailyChest();
            });
            dailyChestBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedDailyChest();
                }
            });
        }

        // Modal close buttons with keyboard support
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const modalId = e.target.dataset.modal;
                    this.hideModal(modalId);
                }
            });
        });

        // Global keyboard navigation: Escape to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });

        // Hearts refill buttons with debouncing
        const refillGemsBtn = document.getElementById('refill-hearts-gems');
        if (refillGemsBtn) {
            const debouncedRefillGems = this.debounce(() => {
                this.refillHeartsWithGems();
            }, 200);
            refillGemsBtn.addEventListener('click', debouncedRefillGems);
            refillGemsBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedRefillGems();
                }
            });
        }

        const refillAdBtn = document.getElementById('refill-hearts-ad');
        if (refillAdBtn) {
            const debouncedRefillAd = this.debounce(() => {
                this.refillHeartsWithAd();
            }, 200);
            refillAdBtn.addEventListener('click', debouncedRefillAd);
            refillAdBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedRefillAd();
                }
            });
        }

        const refillWaitBtn = document.getElementById('refill-hearts-wait');
        if (refillWaitBtn) {
            const debouncedRefillWait = this.debounce(() => {
                this.hideModal('hearts-modal');
            }, 200);
            refillWaitBtn.addEventListener('click', debouncedRefillWait);
            refillWaitBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedRefillWait();
                }
            });
        }

        // Watch ad button with debouncing
        const watchAdBtn = document.getElementById('watch-ad-btn');
        if (watchAdBtn) {
            const debouncedWatchAd = this.debounce(() => {
                this.watchAd();
            }, 200);
            watchAdBtn.addEventListener('click', debouncedWatchAd);
            watchAdBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedWatchAd();
                }
            });
        }

        // Offline download button with debouncing
        const offlineDownloadBtn = document.getElementById('offline-download-btn');
        if (offlineDownloadBtn) {
            const debouncedOfflineDownload = this.debounce(() => {
                this.showOfflineDownload();
            }, 200);
            offlineDownloadBtn.addEventListener('click', debouncedOfflineDownload);
            offlineDownloadBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedOfflineDownload();
                }
            });
        }

        // Reset button with debouncing
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            const debouncedReset = this.debounce(() => {
                console.log('Reset button clicked');
                this.showModal('reset-modal');
            }, 200);
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                debouncedReset();
            });
            resetBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedReset();
                }
            });
        }

        // Reset confirmation buttons with debouncing
        const cancelResetBtn = document.getElementById('cancel-reset-btn');
        if (cancelResetBtn) {
            const debouncedCancelReset = this.debounce(() => {
                this.hideModal('reset-modal');
            }, 200);
            cancelResetBtn.addEventListener('click', debouncedCancelReset);
            cancelResetBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedCancelReset();
                }
            });
        }

        const confirmResetBtn = document.getElementById('confirm-reset-btn');
        if (confirmResetBtn) {
            const debouncedConfirmReset = this.debounce(() => {
                this.resetAllData();
            }, 200);
            confirmResetBtn.addEventListener('click', debouncedConfirmReset);
            confirmResetBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    debouncedConfirmReset();
                }
            });
        }

        // Click outside modal to close (throttled for performance)
        const throttledModalClose = this.throttle((e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        }, 100);
        window.addEventListener('click', throttledModalClose);
        
        console.log('✅ Event listeners setup completed');
    }

    startLearningMode(mode) {
        // Edge case: Check if words are loaded
        if (!this.words || this.words.length === 0) {
            this.showToast('⚠️ Kelime verisi yükleniyor, lütfen bekleyin...', 'warning');
            // Try to reload words
            this.loadWords().then(() => {
                if (this.words && this.words.length > 0) {
                    this.startLearningMode(mode);
                }
            });
            return;
        }
        
        // Stop all audio when switching modes
        this.stopAllAudio();
        
        // Edge case: Close any open modal before starting learning
        if (this.isModalOpen) {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                modal.classList.remove('show');
            });
            this.isModalOpen = false;
            document.body.style.overflow = '';
        }
        
        // Check hearts using centralized function
        if (!this.canPlay()) {
            this.showModal('hearts-modal');
            return;
        }

        // Conversation mode merged into contextual - redirect
        if (mode === 'conversation') {
            mode = 'contextual'; // Redirect to contextual
        }

        this.currentMode = mode;
        this.sessionStats = { correct: 0, wrong: 0 };
        
        const dashboardView = document.getElementById('dashboard-view');
        const learningView = document.getElementById('learning-view');
        if (dashboardView) dashboardView.classList.remove('active');
        if (learningView) learningView.classList.add('active');
        
        const modeTitles = {
            'spaced-repetition': '🔄 Aralıklı Tekrar Sistemi',
            'interleaved': '🎲 Karma Alıştırma',
            'audio-first': '🎧 Sesli Öğrenme',
            'recognition-recall': '🧠 Tanıma → Hatırlama',
            'contextual': '📖 Bağlamsal Öğrenme',
            'weak-words': '💪 Zayıf Kelimeler',
            'conversation': '📖 Bağlamsal Öğrenme', // Merged into contextual
            'practice': '🎲 Karma Alıştırma', // Merged into interleaved
            'story': '📖 Hikaye',
            'test-out': '📝 Test-Out Sınavı',
            'chapter': '📚 Bölüm'
        };
        
        const modeTitleEl = document.getElementById('mode-title');
        if (modeTitleEl) {
            modeTitleEl.textContent = modeTitles[mode] || mode;
        }
        this.updateSessionHearts();
        this.nextQuestion();
    }

    showDashboard() {
        // Stop all audio when returning to dashboard
        this.stopAllAudio();
        
        const learningView = document.getElementById('learning-view');
        const dashboardView = document.getElementById('dashboard-view');
        
        if (learningView) learningView.classList.remove('active');
        if (dashboardView) dashboardView.classList.add('active');
        
        // Stop challenge timer if active
        if (this.currentChallenge) {
            const timerEl = document.getElementById('challenge-timer');
            if (timerEl) timerEl.style.display = 'none';
        }
        
        this.updateDashboard();
    }

    getNextWord() {
        let wordPool = [];
        
        switch(this.currentMode) {
            case 'spaced-repetition':
                wordPool = this.getSpacedRepetitionWords();
                break;
            case 'weak-words':
                wordPool = this.getWeakWords();
                break;
            case 'interleaved':
            case 'practice': // Practice merged into interleaved
                // Interleaved: mix of all words, practice: words with some progress
                if (this.currentMode === 'practice') {
                    // Practice mode: focus on words with some progress but not mastered
                    wordPool = this.words.filter(w => {
                        const progress = this.userProgress.words[w.id_number];
                        return progress && progress.correctCount > 0 && progress.correctCount < 5;
                    });
                } else {
                    wordPool = this.getInterleavedWords();
                }
                break;
            case 'contextual':
                // Contextual mode: prefer words with context (ayah_text && meal), fallback to all words
                const contextualWords = this.words.filter(w => w.ayah_text && w.meal);
                wordPool = contextualWords.length > 0 ? contextualWords : this.words;
                break;
            case 'chapter':
                // Chapter mode: only words from current chapter
                if (this.currentChapter && this.currentChapter.words && this.currentChapter.words.length > 0) {
                    const progress = this.userProgress.chapters[this.currentChapter.id];
                    const learnedWords = progress?.learnedWords || [];
                    
                    wordPool = this.currentChapter.words.filter(w => {
                        // Only include words that haven't been learned yet
                        return !learnedWords.includes(w.id_number);
                    });
                } else {
                    // Fallback if chapter not properly initialized
                    wordPool = this.words;
                }
                break;
            default:
                wordPool = this.words;
        }

        if (wordPool.length === 0) {
            // If chapter mode and no more words, check if chapter is actually complete
            if (this.currentMode === 'chapter' && this.currentChapter && this.currentChapter.words) {
                const progress = this.userProgress.chapters[this.currentChapter.id];
                const learnedWords = progress?.learnedWords || [];
                const totalWords = this.currentChapter.words.length;
                
                // Only complete if all words are actually learned
                if (learnedWords.length >= totalWords && totalWords > 0) {
                    this.completeChapter();
                    return null;
                } else {
                    // Not all words learned, but wordPool is empty - restart with all chapter words
                    wordPool = this.currentChapter.words.filter(w => {
                        // Filter out already learned words
                        return !learnedWords.includes(w.id_number);
                    });
                    
                    // If still empty, something is wrong - use all words as fallback
                    if (wordPool.length === 0) {
                        wordPool = this.currentChapter.words;
                    }
                }
            } else {
                // Not in chapter mode or chapter not available
                wordPool = this.words;
            }
        }

        // Adaptive Learning: Filter by difficulty based on level (except for chapter mode)
        if (this.currentMode !== 'chapter') {
            const filteredPool = this.adaptDifficulty(wordPool);
            if (filteredPool.length > 0) {
                wordPool = filteredPool;
            }
        }
        
        // Edge case: No words available at all
        if (!wordPool || wordPool.length === 0) {
            console.error('getNextWord: No words available in wordPool');
            this.showToast('⚠️ Kelime bulunamadı! Dashboard\'a yönlendiriliyorsunuz...', 'warning');
            setTimeout(() => this.showDashboard(), 2000);
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * wordPool.length);
        const selectedWord = wordPool[randomIndex];
        
        // Edge case: Selected word is null/undefined
        if (!selectedWord) {
            console.error('getNextWord: Selected word is null/undefined');
            // Try to get another word
            const validWords = wordPool.filter(w => w && w.id_number);
            if (validWords.length > 0) {
                return validWords[Math.floor(Math.random() * validWords.length)];
            }
            return null;
        }
        
        return selectedWord;
    }

    completeChapter() {
        if (!this.currentChapter || !this.currentChapter.words || this.currentChapter.words.length === 0) return;
        
        const progress = this.userProgress.chapters[this.currentChapter.id] || { completed: 0, total: this.currentChapter.words.length, learnedWords: [] };
        
        // Only complete if all words are actually learned
        if (!progress.learnedWords) progress.learnedWords = [];
        
        // Verify that all words are actually learned (don't auto-add them)
        const chapterWordIds = this.currentChapter.words.map(w => w.id_number);
        const validLearnedWords = progress.learnedWords.filter(id => chapterWordIds.includes(id));
        
        progress.completed = validLearnedWords.length;
        progress.total = this.currentChapter.words.length;
        
        // Only mark as completed if all words are actually learned
        if (progress.completed < progress.total) {
            // Not all words learned yet, don't complete
            return;
        }
        
        // Update learnedWords to only contain valid words
        progress.learnedWords = validLearnedWords;
        this.userProgress.chapters[this.currentChapter.id] = progress;
        
        this.addXP(100);
        this.userProgress.gems += 10;
        this.saveProgress();
        this.renderChapters();
        
        this.showToast(`🎉 ${this.currentChapter.name} tamamlandı! +100 XP, +10 💎`, 'success');
        setTimeout(() => this.showDashboard(), 2000);
    }

    getSpacedRepetitionWords() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        return this.words.filter(word => {
            const progress = this.userProgress.words[word.id_number];
            if (!progress) return true; // New word
            
            const lastReview = progress.lastReview || 0;
            const interval = progress.interval || oneDay;
            const nextReview = lastReview + interval;
            
            return now >= nextReview;
        });
    }

    getWeakWords() {
        return this.userProgress.weakWords
            .map(id => this.words.find(w => w.id_number === id))
            .filter(w => w !== undefined);
    }

    getInterleavedWords() {
        // Mix different difficulty levels
        const easy = this.words.filter(w => w.word_diffuculty <= 7);
        const medium = this.words.filter(w => w.word_diffuculty > 7 && w.word_diffuculty <= 11);
        const hard = this.words.filter(w => w.word_diffuculty > 11);
        
        const mixed = [];
        const maxLength = Math.max(easy.length, medium.length, hard.length);
        
        for (let i = 0; i < maxLength; i++) {
            if (easy[i]) mixed.push(easy[i]);
            if (medium[i]) mixed.push(medium[i]);
            if (hard[i]) mixed.push(hard[i]);
        }
        
        return mixed.slice(0, 50); // Limit for performance
    }

    adaptDifficulty(wordPool) {
        const level = this.userProgress.level;
        const avgDifficulty = this.calculateAverageDifficulty();
        
        // Adjust difficulty based on user performance
        let targetDifficulty;
        if (avgDifficulty < 7) {
            targetDifficulty = Math.min(level * 2, 15);
        } else if (avgDifficulty > 12) {
            targetDifficulty = Math.max(level * 2 - 2, 5);
        } else {
            targetDifficulty = level * 2;
        }

        return wordPool.filter(word => {
            const diff = word.word_diffuculty;
            return Math.abs(diff - targetDifficulty) <= 3;
        });
    }

    calculateAverageDifficulty() {
        const reviewedWords = Object.values(this.userProgress.words);
        if (reviewedWords.length === 0) return 8;
        
        const totalDifficulty = reviewedWords.reduce((sum, progress) => {
            const word = this.words.find(w => w.id_number === progress.id);
            return sum + (word ? word.word_diffuculty : 8);
        }, 0);
        
        return totalDifficulty / reviewedWords.length;
    }

    nextQuestion() {
        // Edge case: Reset processing flag when moving to next question
        this.isProcessingAnswer = false;
        
        // Handle story mode separately
        if (this.currentMode === 'story') {
            this.storyWordIndex++;
            this.nextStoryQuestion();
            return;
        }
        
        // Handle test-out mode separately
        if (this.currentMode === 'test-out') {
            this.nextTestOutQuestion();
            return;
        }
        
        // Edge case: Check if words are available
        if (!this.words || this.words.length === 0) {
            this.showToast('⚠️ Kelime verisi yükleniyor...', 'warning');
            return;
        }
        
        const word = this.getNextWord();
        if (!word) {
            this.showToast('Tüm kelimeler tamamlandı! 🎉', 'success');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }

        this.currentQuestion = word;
        this.renderQuestion(word);
        this.updateSessionStats();
    }

    renderQuestion(word) {
        if (!word) {
            console.error('renderQuestion: word is null or undefined');
            this.showToast('❌ Soru yüklenemedi!', 'error');
            return;
        }
        
        const questionContent = document.getElementById('question-content');
        const answerOptions = document.getElementById('answer-options');
        const feedbackArea = document.getElementById('feedback-area');
        const nextBtn = document.getElementById('next-btn');
        
        if (!questionContent || !answerOptions) {
            console.error('renderQuestion: question-content or answer-options not found');
            return;
        }
        
        // Clear previous content
        if (feedbackArea) feedbackArea.innerHTML = '';
        if (nextBtn) nextBtn.style.display = 'none';
        
        // Ensure currentQuestion is set before getQuestionType
        this.currentQuestion = word;
        
        // Determine question type based on mode
        const questionType = this.getQuestionType();
        
        switch(questionType) {
            case 'recognition':
                this.renderRecognitionQuestion(word, questionContent, answerOptions);
                break;
            case 'recall':
                this.renderRecallQuestion(word, questionContent, answerOptions);
                break;
            case 'production':
                this.renderProductionQuestion(word, questionContent, answerOptions);
                break;
            case 'audio':
                this.renderAudioQuestion(word, questionContent, answerOptions);
                break;
            case 'contextual':
                this.renderContextualQuestion(word, questionContent, answerOptions);
                break;
            default:
                this.renderDefaultQuestion(word, questionContent, answerOptions);
        }
    }

    getQuestionType() {
        if (this.currentMode === 'audio-first') {
            return 'audio';
        }
        if (this.currentMode === 'contextual' || this.currentMode === 'conversation') {
            return 'contextual';
        }
        if (this.currentMode === 'practice') {
            // Practice mode: merged into interleaved - mix of all types
            const types = ['recognition', 'recall', 'contextual', 'audio'];
            return types[Math.floor(Math.random() * types.length)];
        }
        if (this.currentMode === 'recognition-recall') {
            const progress = this.userProgress.words[this.currentQuestion?.id_number];
            if (!progress || progress.stage === 'recognition') {
                return 'recognition';
            } else if (progress.stage === 'recall') {
                return 'recall';
            } else {
                return 'production';
            }
        }
        
        // Interleaved/Practice: random question type (practice merged into interleaved)
        if (this.currentMode === 'interleaved' || this.currentMode === 'practice') {
            const types = ['recognition', 'recall', 'contextual', 'audio'];
            return types[Math.floor(Math.random() * types.length)];
        }
        
        return 'recognition';
    }

    renderDefaultQuestion(word, questionContent, answerOptions) {
        questionContent.innerHTML = `
            <div class="arabic-word">${word.arabic_word}</div>
            <div class="turkish-meaning">Bu kelimenin anlamı nedir?</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.sound_url}')">
                    🔊 Kelimeyi Dinle
                </button>
                <button class="audio-btn" onclick="app.playAudio('${word.ayah_sound_url}')">
                    🎵 Ayeti Dinle
                </button>
            </div>
        `;

        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    renderRecognitionQuestion(word, questionContent, answerOptions) {
        if (!word || !word.arabic_word) {
            console.error('renderRecognitionQuestion: invalid word', word);
            questionContent.innerHTML = '<p>❌ Soru yüklenemedi!</p>';
            return;
        }
        
        const soundUrl = word.sound_url || '';
        questionContent.innerHTML = `
            <div class="arabic-word">${word.arabic_word || 'خطأ'}</div>
            <div class="turkish-meaning">Bu kelimenin anlamını seçin:</div>
            ${soundUrl ? `<div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${soundUrl}')">
                    🔊 Kelimeyi Dinle
                </button>
            </div>` : ''}
        `;

        const options = this.generateAnswerOptions(word);
        if (!options || options.length === 0) {
            console.error('generateAnswerOptions returned empty array');
            answerOptions.innerHTML = '<p>❌ Seçenekler yüklenemedi!</p>';
            return;
        }
        
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text || 'Hata'}</button>`
        ).join('');
    }

    renderRecallQuestion(word, questionContent, answerOptions) {
        questionContent.innerHTML = `
            <div class="turkish-meaning">"${word.turkish_mean}" anlamına gelen kelimeyi seçin:</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.sound_url}')">
                    🔊 Sesleri Dinle
                </button>
            </div>
        `;

        const options = this.generateArabicOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    renderProductionQuestion(word, questionContent, answerOptions) {
        questionContent.innerHTML = `
            <div class="ayah-text">${word.ayah_text}</div>
            <div class="meal-text">${word.meal}</div>
            <div class="turkish-meaning">Boşluğa gelecek kelimeyi yazın veya seçin:</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.ayah_sound_url}')">
                    🎵 Ayeti Dinle
                </button>
            </div>
        `;

        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    renderAudioQuestion(word, questionContent, answerOptions) {
        questionContent.innerHTML = `
            <div class="turkish-meaning">Sesi dinleyin ve anlamını seçin:</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.sound_url}')">
                    🔊 Kelimeyi Dinle
                </button>
            </div>
        `;

        // Auto-play audio
        setTimeout(() => this.playAudio(word.sound_url), 500);

        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    renderContextualQuestion(word, questionContent, answerOptions) {
        questionContent.innerHTML = `
            <div class="ayah-text">${word.ayah_text}</div>
            <div class="meal-text">${word.meal}</div>
            <div class="turkish-meaning">Yukarıdaki cümlede "<strong>${word.arabic_word}</strong>" kelimesinin anlamı nedir?</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.ayah_sound_url}')">
                    🎵 Ayeti Dinle
                </button>
            </div>
        `;

        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    generateAnswerOptions(correctWord) {
        if (!correctWord || !correctWord.turkish_mean) {
            console.error('generateAnswerOptions: invalid word', correctWord);
            return [{ text: 'Hata', correct: true }];
        }
        
        const options = [{ text: correctWord.turkish_mean, correct: true }];
        
        // Use chapter words if in chapter mode, otherwise use all words
        let wordPool = this.words;
        if (this.currentMode === 'chapter' && this.currentChapter && this.currentChapter.words) {
            wordPool = this.currentChapter.words;
        }
        
        const otherWords = wordPool
            .filter(w => w && w.id_number && w.id_number !== correctWord.id_number && w.turkish_mean)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        otherWords.forEach(word => {
            if (word.turkish_mean) {
                options.push({ text: word.turkish_mean, correct: false });
            }
        });
        
        // Ensure at least 2 options
        if (options.length < 2) {
            options.push({ text: 'Bilinmiyor', correct: false });
        }
        
        return this.shuffleArray(options);
    }

    generateArabicOptions(correctWord) {
        if (!correctWord || !correctWord.arabic_word) {
            console.error('generateArabicOptions: invalid word', correctWord);
            return [{ text: 'خطأ', correct: true }];
        }
        
        const options = [{ text: correctWord.arabic_word, correct: true }];
        
        // Use chapter words if in chapter mode, otherwise use all words
        let wordPool = this.words;
        if (this.currentMode === 'chapter' && this.currentChapter && this.currentChapter.words) {
            wordPool = this.currentChapter.words;
        }
        
        const otherWords = wordPool
            .filter(w => w && w.id_number && w.id_number !== correctWord.id_number && w.arabic_word)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        otherWords.forEach(word => {
            if (word.arabic_word) {
                options.push({ text: word.arabic_word, correct: false });
            }
        });
        
        // Ensure at least 2 options
        if (options.length < 2) {
            options.push({ text: 'غير معروف', correct: false });
        }
        
        return this.shuffleArray(options);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    handleAnswer(button) {
        // Edge case: Prevent rapid clicks (debouncing)
        const now = Date.now();
        if (now - this.lastClickTime < 300) { // 300ms debounce
            return;
        }
        this.lastClickTime = now;
        
        // Edge case: Prevent double processing
        if (this.isProcessingAnswer) {
            return;
        }
        this.isProcessingAnswer = true;
        
        if (!button || button.classList.contains('disabled')) {
            this.isProcessingAnswer = false;
            return;
        }
        
        const isCorrect = button.dataset.correct === 'true';
        const allButtons = document.querySelectorAll('.option-btn');
        
        // Disable all buttons
        allButtons.forEach(btn => {
            btn.classList.add('disabled');
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            } else if (btn === button && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        // Immediate Feedback
        this.showFeedback(isCorrect);
        
        // Update progress
        this.updateWordProgress(isCorrect);
        
        // Update challenge progress if active
        if (this.currentChallenge) {
            const challengeData = this.userProgress.challenges[this.currentChallenge.id];
            if (challengeData) {
                challengeData.total++;
                if (isCorrect) {
                    challengeData.correct++;
                }
                
                // Check challenge completion
                if (this.currentChallenge.target && challengeData.total >= this.currentChallenge.target) {
                    const success = challengeData.correct === challengeData.total;
                    setTimeout(() => {
                        this.completeChallenge(this.currentChallenge.id, success);
                        this.showDashboard();
                    }, 2000);
                }
                this.saveProgress();
            }
        }
        
        // Update story progress if active
        if (this.currentMode === 'story' && this.currentStory) {
            if (isCorrect) {
                const progress = this.userProgress.stories[this.currentStory.id] || { completed: 0, words: [] };
                if (!progress.words) progress.words = [];
                if (!progress.words.includes(this.currentQuestion.id_number)) {
                    progress.words.push(this.currentQuestion.id_number);
                    progress.completed = progress.words.length;
                    this.userProgress.stories[this.currentStory.id] = progress;
                    this.saveProgress();
                }
            }
            // Move to next story question after delay
            setTimeout(() => {
                if (this.currentMode === 'story') {
                    this.storyWordIndex++;
                    this.nextStoryQuestion();
                }
            }, 1500);
            return; // Don't show next button for story mode
        }
        
        // Conversation merged into contextual - no separate handling needed
        
        // Update stats (for all modes including test-out)
        if (isCorrect) {
            this.sessionStats.correct++;
            // Don't add XP for test-out mode (XP is given at the end)
            if (this.currentMode !== 'test-out') {
                this.addXP(10);
                this.animateXP('+10 XP');
            }
        } else {
            this.sessionStats.wrong++;
            // Don't lose heart for test-out mode
            if (this.currentMode !== 'test-out') {
                this.trackWeakWord(this.currentQuestion.id_number);
                this.loseHeart();
                this.updateErrorAnalysis(this.currentQuestion);
            }
        }
        
        this.updateSessionStats();
        
        // Update daily progress (for all modes)
        this.updateDailyProgress();
        
        // Update test-out progress
        if (this.currentMode === 'test-out') {
            if (this.currentQuestion) {
                this.testAnswers.push({
                    wordId: this.currentQuestion.id_number,
                    correct: isCorrect
                });
                this.testWordIndex++;
                
                // Auto-advance to next question after delay (test-out mode)
                setTimeout(() => {
                    if (this.currentMode === 'test-out') {
                        this.nextTestOutQuestion();
                    }
                }, 1500);
            }
            return; // Don't show next button for test-out mode
        }
        
        // Update chapter progress
        if (this.currentMode === 'chapter' && this.currentChapter && isCorrect) {
            const progress = this.userProgress.chapters[this.currentChapter.id] || { 
                completed: 0, 
                total: this.currentChapter.words.length,
                learnedWords: []
            };
            
            if (!progress.learnedWords) progress.learnedWords = [];
            if (!progress.learnedWords.includes(this.currentQuestion.id_number)) {
                progress.learnedWords.push(this.currentQuestion.id_number);
                progress.completed = progress.learnedWords.length;
                this.userProgress.chapters[this.currentChapter.id] = progress;
                this.saveProgress();
                this.renderChapters();
            }
        }
        
        // Show next button (except for test-out which auto-advances)
        if (this.currentMode !== 'test-out') {
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn) {
                // Update next button text for story mode
                if (this.currentMode === 'story') {
                    if (this.storyWordIndex >= this.storyWords.length - 1) {
                        nextBtn.textContent = 'Hikayeyi Bitir →';
                    } else {
                        nextBtn.textContent = 'Sonraki →';
                    }
                } else {
                    nextBtn.textContent = 'Sonraki →';
                }
                
                setTimeout(() => {
                    nextBtn.style.display = 'block';
                    // Edge case: Reset processing flag after showing next button
                    this.isProcessingAnswer = false;
                }, 1500);
            } else {
                // Edge case: Reset processing flag if next button not found
                setTimeout(() => {
                    this.isProcessingAnswer = false;
                }, 1500);
            }
        } else {
            // Auto-advance test-out questions
            setTimeout(() => {
                this.nextQuestion();
            }, 1500);
        }
        
        // Haptic feedback (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(isCorrect ? 50 : [50, 50, 50]);
        }

        // Check if hearts are depleted using centralized function
        if (!this.canPlay()) {
            setTimeout(() => {
                this.showModal('hearts-modal');
            }, 2000);
        }
    }

    showFeedback(isCorrect) {
        const feedbackArea = document.getElementById('feedback-area');
        const message = isCorrect 
            ? '✅ Doğru! Harika iş! 🎉' 
            : `❌ Yanlış. Doğru cevap: "${this.currentQuestion.turkish_mean}"`;
        
        feedbackArea.innerHTML = `
            <div class="feedback-message ${isCorrect ? 'correct' : 'wrong'}">
                ${message}
            </div>
        `;
    }

    updateWordProgress(isCorrect) {
        const wordId = this.currentQuestion.id_number;
        const now = Date.now();
        const progress = this.userProgress.words[wordId] || {
            id: wordId,
            correctCount: 0,
            wrongCount: 0,
            lastReview: null,
            lastStudied: null, // Track when word was last studied (for daily activity)
            interval: 24 * 60 * 60 * 1000, // 1 day
            easeFactor: 2.5,
            stage: 'recognition'
        };

        progress.lastReview = now;
        progress.lastStudied = now; // Update last studied time
        
        if (isCorrect) {
            progress.correctCount++;
            // Spaced Repetition: Increase interval
            progress.interval = Math.floor(progress.interval * progress.easeFactor);
            progress.easeFactor = Math.min(progress.easeFactor + 0.1, 2.5);
            
            // Progress through stages
            if (progress.correctCount >= 3 && progress.stage === 'recognition') {
                progress.stage = 'recall';
            } else if (progress.correctCount >= 6 && progress.stage === 'recall') {
                progress.stage = 'production';
            }
        } else {
            progress.wrongCount++;
            // Reset interval on wrong answer
            progress.interval = 24 * 60 * 60 * 1000;
            progress.easeFactor = Math.max(progress.easeFactor - 0.2, 1.3);
        }

        this.userProgress.words[wordId] = progress;
        
        // Update lastStudyDate for daily activity tracking
        const today = this.getLocalDateString();
        this.userProgress.lastStudyDate = today;
        
        this.saveProgress();
    }

    trackWeakWord(wordId) {
        if (!wordId) return;
        if (!this.userProgress.weakWords) {
            this.userProgress.weakWords = [];
        }
        if (!this.userProgress.weakWords.includes(wordId)) {
            this.userProgress.weakWords.push(wordId);
            this.saveProgress();
        }
    }

    // Centralized level calculation - always use this
    calculateLevel() {
        return Math.floor((this.userProgress.xp || 0) / 100) + 1;
    }

    // Centralized progress check - checks if user has any real activity
    hasAnyProgress() {
        return (this.userProgress.xp || 0) > 0 || 
               Object.keys(this.userProgress.words || {}).length > 0 ||
               (this.userProgress.dailyProgress || 0) > 0;
    }

    // Centralized hearts check - checks if user can play
    canPlay() {
        return this.userProgress.isPremium || (this.userProgress.hearts || 0) > 0;
    }

    // Centralized hearts validation - ensures hearts are within bounds
    validateHearts() {
        if (this.userProgress.isPremium) return;
        const maxHearts = this.userProgress.maxHearts || 5;
        this.userProgress.hearts = Math.max(0, Math.min(this.userProgress.hearts || 0, maxHearts));
    }

    // Centralized gems validation - ensures gems are non-negative
    validateGems() {
        this.userProgress.gems = Math.max(0, this.userProgress.gems || 0);
    }

    // Centralized XP validation - ensures XP is non-negative
    validateXP() {
        // Edge case: Prevent XP overflow
        const MAX_XP = Number.MAX_SAFE_INTEGER || 9007199254740991;
        this.userProgress.xp = Math.max(0, Math.min(this.userProgress.xp || 0, MAX_XP));
        this.userProgress.leagueXP = Math.max(0, Math.min(this.userProgress.leagueXP || 0, MAX_XP));
        
        // Edge case: Ensure XP is a valid number
        if (isNaN(this.userProgress.xp) || !isFinite(this.userProgress.xp)) {
            console.error('Invalid XP value detected, resetting to 0');
            this.userProgress.xp = 0;
        }
        if (isNaN(this.userProgress.leagueXP) || !isFinite(this.userProgress.leagueXP)) {
            console.error('Invalid leagueXP value detected, resetting to 0');
            this.userProgress.leagueXP = 0;
        }
    }

    addXP(amount) {
        if (!amount || amount <= 0) return;
        
        // Edge case: Prevent XP overflow (max safe integer)
        const MAX_XP = Number.MAX_SAFE_INTEGER || 9007199254740991;
        const currentXP = this.userProgress.xp || 0;
        if (currentXP >= MAX_XP) {
            this.showToast('🎉 Maksimum XP seviyesine ulaştınız!', 'success');
            return;
        }
        
        // Edge case: Check if adding amount would cause overflow
        if (currentXP + amount > MAX_XP) {
            this.userProgress.xp = MAX_XP;
            this.userProgress.leagueXP = Math.min((this.userProgress.leagueXP || 0) + amount, MAX_XP);
        } else {
            this.userProgress.xp += amount;
            this.userProgress.leagueXP += amount;
        }
        
        const hadNoProgress = currentXP === 0 && 
                              (!this.userProgress.league || this.userProgress.league === null);
        
        const oldLevel = this.calculateLevel();
        this.validateXP();
        
        // Set league to bronze when user first gains XP
        if (hadNoProgress && !this.userProgress.league) {
            this.userProgress.league = 'bronze';
        }
        
        const newLevel = this.calculateLevel();
        this.userProgress.level = newLevel;
        
        if (newLevel > oldLevel) {
            this.showToast(`🎉 Seviye Atladınız! Seviye ${newLevel}`, 'success');
            this.checkBadges();
            const levelEl = document.getElementById('level');
            if (levelEl) {
                levelEl.classList.add('level-up-animation');
                setTimeout(() => levelEl.classList.remove('level-up-animation'), 1500);
            }
        }
        
        this.updateCrownLevel();
        this.updateLeagueDisplay();
        this.checkAutoUnlockSkills();
        this.saveProgress();
        this.updateDashboard();
    }

    updateDailyProgress() {
        this.userProgress.dailyProgress++;
        this.saveProgress();
        this.updateDashboard();
        
        // Update daily chest button status after activity
        this.checkDailyChest();
        
        if (this.userProgress.dailyProgress >= this.userProgress.dailyGoal) {
            this.showToast('🎯 Günlük hedefinize ulaştınız!', 'success');
            this.addXP(50);
            this.checkBadges();
            // Check for gift chest after completing daily goal
            this.checkGiftChestAfterActivity();
        }
    }
    
    checkGiftChestAfterActivity() {
        // Check if user qualifies for gift chest after being active
        const lastGift = this.userProgress.lastGiftDate ? new Date(this.userProgress.lastGiftDate + 'T00:00:00') : null;
        const now = new Date();
        
        if (!lastGift) {
            // First time gift - require minimum activity
            // Show after completing daily goal for first time or reaching 100 XP
            if (this.userProgress.xp >= 100 && this.userProgress.dailyProgress >= this.userProgress.dailyGoal) {
                // Wait a bit before showing
                setTimeout(() => {
                    this.showGiftChest();
                }, 3000);
            }
        } else {
            // Check if 7 days have passed since last gift
            const daysSinceLastGift = (now - lastGift) / (1000 * 60 * 60 * 24);
            if (daysSinceLastGift >= 7) {
                // User has been active, show gift chest
                setTimeout(() => {
                    this.showGiftChest();
                }, 3000);
            }
        }
    }

    // Utility: Get local date string in YYYY-MM-DD format (more reliable than toDateString)
    getLocalDateString(date = new Date()) {
        const d = new Date(date);
        // Use local timezone
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    checkDailyStreak() {
        const today = this.getLocalDateString();
        const lastStudyDate = this.userProgress.lastStudyDate;
        
        if (lastStudyDate === today) {
            return; // Already studied today
        }
        
        // If no lastStudyDate, this is first time - don't set streak yet
        if (!lastStudyDate) {
            return; // Wait for first study session
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.getLocalDateString(yesterday);
        
        if (lastStudyDate === yesterdayStr) {
            // Continue streak
            this.userProgress.streak = (this.userProgress.streak || 0) + 1;
        } else {
            // Reset streak (missed a day or more)
            this.userProgress.streak = 1;
        }
        
        this.userProgress.lastStudyDate = today;
        this.saveProgress();
        this.updateDashboard();
    }

    checkBadges() {
        if (!this.userProgress.badges) {
            this.userProgress.badges = [];
        }
        
        const badges = [];
        const progress = this.userProgress;
        
        if (progress.xp >= 100) badges.push({ id: 'first_steps', name: 'İlk Adımlar', icon: '👣' });
        if (progress.xp >= 500) badges.push({ id: 'learner', name: 'Öğrenci', icon: '📚' });
        if (progress.xp >= 1000) badges.push({ id: 'scholar', name: 'Alim', icon: '🎓' });
        if (progress.streak >= 7) badges.push({ id: 'week_warrior', name: 'Hafta Savaşçısı', icon: '🔥' });
        if (progress.streak >= 30) badges.push({ id: 'month_master', name: 'Ay Ustası', icon: '⭐' });
        if (progress.dailyProgress >= progress.dailyGoal) badges.push({ id: 'daily_achiever', name: 'Günlük Başarı', icon: '🎯' });
        if (Object.keys(progress.words || {}).length >= 100) badges.push({ id: 'century', name: 'Yüzlük', icon: '💯' });
        if (Object.keys(progress.words || {}).length >= 500) badges.push({ id: 'half_k', name: 'Yarım Binlik', icon: '🏆' });
        
        badges.forEach(badge => {
            if (!progress.badges.includes(badge.id)) {
                progress.badges.push(badge.id);
                this.showToast(`🏆 Yeni Rozet: ${badge.name} ${badge.icon}`, 'success');
            }
        });
        
        this.saveProgress();
    }


    // Stop all currently playing audio
    stopAllAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        // Also stop all cached audio that might be playing
        this.audioCache.forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    playAudio(url) {
        if (!url) return;
        
        // Stop any currently playing audio first
        this.stopAllAudio();
        
        // Don't play audio if a modal is open
        if (this.isModalOpen) {
            return;
        }
        
        // Cache audio for better performance
        if (!this.audioCache.has(url)) {
            const audio = new Audio(url);
            // Reset audio when it ends
            audio.addEventListener('ended', () => {
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                }
            });
            this.audioCache.set(url, audio);
        }
        
        const audio = this.audioCache.get(url);
        this.currentAudio = audio;
        
        audio.play().catch(err => {
            console.error('Audio play error:', err);
            this.showToast('Ses dosyası yüklenemedi', 'error');
            this.currentAudio = null;
        });
    }

    updateSessionStats() {
        const correctEl = document.getElementById('correct-count');
        const wrongEl = document.getElementById('wrong-count');
        if (correctEl) correctEl.textContent = this.sessionStats.correct || 0;
        if (wrongEl) wrongEl.textContent = this.sessionStats.wrong || 0;
    }

    updateDashboard() {
        // Update stats with null checks
        const streakEl = document.getElementById('streak');
        const xpEl = document.getElementById('xp');
        const levelEl = document.getElementById('level');
        const heartsEl = document.getElementById('hearts');
        const crownEl = document.getElementById('crown-level');
        const gemsEl = document.getElementById('gems');
        const premiumBadge = document.getElementById('premium-badge');
        const offlineBtn = document.getElementById('offline-download-btn');
        
        // Recalculate level from XP to ensure consistency
        this.userProgress.level = this.calculateLevel();
        
        if (streakEl) streakEl.textContent = this.userProgress.streak || 0;
        if (xpEl) xpEl.textContent = this.userProgress.xp || 0;
        if (levelEl) levelEl.textContent = this.userProgress.level || 1;
        // Validate all stats before displaying
        this.validateHearts();
        this.validateGems();
        this.validateXP();
        
        if (heartsEl) heartsEl.textContent = this.userProgress.hearts !== undefined ? this.userProgress.hearts : 5;
        if (crownEl) crownEl.textContent = this.userProgress.crownLevel || 1;
        if (gemsEl) gemsEl.textContent = this.userProgress.gems || 0;
        
        // Show/hide premium badge
        if (premiumBadge) {
            premiumBadge.style.display = this.userProgress.isPremium ? 'inline-block' : 'none';
        }
        
        // Show/hide offline download button for premium users
        if (offlineBtn) {
            offlineBtn.style.display = this.userProgress.isPremium ? 'inline-block' : 'none';
        }
        
        // Update league
        this.updateLeagueDisplay();
        
        // Update daily progress
        const dailyProgressEl = document.getElementById('daily-progress');
        const dailyGoalEl = document.getElementById('daily-goal');
        const progressFillEl = document.getElementById('progress-fill');
        
        if (dailyProgressEl) dailyProgressEl.textContent = this.userProgress.dailyProgress || 0;
        if (dailyGoalEl) dailyGoalEl.textContent = this.userProgress.dailyGoal || 20;
        if (progressFillEl) {
            const dailyGoal = this.userProgress.dailyGoal || 20;
            const dailyProgress = this.userProgress.dailyProgress || 0;
            const progressPercent = dailyGoal > 0 ? (dailyProgress / dailyGoal) * 100 : 0;
            progressFillEl.style.width = `${Math.min(Math.max(progressPercent, 0), 100)}%`;
        }
        
        // Update SRS count
        const srsWords = this.getSpacedRepetitionWords().length;
        const srsCountEl = document.getElementById('srs-count');
        if (srsCountEl) {
            srsCountEl.textContent = `${srsWords} kelime`;
        }
        
        // Update weak words count
        const weakCountEl = document.getElementById('weak-count');
        if (weakCountEl) {
            weakCountEl.textContent = `${this.userProgress.weakWords.length} kelime`;
        }
        
        // Update badges
        this.renderBadges();
    }

    updateSessionHearts() {
        const heartsEl = document.getElementById('session-hearts');
        if (!heartsEl) return;
        
        const hearts = this.userProgress.isPremium ? '∞' : '❤️'.repeat(this.userProgress.hearts);
        heartsEl.textContent = hearts;
    }

    renderBadges() {
        const container = document.getElementById('badges-container');
        if (!container) return;
        
        const allBadges = [
            { id: 'first_steps', name: 'İlk Adımlar', icon: '👣', xp: 100 },
            { id: 'learner', name: 'Öğrenci', icon: '📚', xp: 500 },
            { id: 'scholar', name: 'Alim', icon: '🎓', xp: 1000 },
            { id: 'week_warrior', name: 'Hafta Savaşçısı', icon: '🔥', streak: 7 },
            { id: 'month_master', name: 'Ay Ustası', icon: '⭐', streak: 30 },
            { id: 'daily_achiever', name: 'Günlük Başarı', icon: '🎯' },
            { id: 'century', name: 'Yüzlük', icon: '💯', words: 100 },
            { id: 'half_k', name: 'Yarım Binlik', icon: '🏆', words: 500 }
        ];
        
        if (!this.userProgress.badges) {
            this.userProgress.badges = [];
        }
        
        container.innerHTML = allBadges.map(badge => {
            const unlocked = this.userProgress.badges.includes(badge.id);
            return `
                <div class="badge ${unlocked ? '' : 'locked'}" title="${badge.name}">
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    ${unlocked ? '<div class="badge-check">✓</div>' : ''}
                </div>
            `;
        }).join('');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            if (toast) {
                toast.classList.remove('show');
            }
        }, 3000);
    }

    // Hearts System
    loseHeart() {
        if (this.userProgress.isPremium) return;
        
        this.userProgress.hearts = Math.max(0, (this.userProgress.hearts || 0) - 1);
        this.validateHearts();
        this.saveProgress();
        this.updateDashboard();
        this.updateSessionHearts();
        
        const heartsEl = document.getElementById('session-hearts');
        if (heartsEl) {
            heartsEl.classList.add('heart-loss-animation');
            setTimeout(() => heartsEl.classList.remove('heart-loss-animation'), 500);
        }
    }

    initHeartsRefillTimer() {
        if (this.userProgress.isPremium) return;
        
        // Check hearts refill every minute
        setInterval(() => {
            this.checkHeartsRefill();
        }, 60000);
        
        // Initial check
        this.checkHeartsRefill();
    }

    checkHeartsRefill() {
        if (this.userProgress.isPremium) return;
        
        if (this.userProgress.hearts >= this.userProgress.maxHearts) {
            this.userProgress.heartsRefillTime = null;
            this.saveProgress();
            return;
        }
        
        const now = Date.now();
        const refillInterval = 30 * 60 * 1000; // 30 minutes
        
        if (!this.userProgress.heartsRefillTime) {
            // Start refill timer
            this.userProgress.heartsRefillTime = now;
            this.saveProgress();
            return;
        }
        
        const refillTime = this.userProgress.heartsRefillTime;
        const timePassed = now - refillTime;
        
        if (timePassed >= refillInterval) {
            const heartsToAdd = Math.floor(timePassed / refillInterval);
            this.userProgress.hearts = Math.min(this.userProgress.maxHearts, (this.userProgress.hearts || 0) + heartsToAdd);
            this.validateHearts();
            this.userProgress.heartsRefillTime = now - (timePassed % refillInterval);
            this.saveProgress();
            this.updateDashboard();
            this.updateSessionHearts();
            
            if (heartsToAdd > 0) {
                this.showToast(`❤️ ${heartsToAdd} can yenilendi!`, 'success');
            }
        }
    }

    refillHeartsWithGems() {
        if (this.userProgress.gems >= 50) {
            this.userProgress.gems -= 50;
            this.userProgress.hearts = this.userProgress.maxHearts;
            this.saveProgress();
            this.updateDashboard();
            this.updateSessionHearts();
            this.hideModal('hearts-modal');
            this.showToast('❤️ Canlarınız yenilendi!', 'success');
        } else {
            this.showToast('💎 Yeterli geminiz yok!', 'error');
        }
    }

    refillHeartsWithAd() {
        this.showModal('ad-modal');
    }

    watchAd() {
        // Simulate ad watching
        setTimeout(() => {
            this.userProgress.hearts = Math.min(this.userProgress.maxHearts, (this.userProgress.hearts || 0) + 1);
            this.validateHearts();
            this.saveProgress();
            this.updateDashboard();
            this.updateSessionHearts();
            this.hideModal('ad-modal');
            this.hideModal('hearts-modal');
            this.showToast('❤️ Reklam izlediğiniz için can kazandınız!', 'success');
        }, 2000);
    }

    // Dark Mode
    initDarkMode() {
        if (this.userProgress.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.textContent = '☀️';
            }
        }
    }

    toggleDarkMode() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themeToggle = document.getElementById('theme-toggle');
        
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            if (themeToggle) {
                themeToggle.textContent = '🌙';
            }
            this.userProgress.darkMode = false;
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggle) {
                themeToggle.textContent = '☀️';
            }
            this.userProgress.darkMode = true;
        }
        this.saveProgress();
    }

    // League System
    updateLeagueDisplay() {
        const leagueEl = document.getElementById('league-display');
        const leagueIconEl = document.getElementById('league-icon');
        const leagueNameEl = document.getElementById('league-name');
        
        if (!leagueEl || !leagueIconEl || !leagueNameEl) return;
        
        // Hide league if user hasn't played any games
        // Check if user has any progress
        if (!this.hasAnyProgress() && (this.userProgress.leagueXP || 0) === 0) {
            // Hide league display completely
            leagueEl.style.display = 'none';
            return;
        }
        
        // Show league display
        leagueEl.style.display = '';
        
        const leagues = {
            bronze: { icon: '🥉', name: 'Bronz' },
            silver: { icon: '🥈', name: 'Gümüş' },
            gold: { icon: '🥇', name: 'Altın' },
            platinum: { icon: '💎', name: 'Platin' },
            diamond: { icon: '💠', name: 'Elmas' }
        };
        
        // If league is not set or invalid, default to bronze only if user has some XP
        if (!this.userProgress.league || !leagues[this.userProgress.league]) {
            // Only set to bronze if user has XP, otherwise keep it null
            if ((this.userProgress.xp || 0) > 0) {
                this.userProgress.league = 'bronze';
            } else {
                // No XP, hide league
                leagueEl.style.display = 'none';
                return;
            }
        }
        
        const currentLeague = leagues[this.userProgress.league] || leagues.bronze;
        leagueIconEl.textContent = currentLeague.icon;
        leagueNameEl.textContent = currentLeague.name;
        leagueEl.className = `stat-item league-item ${this.userProgress.league}`;
        
        // Check league progression
        const leagueThresholds = { bronze: 0, silver: 500, gold: 1500, platinum: 3000, diamond: 5000 };
        const nextLeague = this.getNextLeague();
        if (nextLeague && this.userProgress.leagueXP >= leagueThresholds[nextLeague]) {
            this.userProgress.league = nextLeague;
            this.showToast(`🎉 ${leagues[nextLeague].name} Ligine Yükseldiniz!`, 'success');
            this.saveProgress();
        }
    }

    getNextLeague() {
        const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const currentIndex = order.indexOf(this.userProgress.league);
        return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
    }

    // Crown Level
    updateCrownLevel() {
        const crownXP = Math.floor(this.userProgress.xp / 1000);
        const newCrownLevel = Math.floor(crownXP / 5) + 1;
        
        if (newCrownLevel > this.userProgress.crownLevel) {
            this.userProgress.crownLevel = newCrownLevel;
            this.showToast(`👑 Crown Seviyesi ${newCrownLevel}!`, 'success');
            this.saveProgress();
        }
    }

    // Chapters/Units
    initChapters() {
        if (!this.words || this.words.length === 0) {
            // Words not loaded yet, will be called after loadWords
            return;
        }
        
        // Filter words that have difficulty
        const wordsWithDifficulty = this.words.filter(w => w.word_diffuculty !== undefined && w.word_diffuculty !== null);
        
        if (wordsWithDifficulty.length === 0) {
            console.warn('No words with difficulty found');
            return;
        }
        
        // Find min and max difficulty
        const difficulties = wordsWithDifficulty.map(w => w.word_diffuculty);
        const minDifficulty = Math.min(...difficulties);
        const maxDifficulty = Math.max(...difficulties);
        const difficultyRange = maxDifficulty - minDifficulty;
        
        // Create chapters based on word difficulty (10 chapters)
        const chapters = [];
        const wordsPerChapter = Math.ceil(wordsWithDifficulty.length / 10);
        
        for (let i = 1; i <= 10; i++) {
            // Calculate difficulty range for this chapter
            const chapterMinDifficulty = minDifficulty + ((i - 1) * difficultyRange / 10);
            const chapterMaxDifficulty = minDifficulty + (i * difficultyRange / 10);
            
            let chapterWords;
            if (i === 10) {
                // Last chapter includes max difficulty
                chapterWords = wordsWithDifficulty.filter(w => 
                    w.word_diffuculty >= chapterMinDifficulty && w.word_diffuculty <= chapterMaxDifficulty
                );
            } else {
                chapterWords = wordsWithDifficulty.filter(w => 
                    w.word_diffuculty >= chapterMinDifficulty && w.word_diffuculty < chapterMaxDifficulty
                );
            }
            
            // If chapter is empty, try to distribute words evenly
            if (chapterWords.length === 0 && i <= 5) {
                // For first 5 chapters, distribute words evenly
                const startIndex = (i - 1) * wordsPerChapter;
                const endIndex = Math.min(i * wordsPerChapter, wordsWithDifficulty.length);
                chapterWords = wordsWithDifficulty.slice(startIndex, endIndex);
            }
            
            chapters.push({
                id: i,
                name: `Bölüm ${i}`,
                difficulty: i,
                words: chapterWords
            });
        }
        
        // Remove empty chapters and ensure at least chapter 1 exists
        this.chapters = chapters.filter(ch => ch.words.length > 0);
        
        // If no chapters created, create a default chapter with all words
        if (this.chapters.length === 0 && wordsWithDifficulty.length > 0) {
            this.chapters = [{
                id: 1,
                name: 'Bölüm 1',
                difficulty: 1,
                words: wordsWithDifficulty.slice(0, 50) // First 50 words
            }];
        }
        
        // Ensure chapter 1 exists
        if (this.chapters.length > 0 && this.chapters[0].id !== 1) {
            // Re-index chapters to start from 1
            this.chapters = this.chapters.map((ch, index) => ({
                ...ch,
                id: index + 1,
                name: `Bölüm ${index + 1}`
            }));
        }
        
        this.renderChapters();
    }

    renderChapters() {
        const container = document.getElementById('chapters-container');
        if (!container) return;
        
        if (!this.chapters || this.chapters.length === 0) {
            container.innerHTML = '<p>Bölümler yükleniyor...</p>';
            return;
        }
        
        // Filter: Only show chapters that are unlocked or can be unlocked
        // Show chapter if:
        // 1. It's the first chapter (id === 1)
        // 2. Previous chapter is completed
        // 3. Previous chapter has been started (at least 1 word learned)
        const visibleChapters = this.chapters.filter(chapter => {
            if (chapter.id === 1) {
                return true; // Always show first chapter
            }
            
            // Check if previous chapter is completed or started
            const prevChapterId = chapter.id - 1;
            const prevChapter = this.chapters.find(c => c.id === prevChapterId);
            if (!prevChapter || !prevChapter.words) return false;
            
            const prevProgress = this.userProgress.chapters[prevChapterId];
            if (!prevProgress) return false;
            
            const prevTotal = prevChapter.words.length;
            const prevChapterWordIds = prevChapter.words.map(w => w.id_number);
            const prevHasLearnedWords = prevProgress.learnedWords && prevProgress.learnedWords.length > 0;
            const prevValidLearnedWords = prevHasLearnedWords ? 
                prevProgress.learnedWords.filter(id => prevChapterWordIds.includes(id)).length : 0;
            
            // Show if previous chapter is completed or at least started (has at least 1 valid learned word)
            return prevValidLearnedWords > 0;
        });
        
        if (visibleChapters.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">İlk bölümü başlatmak için tıklayın! 📚</p>';
            return;
        }
        
        container.innerHTML = visibleChapters.map(chapter => {
            // Get progress from userProgress, ensure it's clean
            const savedProgress = this.userProgress.chapters[chapter.id];
            const progress = savedProgress ? {
                completed: savedProgress.completed || 0,
                total: savedProgress.total || chapter.words.length,
                learnedWords: savedProgress.learnedWords || []
            } : { 
                completed: 0, 
                total: chapter.words.length,
                learnedWords: []
            };
            
            // Ensure total matches actual word count
            const actualTotal = chapter.words.length;
            
            // Verify that learnedWords actually contains words from this chapter
            const chapterWordIds = chapter.words.map(w => w.id_number);
            const hasLearnedWords = progress.learnedWords && progress.learnedWords.length > 0;
            const validLearnedWords = hasLearnedWords ? 
                progress.learnedWords.filter(id => chapterWordIds.includes(id)).length : 0;
            
            // Use validLearnedWords for display (only count words that actually belong to this chapter)
            const actualCompleted = validLearnedWords;
            
            // Fix: Only mark as completed if:
            // 1. There are words in the chapter (actualTotal > 0)
            // 2. All words are learned (actualCompleted >= actualTotal)
            // 3. User has actually played (has XP or learned words)
            // 4. learnedWords array contains actual word IDs from the chapter
            const hasAnyProgress = this.hasAnyProgress();
            
            const isCompleted = actualTotal > 0 && 
                               actualCompleted >= actualTotal && 
                               hasAnyProgress && 
                               hasLearnedWords &&
                               actualCompleted > 0; // Must have at least 1 word learned
            
            // Lock check: previous chapter must be completed
            const isLocked = chapter.id > 1 && (() => {
                const prevChapterId = chapter.id - 1;
                const prevChapter = this.chapters.find(c => c.id === prevChapterId);
                if (!prevChapter) return true;
                
                const prevProgress = this.userProgress.chapters[prevChapterId];
                if (!prevProgress) return true;
                
                const prevTotal = prevChapter.words.length;
                const prevChapterWordIds = prevChapter.words.map(w => w.id_number);
                const prevHasLearnedWords = prevProgress.learnedWords && prevProgress.learnedWords.length > 0;
                const prevValidLearnedWords = prevHasLearnedWords ? 
                    prevProgress.learnedWords.filter(id => prevChapterWordIds.includes(id)).length : 0;
                return prevTotal === 0 || prevValidLearnedWords < prevTotal;
            })();
            
            const progressPercent = actualTotal > 0 ? Math.min((actualCompleted / actualTotal) * 100, 100) : 0;
            
            return `
                <div class="chapter-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" data-chapter="${chapter.id}">
                    <h3>${chapter.name} ${isCompleted ? '✅' : ''}</h3>
                    <p>${actualTotal} kelime</p>
                    <div class="chapter-progress">
                        <div class="chapter-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <p>${actualCompleted}/${actualTotal}</p>
                    ${isCompleted ? '<p style="color: var(--success-color); font-weight: 600; margin-top: 8px;">Tamamlandı!</p>' : ''}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.chapter-card').forEach(card => {
            card.addEventListener('click', () => {
                const chapterId = parseInt(card.dataset.chapter);
                if (!card.classList.contains('locked')) {
                    this.startChapter(chapterId);
                }
            });
        });
    }

    startChapter(chapterId) {
        // Stop all audio when starting a new chapter
        this.stopAllAudio();
        const chapter = this.chapters.find(c => c.id === chapterId);
        if (!chapter) {
            this.showToast('❌ Bölüm bulunamadı!', 'error');
            return;
        }
        
        // Check if chapter has words
        if (!chapter.words || chapter.words.length === 0) {
            this.showToast('❌ Bu bölümde kelime bulunamadı!', 'error');
            return;
        }
        
        // Check if chapter is locked
        if (chapterId > 1) {
            const prevChapterId = chapterId - 1;
            const prevChapter = this.chapters.find(c => c.id === prevChapterId);
            const prevProgress = this.userProgress.chapters[prevChapterId];
            
            if (!prevChapter || !prevChapter.words || !prevProgress) {
                this.showToast('🔒 Önceki bölümü tamamlamalısınız!', 'error');
                return;
            }
            
            // Check if previous chapter is actually completed
            const prevChapterWordIds = prevChapter.words.map(w => w.id_number);
            const prevHasLearnedWords = prevProgress.learnedWords && prevProgress.learnedWords.length > 0;
            const prevValidLearnedWords = prevHasLearnedWords ? 
                prevProgress.learnedWords.filter(id => prevChapterWordIds.includes(id)).length : 0;
            const prevTotal = prevChapter.words.length;
            
            if (prevValidLearnedWords < prevTotal) {
                this.showToast('🔒 Önceki bölümü tamamlamalısınız!', 'error');
                return;
            }
        }
        
        // Initialize chapter progress if not exists
        if (!this.userProgress.chapters[chapterId]) {
            this.userProgress.chapters[chapterId] = {
                completed: 0,
                total: chapter.words.length,
                learnedWords: []
            };
            this.saveProgress();
        }
        
        this.currentChapter = chapter;
        this.currentMode = 'chapter';
        this.sessionStats = { correct: 0, wrong: 0 };
        
        const dashboardView = document.getElementById('dashboard-view');
        const learningView = document.getElementById('learning-view');
        const modeTitle = document.getElementById('mode-title');
        
        if (!dashboardView || !learningView || !modeTitle) {
            this.showToast('❌ Sayfa yüklenemedi!', 'error');
            return;
        }
        
        dashboardView.classList.remove('active');
        learningView.classList.add('active');
        modeTitle.textContent = `📚 ${chapter.name}`;
        this.updateSessionHearts();
        this.nextQuestion();
    }

    // Skill Tree
    initSkillTree() {
        const skills = [
            { id: 1, name: 'Temel Kelimeler', icon: '📚', unlocked: true, requires: [] },
            { id: 2, name: 'Günlük Konuşma', icon: '💬', unlocked: false, requires: [1] },
            { id: 3, name: 'İş Hayatı', icon: '💼', unlocked: false, requires: [1] },
            { id: 4, name: 'Akademik', icon: '🎓', unlocked: false, requires: [2, 3] },
            { id: 5, name: 'Edebiyat', icon: '📖', unlocked: false, requires: [4] }
        ];
        
        this.skillTree = skills;
        this.renderSkillTree();
    }

    renderSkillTree() {
        const container = document.getElementById('skill-tree-container');
        if (!container) return;
        
        // Filter: Only show unlocked skills or skills that can be unlocked
        const hasAnyProgress = this.hasAnyProgress();
        
        const visibleSkills = this.skillTree.filter(skill => {
            const unlocked = this.userProgress.skillTree[skill.id] || skill.unlocked;
            const canUnlock = skill.requires.every(req => this.userProgress.skillTree[req] || this.skillTree.find(s => s.id === req)?.unlocked);
            // Show if unlocked, can unlock, or if it's the first skill and user has progress
            return unlocked || canUnlock || (skill.id === 1 && hasAnyProgress);
        });
        
        if (visibleSkills.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: white; font-weight: 600; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">İlk kelimeleri öğrenmeye başladığınızda ders ağacı açılacak! 🌳</p>';
            return;
        }
        
        container.innerHTML = visibleSkills.map(skill => {
            const unlocked = this.userProgress.skillTree[skill.id] || skill.unlocked;
            const canUnlock = skill.requires.every(req => this.userProgress.skillTree[req] || this.skillTree.find(s => s.id === req)?.unlocked);
            
            return `
                <div class="skill-node ${unlocked ? 'unlocked' : canUnlock ? '' : 'locked'}" 
                     data-skill="${skill.id}" title="${skill.name}">
                    ${skill.icon}
                    ${!unlocked && canUnlock ? '<div style="font-size: 12px; margin-top: 4px;">Açılabilir</div>' : ''}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.skill-node').forEach(node => {
            node.addEventListener('click', () => {
                const skillId = parseInt(node.dataset.skill);
                this.unlockSkill(skillId);
            });
        });
    }

    unlockSkill(skillId) {
        const skill = this.skillTree.find(s => s.id === skillId);
        if (!skill) return;
        
        // Check if already unlocked
        if (this.userProgress.skillTree[skillId] || skill.unlocked) {
            this.showToast(`🌳 ${skill.name} zaten açık!`, 'info');
            return;
        }
        
        // Check requirements
        const canUnlock = skill.requires.every(req => 
            this.userProgress.skillTree[req] || 
            this.skillTree.find(s => s.id === req)?.unlocked
        );
        
        if (!canUnlock) {
            const missingSkills = skill.requires.filter(req => 
                !this.userProgress.skillTree[req] && 
                !this.skillTree.find(s => s.id === req)?.unlocked
            );
            const missingNames = missingSkills.map(id => 
                this.skillTree.find(s => s.id === id)?.name
            ).filter(Boolean).join(', ');
            this.showToast(`🔒 Önce şunları açmalısınız: ${missingNames}`, 'error');
            return;
        }
        
        // Check XP requirement (optional - can be added)
        const xpRequirements = { 1: 0, 2: 200, 3: 200, 4: 500, 5: 1000 };
        if (this.userProgress.xp < (xpRequirements[skillId] || 0)) {
            this.showToast(`🔒 Bu beceriyi açmak için ${xpRequirements[skillId]} XP gerekli!`, 'error');
            return;
        }
        
        // Unlock skill
        this.userProgress.skillTree[skillId] = true;
        this.saveProgress();
        this.renderSkillTree();
        this.showToast(`🌳 ${skill.name} açıldı!`, 'success');
        this.animateConfetti();
    }
    
    checkAutoUnlockSkills() {
        // Auto-unlock skills based on XP
        this.skillTree.forEach(skill => {
            if (this.userProgress.skillTree[skill.id] || skill.unlocked) return;
            
            const canUnlock = skill.requires.every(req => 
                this.userProgress.skillTree[req] || 
                this.skillTree.find(s => s.id === req)?.unlocked
            );
            
            if (canUnlock) {
                const xpRequirements = { 1: 0, 2: 200, 3: 200, 4: 500, 5: 1000 };
                if (this.userProgress.xp >= (xpRequirements[skill.id] || 0)) {
                    this.userProgress.skillTree[skill.id] = true;
                    this.showToast(`🌳 ${skill.name} otomatik açıldı!`, 'success');
                }
            }
        });
        
        this.saveProgress();
        this.renderSkillTree();
    }

    // Stories
    initStories() {
        const stories = [
            { id: 1, title: 'İlk Gün', description: 'Yeni başlangıçlar', words: 20 },
            { id: 2, title: 'Pazar Günü', description: 'Alışveriş macerası', words: 30 },
            { id: 3, title: 'Okul Günü', description: 'Eğitim yolculuğu', words: 40 }
        ];
        
        this.stories = stories;
        this.renderStories();
    }

    renderStories() {
        const container = document.getElementById('stories-container');
        if (!container) return;
        
        // Filter: Only show stories that are started or can be started (first story)
        const hasAnyProgress = this.hasAnyProgress();
        
        const visibleStories = this.stories.filter((story, index) => {
            const progress = this.userProgress.stories[story.id] || { completed: 0, words: [] };
            const hasProgress = (progress.words && progress.words.length > 0) || progress.completed > 0;
            // Show first story if user has any progress, or show any story that has been started
            return hasProgress || (index === 0 && hasAnyProgress);
        });
        
        if (visibleStories.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: white; font-weight: 600; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">İlk kelimeleri öğrenmeye başladığınızda hikayeler açılacak! 📖</p>';
            return;
        }
        
        container.innerHTML = visibleStories.map(story => {
            const progress = this.userProgress.stories[story.id] || { completed: 0, words: [] };
            const completed = progress.words ? progress.words.length : progress.completed;
            const progressPercent = (completed / story.words) * 100;
            const isCompleted = completed >= story.words;
            
            return `
                <div class="story-card ${isCompleted ? 'completed' : ''}" data-story="${story.id}">
                    <div class="story-title">${story.title} ${isCompleted ? '✅' : ''}</div>
                    <div class="story-description">${story.description}</div>
                    <div class="story-progress">
                        <div class="story-progress-fill" style="width: ${Math.min(progressPercent, 100)}%"></div>
                    </div>
                    <p>${completed}/${story.words} kelime</p>
                    ${isCompleted ? '<p style="color: var(--success-color); font-weight: 600; margin-top: 8px;">Tamamlandı!</p>' : ''}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.story-card').forEach(card => {
            card.addEventListener('click', () => {
                const storyId = parseInt(card.dataset.story);
                this.startStory(storyId);
            });
        });
    }

    startStory(storyId) {
        // Stop all audio when starting a new story
        this.stopAllAudio();
        
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;
        
        // Check hearts using centralized function
        if (!this.canPlay()) {
            this.showModal('hearts-modal');
            return;
        }
        
        this.currentStory = story;
        this.currentMode = 'story';
        this.sessionStats = { correct: 0, wrong: 0 };
        
        // Get story words (filter words that have context)
        const storyWords = this.words
            .filter(w => w.ayah_text && w.meal)
            .sort(() => Math.random() - 0.5)
            .slice(0, story.words);
        
        this.storyWords = storyWords;
        this.storyWordIndex = 0;
        this.storyProgress = this.userProgress.stories[storyId] || { completed: 0, words: [] };
        
        const dashboardView = document.getElementById('dashboard-view');
        const learningView = document.getElementById('learning-view');
        const modeTitle = document.getElementById('mode-title');
        
        if (dashboardView) dashboardView.classList.remove('active');
        if (learningView) learningView.classList.add('active');
        if (modeTitle) modeTitle.textContent = `📖 ${story.title}`;
        
        this.updateSessionHearts();
        this.nextStoryQuestion();
    }

    nextStoryQuestion() {
        if (!this.storyWords || this.storyWordIndex >= this.storyWords.length) {
            // Story completed
            const progress = this.userProgress.stories[this.currentStory.id] || { completed: 0, words: [] };
            progress.completed = this.currentStory.words;
            if (!progress.words) progress.words = [];
            this.userProgress.stories[this.currentStory.id] = progress;
            this.addXP(50);
            this.saveProgress();
            this.showToast(`🎉 Hikaye tamamlandı! +50 XP`, 'success');
            this.renderStories();
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        const word = this.storyWords[this.storyWordIndex];
        if (!word) {
            this.showDashboard();
            return;
        }
        
        this.currentQuestion = word;
        this.renderStoryQuestion(word, this.storyWordIndex);
        this.updateSessionStats();
    }

    renderStoryQuestion(word, index) {
        if (!word) {
            console.error('renderStoryQuestion: word is null or undefined');
            this.showToast('❌ Soru yüklenemedi!', 'error');
            return;
        }
        
        const questionContent = document.getElementById('question-content');
        const answerOptions = document.getElementById('answer-options');
        const feedbackArea = document.getElementById('feedback-area');
        const nextBtn = document.getElementById('next-btn');
        
        if (!questionContent || !answerOptions) {
            console.error('renderStoryQuestion: Required DOM elements not found');
            return;
        }
        
        if (feedbackArea) feedbackArea.innerHTML = '';
        if (nextBtn) nextBtn.style.display = 'none';
        
        questionContent.innerHTML = `
            <div class="story-progress-indicator">
                <p>Kelime ${index + 1} / ${this.storyWords.length}</p>
            </div>
            <div class="ayah-text">${word.ayah_text}</div>
            <div class="meal-text">${word.meal}</div>
            <div class="turkish-meaning">Yukarıdaki cümlede "<strong>${word.arabic_word}</strong>" kelimesinin anlamı nedir?</div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.ayah_sound_url}')">
                    🎵 Ayeti Dinle
                </button>
            </div>
        `;
        
        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }

    // Challenges
    initChallenges() {
        const challenges = [
            { id: 1, name: 'Hızlı Öğrenci', description: '10 dakikada 20 kelime', time: 600, reward: { xp: 100, gems: 10 } },
            { id: 2, name: 'Mükemmellik', description: '10 soruda %100 doğru', target: 10, reward: { xp: 150, gems: 15 } },
            { id: 3, name: 'Hız Rekortmeni', description: '5 dakikada 15 kelime', time: 300, reward: { xp: 200, gems: 20 } }
        ];
        
        this.challenges = challenges;
        this.renderChallenges();
    }

    renderChallenges() {
        const container = document.getElementById('challenges-container');
        if (!container) return;
        
        // Filter: Only show challenges that are active or the first challenge if user has progress
        const hasAnyProgress = this.hasAnyProgress();
        
        const visibleChallenges = this.challenges.filter((challenge, index) => {
            const active = this.userProgress.challenges[challenge.id]?.active || false;
            const completed = this.userProgress.challenges[challenge.id]?.completed || false;
            // Show if active, completed, or if it's the first challenge and user has progress
            return active || completed || (index === 0 && hasAnyProgress);
        });
        
        if (visibleChallenges.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: white; font-weight: 600; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">İlk kelimeleri öğrenmeye başladığınızda görevler açılacak! ⚡</p>';
            return;
        }
        
        container.innerHTML = visibleChallenges.map(challenge => {
            const active = this.userProgress.challenges[challenge.id]?.active || false;
            const completed = this.userProgress.challenges[challenge.id]?.completed || false;
            
            return `
                <div class="challenge-card ${active ? 'active' : ''} ${completed ? 'completed' : ''}" data-challenge="${challenge.id}">
                    <h3>${challenge.name} ${completed ? '✅' : ''}</h3>
                    <p>${challenge.description}</p>
                    <div class="challenge-reward">
                        <span>Ödül: +${challenge.reward.xp} XP</span>
                        <span>+${challenge.reward.gems} 💎</span>
                    </div>
                    <button class="btn btn-primary" onclick="app.startChallenge(${challenge.id})">
                        ${completed ? 'Tamamlandı' : active ? 'Devam Et' : 'Başla'}
                    </button>
                </div>
            `;
        }).join('');
    }

    startChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;
        
        this.currentChallenge = challenge;
        const challengeData = this.userProgress.challenges[challengeId] || {};
        
        if (!challengeData.active) {
            challengeData.active = true;
            challengeData.startTime = Date.now();
            challengeData.correct = 0;
            challengeData.total = 0;
            this.userProgress.challenges[challengeId] = challengeData;
            this.saveProgress();
        }
        
        this.startChallengeTimer();
        this.startLearningMode('interleaved');
    }

    startChallengeTimer() {
        if (!this.currentChallenge) return;
        
        const timerEl = document.getElementById('challenge-timer');
        if (!timerEl) return;
        
        // Only show timer if challenge has time limit
        if (!this.currentChallenge.time) {
            timerEl.style.display = 'none';
            return;
        }
        
        timerEl.style.display = 'block';
        const challengeData = this.userProgress.challenges[this.currentChallenge.id];
        if (!challengeData || !challengeData.startTime) return;
        
        const startTime = challengeData.startTime;
        const endTime = startTime + (this.currentChallenge.time * 1000);
        
        const updateTimer = () => {
            if (!this.currentChallenge) {
                timerEl.style.display = 'none';
                return;
            }
            
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            const timeEl = document.getElementById('challenge-time');
            if (timeEl) {
                timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            if (remaining > 0) {
                setTimeout(updateTimer, 1000);
            } else {
                this.completeChallenge(this.currentChallenge.id, false);
                timerEl.style.display = 'none';
            }
        };
        
        updateTimer();
    }

    completeChallenge(challengeId, success) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;
        
        const challengeData = this.userProgress.challenges[challengeId];
        if (!challengeData) return;
        
        if (success) {
            this.userProgress.xp += challenge.reward.xp;
            this.userProgress.gems += challenge.reward.gems;
            this.validateXP();
            this.validateGems();
            this.validateGems();
            this.showToast(`🎉 Görev tamamlandı! +${challenge.reward.xp} XP, +${challenge.reward.gems} 💎`, 'success');
            this.animateConfetti();
        } else {
            this.showToast('⏱️ Süre doldu! Görev tamamlanamadı.', 'error');
        }
        
        challengeData.active = false;
        challengeData.completed = success;
        this.currentChallenge = null;
        this.saveProgress();
        this.updateDashboard();
        this.renderChallenges();
        
        const timerEl = document.getElementById('challenge-timer');
        if (timerEl) {
            timerEl.style.display = 'none';
        }
    }

    // Test-Out
    initTestOut() {
        const tests = [
            { id: 1, name: 'Temel Seviye Testi', level: 1, questions: 20 },
            { id: 2, name: 'Orta Seviye Testi', level: 5, questions: 30 },
            { id: 3, name: 'İleri Seviye Testi', level: 10, questions: 40 }
        ];
        
        this.testOuts = tests;
        this.renderTestOut();
    }

    renderTestOut() {
        const container = document.getElementById('test-out-container');
        if (!container) return;
        
        // Recalculate level to ensure it's correct (use centralized function)
        const currentLevel = this.calculateLevel();
        
        container.innerHTML = this.testOuts.map(test => {
            const canTake = currentLevel >= test.level;
            
            return `
                <div class="test-out-card ${canTake ? '' : 'locked'}" data-test="${test.id}">
                    <h3>${test.name}</h3>
                    <p>${test.questions} soru</p>
                    <p>Gereken Seviye: ${test.level}</p>
                    <p>Mevcut Seviyeniz: ${currentLevel}</p>
                    ${canTake ? '<button class="btn btn-primary">Sınava Başla</button>' : '<p>🔒 Kilitli - Seviye ${test.level} gerekiyor</p>'}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.test-out-card').forEach(card => {
            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    const testId = parseInt(card.dataset.test);
                    this.startTestOut(testId);
                });
            }
        });
    }

    startTestOut(testId) {
        // Stop all audio when starting a new test
        this.stopAllAudio();
        
        const test = this.testOuts.find(t => t.id === testId);
        if (!test) return;
        
        // Check level requirement
        const currentLevel = this.calculateLevel();
        if (currentLevel < test.level) {
            this.showToast(`🔒 Bu sınav için seviye ${test.level} gerekiyor!`, 'error');
            return;
        }
        
        // Check hearts using centralized function
        if (!this.canPlay()) {
            this.showModal('hearts-modal');
            return;
        }
        
        this.currentTest = test;
        this.currentMode = 'test-out';
        this.sessionStats = { correct: 0, wrong: 0 };
        
        // Get test words based on level
        const testWords = this.words
            .filter(w => {
                const difficulty = Math.floor(w.word_diffuculty / 1.5);
                return difficulty >= (test.level - 1) && difficulty < test.level + 2;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, test.questions);
        
        // Edge case: Check if test words are available
        if (!testWords || testWords.length === 0) {
            this.showToast('⚠️ Bu seviye için yeterli kelime bulunamadı!', 'error');
            return;
        }
        
        this.testWords = testWords;
        this.testWordIndex = 0;
        this.testAnswers = [];
        this.testStartTime = Date.now();
        
        const dashboardView = document.getElementById('dashboard-view');
        const learningView = document.getElementById('learning-view');
        const modeTitle = document.getElementById('mode-title');
        
        if (dashboardView) dashboardView.classList.remove('active');
        if (learningView) learningView.classList.add('active');
        if (modeTitle) modeTitle.textContent = `📝 ${test.name}`;
        
        this.updateSessionHearts();
        this.nextTestOutQuestion();
    }

    nextTestOutQuestion() {
        // Edge case: Check if test words exist
        if (!this.testWords || this.testWords.length === 0) {
            this.showToast('⚠️ Test kelimeleri yüklenemedi!', 'error');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        // Edge case: Check if test is actually completed (all questions answered)
        if (this.testWordIndex >= this.testWords.length) {
            // Only complete if we actually answered questions
            if (this.testAnswers && this.testAnswers.length > 0) {
                this.completeTestOut();
            } else {
                // Test was never started properly, go back to dashboard
                this.showToast('⚠️ Test başlatılamadı!', 'error');
                setTimeout(() => this.showDashboard(), 2000);
            }
            return;
        }
        
        const word = this.testWords[this.testWordIndex];
        if (!word) {
            this.showToast('⚠️ Soru yüklenemedi!', 'error');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        this.currentQuestion = word;
        this.renderTestOutQuestion(word, this.testWordIndex);
        this.updateSessionStats();
    }

    renderTestOutQuestion(word, index) {
        if (!word) {
            console.error('renderTestOutQuestion: word is null or undefined');
            this.showToast('❌ Soru yüklenemedi!', 'error');
            return;
        }
        
        const questionContent = document.getElementById('question-content');
        const answerOptions = document.getElementById('answer-options');
        const feedbackArea = document.getElementById('feedback-area');
        const nextBtn = document.getElementById('next-btn');
        
        if (!questionContent || !answerOptions) {
            console.error('renderTestOutQuestion: Required DOM elements not found');
            return;
        }
        
        if (feedbackArea) feedbackArea.innerHTML = '';
        if (nextBtn) nextBtn.style.display = 'none';
        
        const questionType = Math.random() > 0.5 ? 'recognition' : 'recall';
        
        if (questionType === 'recognition') {
            questionContent.innerHTML = `
                <div class="test-progress-indicator">
                    <p>Soru ${index + 1} / ${this.testWords.length}</p>
                </div>
                <div class="arabic-word">${word.arabic_word}</div>
                <div class="turkish-meaning">Bu kelimenin anlamını seçin:</div>
                <div class="audio-controls">
                    <button class="audio-btn" onclick="app.playAudio('${word.sound_url}')">
                        🔊 Kelimeyi Dinle
                    </button>
                </div>
            `;
            
            const options = this.generateAnswerOptions(word);
            answerOptions.innerHTML = options.map((opt, idx) => 
                `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
            ).join('');
        } else {
            questionContent.innerHTML = `
                <div class="test-progress-indicator">
                    <p>Soru ${index + 1} / ${this.testWords.length}</p>
                </div>
                <div class="turkish-meaning">"${word.turkish_mean}" anlamına gelen kelimeyi seçin:</div>
                <div class="audio-controls">
                    <button class="audio-btn" onclick="app.playAudio('${word.sound_url}')">
                        🔊 Sesleri Dinle
                    </button>
                </div>
            `;
            
            const options = this.generateArabicOptions(word);
            answerOptions.innerHTML = options.map((opt, idx) => 
                `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
            ).join('');
        }
    }

    completeTestOut() {
        // Edge case: Check if test was actually started
        if (!this.testStartTime || !this.testWords || this.testWords.length === 0) {
            this.showToast('⚠️ Test düzgün başlatılamadı!', 'error');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        // Edge case: Check if any questions were answered
        if (!this.testAnswers || this.testAnswers.length === 0) {
            this.showToast('⚠️ Hiç soru cevaplanmadı!', 'error');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        const totalTime = Math.floor((Date.now() - this.testStartTime) / 1000);
        const score = this.sessionStats.correct;
        const total = this.testWords.length;
        const percentage = Math.round((score / total) * 100);
        
        // Calculate XP reward based on performance
        let xpReward = 0;
        let gemsReward = 0;
        if (percentage >= 90) {
            xpReward = 100;
            gemsReward = 20;
        } else if (percentage >= 70) {
            xpReward = 70;
            gemsReward = 10;
        } else if (percentage >= 50) {
            xpReward = 50;
            gemsReward = 5;
        } else {
            xpReward = 30;
        }
        
        this.userProgress.gems += gemsReward;
        this.validateGems();
        this.addXP(xpReward);
        this.saveProgress();
        
        const feedbackArea = document.getElementById('feedback-area');
        const questionContent = document.getElementById('question-content');
        const answerOptions = document.getElementById('answer-options');
        const nextBtn = document.getElementById('next-btn');
        
        questionContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">${percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '📝'}</div>
                <h2>Sınav Tamamlandı!</h2>
                <div style="margin: 20px 0;">
                    <p style="font-size: 24px; font-weight: 700; color: var(--primary-color);">
                        ${score} / ${total} Doğru
                    </p>
                    <p style="font-size: 20px; color: var(--text-secondary);">
                        %${percentage} Başarı
                    </p>
                    <p style="font-size: 16px; color: var(--text-secondary); margin-top: 10px;">
                        Süre: ${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}
                    </p>
                </div>
                <div style="margin-top: 30px;">
                    <p style="font-size: 18px; color: var(--success-color); font-weight: 600;">
                        +${xpReward} XP
                    </p>
                    ${gemsReward > 0 ? `<p style="font-size: 18px; color: var(--warning-color); font-weight: 600;">+${gemsReward} 💎</p>` : ''}
                </div>
            </div>
        `;
        
        answerOptions.innerHTML = '';
        feedbackArea.innerHTML = '';
        nextBtn.style.display = 'block';
        nextBtn.textContent = 'Ana Sayfaya Dön';
        nextBtn.onclick = () => {
            this.showDashboard();
            nextBtn.textContent = 'Sonraki →';
            nextBtn.onclick = () => this.nextQuestion();
        };
        
        this.animateConfetti();
    }

    // Shop
    initShop() {
        const shopItems = [
            { id: 'hearts', name: '5 Can', icon: '❤️', price: 50, type: 'hearts' },
            { id: 'gems_100', name: '100 Gems', icon: '💎', price: 0, type: 'gems', realMoney: true },
            { id: 'premium', name: 'Premium Üyelik', icon: '⭐', price: 0, type: 'premium', realMoney: true },
            { id: 'streak_freeze', name: 'Streak Freeze', icon: '❄️', price: 100, type: 'streak_freeze' }
        ];
        
        this.shopItems = shopItems;
        this.renderShop();
    }

    renderShop() {
        const container = document.getElementById('shop-content');
        if (!container) return;
        
        container.innerHTML = this.shopItems.map(item => {
            return `
                <div class="shop-item" data-item="${item.id}">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-price">
                        ${item.realMoney ? '₺' : ''}${item.price} ${item.realMoney ? '' : '💎'}
                    </div>
                    <button class="btn btn-primary" onclick="app.purchaseItem('${item.id}')">Satın Al</button>
                </div>
            `;
        }).join('');
    }

    purchaseItem(itemId) {
        const item = this.shopItems.find(i => i.id === itemId);
        if (!item) return;
        
        if (item.realMoney) {
            this.showToast('💳 Gerçek para ödemeleri yakında eklenecek!', 'info');
            return;
        }
        
        if (this.userProgress.gems >= item.price) {
            this.userProgress.gems -= item.price;
            
            switch(item.type) {
                case 'hearts':
                    this.userProgress.hearts = Math.min(this.userProgress.maxHearts, (this.userProgress.hearts || 0) + 5);
                    this.validateHearts();
                    break;
                case 'premium':
                    this.userProgress.isPremium = true;
                    this.showToast('⭐ Premium üyelik aktif! Tüm özelliklere erişebilirsiniz.', 'success');
                    break;
            }
            
            this.saveProgress();
            this.updateDashboard();
            this.renderShop();
            this.showToast(`✅ ${item.name} satın alındı!`, 'success');
        } else {
            this.showToast('💎 Yeterli geminiz yok!', 'error');
        }
    }

    // Leaderboard
    initLeaderboard() {
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        // Simulate leaderboard data
        this.leaderboard = [
            { id: 1, name: 'Kullanıcı1', xp: 5000, level: 25, league: 'diamond' },
            { id: 2, name: 'Kullanıcı2', xp: 4500, level: 23, league: 'platinum' },
            { id: 3, name: 'Kullanıcı3', xp: 4000, level: 20, league: 'gold' },
            { id: 4, name: 'Sen', xp: this.userProgress.xp, level: this.userProgress.level, league: this.userProgress.league },
            { id: 5, name: 'Kullanıcı4', xp: 3500, level: 18, league: 'silver' }
        ].sort((a, b) => b.xp - a.xp);
        
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;
        
        container.innerHTML = this.leaderboard.map((user, index) => {
            const isCurrentUser = user.name === 'Sen';
            const rank = index + 1;
            const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            
            return `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank ${rank <= 3 ? 'top' : ''}">${rankIcon}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${user.name}</div>
                        <div class="leaderboard-stats">
                            <span>Seviye ${user.level}</span>
                            <span class="leaderboard-xp">${user.xp} XP</span>
                            <span>${this.getLeagueName(user.league)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getLeagueName(league) {
        const names = { bronze: '🥉 Bronz', silver: '🥈 Gümüş', gold: '🥇 Altın', platinum: '💎 Platin', diamond: '💠 Elmas' };
        return names[league] || '🥉 Bronz';
    }

    // Friends
    initFriends() {
        this.renderFriends();
    }

    renderFriends() {
        const container = document.getElementById('friends-content');
        if (!container) return;
        
        const friends = this.userProgress.friends || [];
        
        container.innerHTML = `
            <div class="add-friend-section">
                <input type="text" id="friend-username" placeholder="Kullanıcı adı girin" class="conversation-input">
                <button class="btn btn-primary" onclick="app.addFriend()">Arkadaş Ekle</button>
            </div>
            <div class="friends-list">
                ${friends.length === 0 ? '<p>Henüz arkadaşınız yok</p>' : 
                  friends.map(friend => `
                    <div class="friend-item">
                        <div class="friend-info">
                            <div class="friend-avatar">${friend.name.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="leaderboard-name">${friend.name}</div>
                                <div class="leaderboard-stats">
                                    <span>${friend.xp || 0} XP</span>
                                    <span>${this.getLeagueName(friend.league || 'bronze')}</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="app.challengeFriend('${friend.id}')">Meydan Oku</button>
                    </div>
                  `).join('')}
            </div>
        `;
    }

    addFriend() {
        const usernameInput = document.getElementById('friend-username');
        if (!usernameInput) {
            this.showToast('Arkadaş ekleme formu bulunamadı!', 'error');
            return;
        }
        
        const username = usernameInput.value.trim();
        if (!username) {
            this.showToast('Kullanıcı adı girin!', 'error');
            return;
        }
        
        // Simulate adding friend
        const friend = {
            id: Date.now(),
            name: username,
            xp: Math.floor(Math.random() * 5000),
            league: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)]
        };
        
        this.userProgress.friends.push(friend);
        this.saveProgress();
        this.renderFriends();
        this.showToast(`👥 ${username} arkadaş olarak eklendi!`, 'success');
    }

    challengeFriend(friendId) {
        this.showToast('⚔️ Arkadaş meydan okuması yakında eklenecek!', 'info');
    }

    // Daily Chest
    checkDailyChest() {
        const today = this.getLocalDateString();
        const chestBtn = document.getElementById('daily-chest-btn');
        
        // Check if chest was already opened today
        const alreadyOpened = this.userProgress.lastChestDate === today;
        
        // Check if user has activity today (minimum requirement: at least 5 words learned or 50 XP gained)
        const todayActivity = this.getTodayActivity();
        const hasActivity = todayActivity.wordsLearned >= 5 || todayActivity.xpGained >= 50;
        
        if (alreadyOpened) {
            chestBtn.disabled = true;
            chestBtn.style.opacity = '0.5';
            chestBtn.title = 'Bugün zaten sandığı açtınız!';
        } else if (!hasActivity) {
            chestBtn.disabled = true;
            chestBtn.style.opacity = '0.5';
            chestBtn.title = 'Günlük sandığı açmak için en az 5 kelime öğrenin veya 50 XP kazanın!';
        } else {
            chestBtn.disabled = false;
            chestBtn.style.opacity = '1';
            chestBtn.title = 'Günlük Sandık';
        }
    }

    getTodayActivity() {
        const today = this.getLocalDateString();
        const lastStudyDate = this.userProgress.lastStudyDate;
        
        // If last study date is not today, user has no activity today
        if (lastStudyDate !== today) {
            return { wordsLearned: 0, xpGained: 0 };
        }
        
        // Count words learned today (words that were studied today)
        let wordsLearned = 0;
        const words = this.userProgress.words || {};
        Object.keys(words).forEach(wordId => {
            const wordData = words[wordId];
            // Check both lastStudied and lastReview for compatibility
            const studyTime = wordData.lastStudied || wordData.lastReview;
            if (studyTime) {
                try {
                    const wordDate = this.getLocalDateString(new Date(studyTime));
                    if (wordDate === today) {
                        wordsLearned++;
                    }
                } catch (e) {
                    // Invalid date, skip
                }
            }
        });
        
        // Calculate XP gained today based on daily progress
        // Each word learned typically gives 10 XP, so dailyProgress * 10 is a good estimate
        // But we can also check if user has gained XP today by comparing with yesterday
        const xpGained = this.userProgress.dailyProgress > 0 ? this.userProgress.dailyProgress * 10 : 0;
        
        return { wordsLearned, xpGained };
    }

    openDailyChest() {
        const today = this.getLocalDateString();
        
        // Check if already opened today
        if (this.userProgress.lastChestDate === today) {
            this.showToast('📦 Bugün zaten sandığı açtınız!', 'info');
            return;
        }
        
        // Check if user has activity today
        const todayActivity = this.getTodayActivity();
        const hasActivity = todayActivity.wordsLearned >= 5 || todayActivity.xpGained >= 50;
        
        if (!hasActivity) {
            this.showToast('📦 Günlük sandığı açmak için en az 5 kelime öğrenin veya 50 XP kazanın!', 'warning');
            return;
        }
        
        const rewards = {
            xp: Math.floor(Math.random() * 50) + 25,
            gems: Math.floor(Math.random() * 20) + 10
        };
        
        this.userProgress.xp += rewards.xp;
        this.userProgress.gems += rewards.gems;
        this.validateXP();
        this.validateGems();
        this.userProgress.lastChestDate = today;
        this.saveProgress();
        this.updateDashboard();
        this.checkDailyChest();
        
        const container = document.getElementById('chest-content');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 80px; margin-bottom: 20px;">📦</div>
                <h3>Kazandıklarınız:</h3>
                <p style="font-size: 24px; margin: 20px 0;">+${rewards.xp} XP</p>
                <p style="font-size: 24px; margin: 20px 0;">+${rewards.gems} 💎</p>
                <p style="font-size: 14px; color: var(--text-secondary); margin-top: 20px;">
                    Bugün ${todayActivity.wordsLearned} kelime öğrendiniz! 🎉
                </p>
            </div>
        `;
        
        this.showModal('chest-modal');
        this.animateConfetti();
    }

    checkGiftChest() {
        // Gift chest should only appear if user has been active
        // Check if user has any progress (XP > 0 or has studied words)
        const hasProgress = this.userProgress.xp > 0 || Object.keys(this.userProgress.words).length > 0;
        
        if (!hasProgress) {
            // User hasn't played yet, don't show gift chest
            return;
        }
        
        // Random gift chest every 7 days, but only if user has been active
        const lastGift = this.userProgress.lastGiftDate ? new Date(this.userProgress.lastGiftDate + 'T00:00:00') : null;
        const now = new Date();
        
        // Only show if:
        // 1. Never received a gift before AND user has at least 100 XP (some activity)
        // 2. OR last gift was 7+ days ago AND user has been active since then
        if (!lastGift) {
            // First time - require minimum activity (100 XP or 10 words learned)
            if (this.userProgress.xp >= 100 || Object.keys(this.userProgress.words).length >= 10) {
                // Don't show immediately, wait for user to be more engaged
                // Show after some time or on next session
                return;
            }
        } else {
            // Check if 7 days have passed
            const daysSinceLastGift = (now - lastGift) / (1000 * 60 * 60 * 24);
            if (daysSinceLastGift >= 7) {
                // Check if user has been active in the last 7 days
                const lastStudy = this.userProgress.lastStudyDate ? new Date(this.userProgress.lastStudyDate) : null;
                if (lastStudy && (now - lastStudy) / (1000 * 60 * 60 * 24) <= 7) {
                    // User has been active, show gift chest
                    setTimeout(() => {
                        this.showGiftChest();
                    }, 5000);
                }
            }
        }
    }

    showGiftChest() {
        const rewards = {
            xp: Math.floor(Math.random() * 100) + 50,
            gems: Math.floor(Math.random() * 50) + 25
        };
        
        this.userProgress.xp += rewards.xp;
        this.userProgress.gems += rewards.gems;
        this.validateXP();
        this.validateGems();
        this.userProgress.lastGiftDate = this.getLocalDateString();
        this.saveProgress();
        this.updateDashboard();
        
        const container = document.getElementById('gift-content');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 80px; margin-bottom: 20px;">🎁</div>
                <h3>Sürpriz Hediye!</h3>
                <p style="font-size: 24px; margin: 20px 0;">+${rewards.xp} XP</p>
                <p style="font-size: 24px; margin: 20px 0;">+${rewards.gems} 💎</p>
            </div>
        `;
        
        this.showModal('gift-modal');
        this.animateConfetti();
    }

    // Animations
    animateXP(text) {
        const xpEl = document.createElement('div');
        xpEl.className = 'xp-animation';
        xpEl.textContent = text;
        xpEl.style.left = '50%';
        xpEl.style.top = '50%';
        xpEl.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(xpEl);
        
        setTimeout(() => xpEl.remove(), 1000);
    }

    animateConfetti() {
        const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 50);
        }
    }

    // Error Analysis
    updateErrorAnalysis(word) {
        if (!this.userProgress.errorAnalysis[word.id_number]) {
            this.userProgress.errorAnalysis[word.id_number] = {
                count: 0,
                lastError: null,
                category: this.categorizeError(word)
            };
        }
        
        this.userProgress.errorAnalysis[word.id_number].count++;
        this.userProgress.errorAnalysis[word.id_number].lastError = Date.now();
        this.saveProgress();
    }

    categorizeError(word) {
        // Simple categorization based on difficulty
        if (word.word_diffuculty <= 7) return 'Kolay';
        if (word.word_diffuculty <= 11) return 'Orta';
        return 'Zor';
    }

    showErrorAnalysis() {
        const container = document.getElementById('error-analysis-content');
        if (!container) return;
        
        const errors = Object.entries(this.userProgress.errorAnalysis || {})
            .map(([id, data]) => ({
                word: this.words.find(w => w.id_number === parseInt(id)),
                ...data
            }))
            .filter(e => e.word)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        if (errors.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">Henüz hata analizi verisi yok. Soruları cevaplamaya başladığınızda burada görünecek.</p>';
            this.showModal('error-analysis-modal');
            return;
        }
        
        const categories = {};
        errors.forEach(error => {
            if (!categories[error.category]) {
                categories[error.category] = [];
            }
            categories[error.category].push(error);
        });
        
        container.innerHTML = Object.entries(categories).map(([category, words]) => `
            <div class="error-category">
                <div class="error-category-title">${category} Seviye (${words.length} kelime)</div>
                <div class="error-words-list">
                    ${words.map(w => `
                        <span class="error-word-tag">${w.word.arabic_word} (${w.count}x)</span>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        this.showModal('error-analysis-modal');
    }

    // Modals with accessibility improvements
    showModal(modalId) {
        // Store the element that triggered the modal for focus restoration
        this.previousActiveElement = document.activeElement;
        
        // Edge case: Close any open modal first (prevent multiple modals)
        if (this.isModalOpen) {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
            });
        }
        
        // Stop all audio when opening a modal
        this.stopAllAudio();
        this.isModalOpen = true;
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            
            // Edge case: Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
            
            // Accessibility: Focus management - focus first focusable element
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                // Use requestAnimationFrame for smooth focus transition
                requestAnimationFrame(() => {
                    firstFocusable.focus();
                });
            } else {
                // Fallback: focus the modal itself
                modal.focus();
            }
        } else {
            console.error(`showModal: Modal with id "${modalId}" not found`);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
        
        // Check if any modal is still open
        const openModals = document.querySelectorAll('.modal.show');
        this.isModalOpen = openModals.length > 0;
        
        // Edge case: Restore body scroll if no modals are open
        if (!this.isModalOpen) {
            document.body.style.overflow = '';
            
            // Accessibility: Restore focus to previous element
            if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
                requestAnimationFrame(() => {
                    this.previousActiveElement.focus();
                });
            }
        }
    }

    // Tab Switching with accessibility improvements
    switchTab(tabName) {
        // Update all tabs and tabpanels ARIA attributes
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.setAttribute('aria-hidden', 'true');
        });
        
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(`tab-${tabName}`);
        
        if (tabBtn) {
            tabBtn.classList.add('active');
            tabBtn.setAttribute('aria-selected', 'true');
            tabBtn.setAttribute('tabindex', '0');
            // Focus the active tab for keyboard navigation
            requestAnimationFrame(() => {
                tabBtn.focus();
            });
        }
        if (tabContent) {
            tabContent.classList.add('active');
            tabContent.setAttribute('aria-hidden', 'false');
        }
        
        // Refresh content when switching tabs (lazy loading with requestAnimationFrame)
        this.animate(() => {
            if (tabName === 'challenges') {
                this.renderChallenges();
            } else if (tabName === 'skill-tree') {
                this.renderSkillTree();
            } else if (tabName === 'stories') {
                this.renderStories();
            } else if (tabName === 'test-out') {
                this.renderTestOut();
            }
        });
    }

    // Notifications
    setupNotifications() {
        if (!this.userProgress.notifications) return;
        
        // Check for notifications every minute
        setInterval(() => {
            this.checkNotifications();
        }, 60000);
    }

    checkNotifications() {
        // Streak reminder
        if (this.userProgress.streak > 0) {
            const lastStudy = this.userProgress.lastStudyDate ? new Date(this.userProgress.lastStudyDate) : null;
            const now = new Date();
            
            if (lastStudy && (now - lastStudy) / (1000 * 60 * 60) >= 20) {
                this.showToast('🔥 Streak\'inizi korumak için bugün çalışmayı unutmayın!', 'info');
            }
        }
        
        // Hearts refill notification
        if (this.userProgress.hearts < this.userProgress.maxHearts && !this.userProgress.isPremium) {
            this.showToast('❤️ Canlarınız yenilendi!', 'success');
        }
    }

    // Offline Support
    checkOfflineStatus() {
        const offlineIndicator = document.getElementById('offline-indicator');
        
        window.addEventListener('online', () => {
            this.showToast('🌐 İnternet bağlantısı geri geldi!', 'success');
            if (offlineIndicator) {
                offlineIndicator.classList.remove('show');
            }
        });
        
        window.addEventListener('offline', () => {
            this.showToast('📴 Çevrimdışı moddasınız', 'info');
            if (offlineIndicator) {
                offlineIndicator.classList.add('show');
            }
        });
        
        // Check initial status
        if (!navigator.onLine && offlineIndicator) {
            offlineIndicator.classList.add('show');
        }
    }

    // Offline Download (Premium Feature)
    showOfflineDownload() {
        if (!this.userProgress.isPremium) {
            this.showToast('⭐ Bu özellik Premium üyeler için!', 'error');
            this.showModal('shop-modal');
            return;
        }
        
        const container = document.getElementById('offline-download-content');
        if (!container) return;
        
        const chapters = this.chapters || [];
        const downloadedLessons = this.userProgress.offlineLessons || [];
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p style="color: var(--text-secondary); margin-bottom: 16px;">
                    Dersleri indirerek internet olmadan çalışabilirsiniz.
                </p>
                <div style="display: grid; gap: 12px;">
                    ${chapters.map(chapter => {
                        const isDownloaded = downloadedLessons.includes(chapter.id);
                        const downloadSize = Math.round(chapter.words.length * 0.5); // KB cinsinden tahmini boyut
                        
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-color); border-radius: 8px;">
                                <div>
                                    <h4 style="margin-bottom: 4px;">${chapter.name}</h4>
                                    <p style="font-size: 14px; color: var(--text-secondary);">
                                        ${chapter.words.length} kelime • ~${downloadSize} KB
                                    </p>
                                </div>
                                <button class="btn ${isDownloaded ? 'btn-secondary' : 'btn-primary'}" 
                                        onclick="app.toggleOfflineDownload(${chapter.id})">
                                    ${isDownloaded ? '✅ İndirildi' : '📥 İndir'}
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
                ${downloadedLessons.length > 0 ? `
                    <div style="margin-top: 20px; padding: 16px; background: var(--success-color); color: white; border-radius: 8px; text-align: center;">
                        <p style="font-weight: 600;">${downloadedLessons.length} ders indirildi</p>
                        <button class="btn" style="background: white; color: var(--success-color); margin-top: 8px;" 
                                onclick="app.clearOfflineDownloads()">
                            Tümünü Temizle
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showModal('offline-download-modal');
    }

    toggleOfflineDownload(chapterId) {
        if (!this.userProgress.isPremium) {
            this.showToast('⭐ Bu özellik Premium üyeler için!', 'error');
            return;
        }
        
        if (!this.userProgress.offlineLessons) {
            this.userProgress.offlineLessons = [];
        }
        
        const index = this.userProgress.offlineLessons.indexOf(chapterId);
        
        if (index > -1) {
            // Remove download
            this.userProgress.offlineLessons.splice(index, 1);
            this.showToast('📥 Ders kaldırıldı', 'info');
        } else {
            // Add download
            this.userProgress.offlineLessons.push(chapterId);
            this.showToast('✅ Ders indirildi! Artık çevrimdışı kullanabilirsiniz.', 'success');
            
            // Simulate download process
            const chapter = this.chapters.find(c => c.id === chapterId);
            if (chapter) {
                // Store chapter data in IndexedDB or localStorage for offline access
                const offlineData = {
                    chapterId: chapterId,
                    words: chapter.words,
                    downloadedAt: Date.now()
                };
                
                try {
                    localStorage.setItem(`offline_chapter_${chapterId}`, JSON.stringify(offlineData));
                } catch (e) {
                    console.error('Offline data storage error:', e);
                }
            }
        }
        
        this.saveProgress();
        this.showOfflineDownload();
    }

    clearOfflineDownloads() {
        if (!this.userProgress.isPremium) return;
        
        // Clear from localStorage
        if (this.userProgress.offlineLessons && Array.isArray(this.userProgress.offlineLessons)) {
            this.userProgress.offlineLessons.forEach(chapterId => {
                if (chapterId) {
                    localStorage.removeItem(`offline_chapter_${chapterId}`);
                }
            });
        }
        
        this.userProgress.offlineLessons = [];
        this.saveProgress();
        this.showToast('🗑️ Tüm indirilen dersler temizlendi', 'info');
        this.showOfflineDownload();
    }

    // Check if offline lessons are available
    getOfflineWords() {
        if (!navigator.onLine && this.userProgress.offlineLessons && this.userProgress.offlineLessons.length > 0) {
            const offlineWords = [];
            this.userProgress.offlineLessons.forEach(chapterId => {
                if (!chapterId) return;
                try {
                    const stored = localStorage.getItem(`offline_chapter_${chapterId}`);
                    if (stored) {
                        const data = JSON.parse(stored);
                        offlineWords.push(...data.words);
                    }
                } catch (e) {
                    console.error('Error loading offline data:', e);
                }
            });
            return offlineWords;
        }
        return null;
    }

    // Reset All Data
    resetAllData() {
        // Clear ALL localStorage data (comprehensive cleanup)
        localStorage.removeItem('learningProgress');
        
        // Clear offline downloads (all possible chapter IDs)
        for (let i = 1; i <= 20; i++) {
            localStorage.removeItem(`offline_chapter_${i}`);
        }
        
        // Clear any other potential localStorage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('offline_') || key.startsWith('learning_') || key.startsWith('arabic_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Reset user progress to initial state (complete reset)
        this.userProgress = {
            words: {},
            xp: 0,
            level: 1,
            crownLevel: 1,
            streak: 0,
            lastStudyDate: null,
            dailyProgress: 0,
            dailyGoal: 20,
            badges: [],
            weakWords: [],
            hearts: 5,
            maxHearts: 5,
            gems: 0,
            league: null, // No league until user plays
            leagueXP: 0,
            friends: [],
            chapters: {},
            skillTree: {},
            stories: {},
            challenges: {},
            lastChestDate: null,
            lastGiftDate: null,
            heartsRefillTime: null,
            isPremium: false,
            offlineLessons: [],
            errorAnalysis: {},
            darkMode: false,
            notifications: true
        };
        
        // Clear all runtime variables
        this.sessionStats = { correct: 0, wrong: 0 };
        this.currentMode = null;
        this.currentQuestion = null;
        this.currentChapter = null;
        this.currentStory = null;
        this.currentChallenge = null;
        this.currentTest = null;
        this.storyWords = null;
        this.storyWordIndex = 0;
        this.storyProgress = null;
        this.testWords = null;
        this.testWordIndex = 0;
        this.testAnswers = [];
        this.testStartTime = null;
        this.conversationWords = null;
        this.conversationIndex = 0;
        this.chapters = null;
        this.skillTree = null;
        this.stories = null;
        this.challenges = null;
        this.testOuts = null;
        this.shopItems = null;
        this.leaderboard = null;
        
        // Clear audio cache
        this.audioCache.clear();
        
        // Save fresh state
        this.saveProgress();
        
        // Hide reset modal
        this.hideModal('reset-modal');
        
        // Show dashboard
        this.showDashboard();
        
        // Reinitialize all systems
        this.initChapters();
        this.initSkillTree();
        this.initStories();
        this.initChallenges();
        this.initTestOut();
        this.initLeaderboard();
        this.initShop();
        this.initFriends();
        
        // Update all displays
        this.updateDashboard();
        this.renderChapters();
        this.renderSkillTree();
        this.renderStories();
        this.renderChallenges();
        this.renderTestOut();
        this.renderBadges();
        this.checkDailyChest();
        
        // Show success message
        this.showToast('🔄 Tüm veriler sıfırlandı! Yeni başlangıç yapabilirsiniz.', 'success');
        
        // Reload page to ensure completely clean state
        setTimeout(() => {
            location.reload();
        }, 2000);
    }

    // Conversation Exercises
    startConversation() {
        // Stop all audio when starting conversation mode
        this.stopAllAudio();
        
        // Check hearts using centralized function
        if (!this.canPlay()) {
            this.showModal('hearts-modal');
            return;
        }
        
        this.currentMode = 'conversation';
        this.sessionStats = { correct: 0, wrong: 0 };
        
        // Get conversation words (words with context)
        const conversationWords = this.words
            .filter(w => w.ayah_text && w.meal && w.arabic_word)
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
        
        this.conversationWords = conversationWords;
        this.conversationIndex = 0;
        
        const dashboardView = document.getElementById('dashboard-view');
        const learningView = document.getElementById('learning-view');
        const modeTitle = document.getElementById('mode-title');
        
        if (dashboardView) dashboardView.classList.remove('active');
        if (learningView) learningView.classList.add('active');
        if (modeTitle) modeTitle.textContent = '💬 Konuşma Egzersizleri';
        
        this.updateSessionHearts();
        this.nextConversationQuestion();
    }

    nextConversationQuestion() {
        if (this.conversationIndex >= this.conversationWords.length) {
            this.showToast('🎉 Konuşma egzersizi tamamlandı!', 'success');
            setTimeout(() => this.showDashboard(), 2000);
            return;
        }
        
        const word = this.conversationWords[this.conversationIndex];
        this.currentQuestion = word;
        this.renderConversationQuestion(word);
        this.updateSessionStats();
    }

    renderConversationQuestion(word) {
        if (!word) {
            console.error('renderConversationQuestion: word is null or undefined');
            this.showToast('❌ Soru yüklenemedi!', 'error');
            return;
        }
        
        const questionContent = document.getElementById('question-content');
        const answerOptions = document.getElementById('answer-options');
        const feedbackArea = document.getElementById('feedback-area');
        const nextBtn = document.getElementById('next-btn');
        
        if (!questionContent || !answerOptions) {
            console.error('renderConversationQuestion: Required DOM elements not found');
            return;
        }
        
        if (feedbackArea) feedbackArea.innerHTML = '';
        if (nextBtn) nextBtn.style.display = 'none';
        
        questionContent.innerHTML = `
            <div class="conversation-container">
                <div class="character-avatar">👤</div>
                <div class="conversation-bubble character">
                    <p>${word.ayah_text}</p>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-top: 8px; font-style: italic;">
                        ${word.meal}
                    </p>
                </div>
            </div>
            <div class="turkish-meaning" style="margin-top: 20px;">
                Bu cümlede "<strong>${word.arabic_word}</strong>" kelimesinin anlamı nedir?
            </div>
            <div class="audio-controls">
                <button class="audio-btn" onclick="app.playAudio('${word.ayah_sound_url}')">
                    🎵 Cümleyi Dinle
                </button>
            </div>
        `;
        
        const options = this.generateAnswerOptions(word);
        answerOptions.innerHTML = options.map((opt, idx) => 
            `<button class="option-btn" data-correct="${opt.correct}">${opt.text}</button>`
        ).join('');
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LearningSystem();
    // Make app globally available for onclick handlers AFTER initialization
    window.app = app;
});

