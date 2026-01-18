/**
 * AWS Cloud Club - Certificate Verification System
 * SVKM's Institute of Technology, Dhule
 * 
 * This script handles certificate verification with:
 * - Rate limiting for security
 * - Input sanitization
 * - Animated result display
 * - URL parameter support for direct verification links
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    MAX_ATTEMPTS: 5,
    COOLDOWN_SECONDS: 60,
    ANIMATION_DELAY: 1500, // Simulate server request
    EVENT_INFO: {
        title: "Cloud Computing With AWS",
        date: "January 17, 2026",
        organizer: "AWS Cloud Club at SVKM's Institute of Technology, Dhule"
    }
};

// ============================================
// State Management
// ============================================
let certificatesData = [];
let attemptCount = 0;
let lastAttemptTime = 0;
let cooldownTimer = null;

// ============================================
// DOM Elements
// ============================================
const elements = {
    form: document.getElementById('verificationForm'),
    idInput: document.getElementById('certificateId'),
    verifyBtn: document.getElementById('verifyBtn'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    rateLimitWarning: document.getElementById('rateLimitWarning'),
    cooldownTimerDisplay: document.getElementById('cooldownTimer'),
    resultSection: document.getElementById('resultSection'),
    resultCard: document.getElementById('resultCard')
};

// ============================================
// Initialize Application
// ============================================
async function init() {
    // Reset scroll position on load
    window.scrollTo(0, 0);

    try {
        await loadCertificates();
        setupEventListeners();
        checkUrlParams();
    } catch (error) {
        console.error('Failed to initialize:', error);
        showError('Failed to load certificate data. Please refresh the page.');
    }
}

/**
 * Load certificates from JSON file
 */
async function loadCertificates() {
    const response = await fetch('certificates.json');
    if (!response.ok) {
        throw new Error('Failed to load certificates');
    }
    const data = await response.json();
    certificatesData = data.certificates;
    console.log(`Loaded ${certificatesData.length} certificates`);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmit);
    
    // Real-time input formatting for certificate ID
    elements.idInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

/**
 * Check URL parameters for pre-filled verification
 * Supports: ?id=AWS-17-JAN-26-CC-001 or ?certid=AWS-17-JAN-26-CC-001
 */
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const certId = params.get('id') || params.get('certid') || params.get('certificate');
    
    if (certId) {
        elements.idInput.value = certId.toUpperCase();
        
        // Auto-verify if ID is provided in URL
        if (params.get('auto') === 'true' || params.get('verify') === 'true') {
            setTimeout(() => {
                elements.form.dispatchEvent(new Event('submit'));
            }, 500);
        }

        // Clean URL so refresh goes to base
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Generate verification URL for sharing
 */
function getVerificationUrl(certificateId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?id=${encodeURIComponent(certificateId)}`;
}

// ============================================
// Rate Limiting
// ============================================
function checkRateLimit() {
    const now = Date.now();
    const timeSinceLastAttempt = (now - lastAttemptTime) / 1000;
    
    // Reset attempt count if cooldown has passed
    if (timeSinceLastAttempt >= CONFIG.COOLDOWN_SECONDS) {
        attemptCount = 0;
    }
    
    if (attemptCount >= CONFIG.MAX_ATTEMPTS) {
        const remainingCooldown = Math.ceil(CONFIG.COOLDOWN_SECONDS - timeSinceLastAttempt);
        if (remainingCooldown > 0) {
            startCooldown(remainingCooldown);
            return false;
        }
        attemptCount = 0;
    }
    
    return true;
}

function startCooldown(seconds) {
    elements.rateLimitWarning.classList.remove('hidden');
    elements.verifyBtn.disabled = true;
    
    let remaining = seconds;
    elements.cooldownTimerDisplay.textContent = remaining;
    
    cooldownTimer = setInterval(() => {
        remaining--;
        elements.cooldownTimerDisplay.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            elements.rateLimitWarning.classList.add('hidden');
            elements.verifyBtn.disabled = false;
            attemptCount = 0;
        }
    }, 1000);
}

// ============================================
// Form Handling
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Check rate limit
    if (!checkRateLimit()) {
        return;
    }
    
    // Get and sanitize input value
    const certId = sanitizeInput(elements.idInput.value).toUpperCase();
    
    // Validate input
    if (!certId) {
        showError('Please enter a Certificate ID.');
        return;
    }
    
    // Update attempt tracking
    attemptCount++;
    lastAttemptTime = Date.now();
    
    // Show loading state
    showLoading(true);
    hideResult();
    
    // Simulate network delay for better UX
    await delay(CONFIG.ANIMATION_DELAY);
    
    // Search for certificate
    const result = findCertificate(certId);
    
    // Hide loading and show result
    showLoading(false);
    displayResult(result, certId);
    
    // Update URL with certificate ID (for sharing)
    // updateUrlWithCertId(certId);
}

/**
 * Update URL with certificate ID for easy sharing
 */
function updateUrlWithCertId(certId) {
    const url = new URL(window.location);
    url.searchParams.set('id', certId);
    window.history.replaceState({}, '', url);
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
    return input
        .trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially harmful characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Find certificate in data by Certificate ID only
 */
function findCertificate(certId) {
    const normalizedId = certId.toUpperCase().trim();
    
    return certificatesData.find(cert => {
        return cert.certificateId.toUpperCase() === normalizedId;
    });
}

// ============================================
// UI Updates
// ============================================
function showLoading(show) {
    if (show) {
        elements.loadingSpinner.classList.remove('hidden');
        elements.verifyBtn.disabled = true;
        elements.form.style.display = 'none';
    } else {
        elements.loadingSpinner.classList.add('hidden');
        elements.verifyBtn.disabled = false;
        elements.form.style.display = 'flex';
    }
}

function hideResult() {
    elements.resultSection.classList.add('hidden');
}

function displayResult(certificate, searchedId) {
    elements.resultSection.classList.remove('hidden');
    
    if (certificate) {
        displayVerifiedResult(certificate);
    } else {
        displayNotFoundResult(searchedId);
    }
    
    // Scroll to result
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function displayVerifiedResult(certificate) {
    const verificationUrl = getVerificationUrl(certificate.certificateId);
    
    elements.resultCard.className = 'result-card verified';
    elements.resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon">✅</div>
            <h3 class="result-status verified">Certificate Verified</h3>
            <p class="result-message">
                This certificate is valid and was officially issued by 
                <strong>${CONFIG.EVENT_INFO.organizer}</strong>.
            </p>
        </div>
        <div class="result-details">
            <div class="detail-row">
                <span class="detail-label">Participant Name</span>
                <span class="detail-value">${escapeHtml(certificate.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Certificate ID</span>
                <span class="detail-value certificate-id">${escapeHtml(certificate.certificateId)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Event Title</span>
                <span class="detail-value">${CONFIG.EVENT_INFO.title}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Event Date</span>
                <span class="detail-value">${CONFIG.EVENT_INFO.date}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Organizer</span>
                <span class="detail-value">${CONFIG.EVENT_INFO.organizer}</span>
            </div>
        </div>
        <div class="share-section">
            <p class="share-label">Share this verification:</p>
            <div class="share-url">
                <input type="text" value="${verificationUrl}" readonly onclick="this.select()">
                <button type="button" class="copy-btn" onclick="copyToClipboard('${verificationUrl}')">
                    📋 Copy
                </button>
            </div>
        </div>
        
        <button type="button" class="verify-another-btn" onclick="resetVerification()">
            Verify Another Certificate
        </button>
    `;
}

function displayNotFoundResult(certId) {
    elements.resultCard.className = 'result-card not-found';
    elements.resultCard.innerHTML = `
        <div class="result-header">
            <div class="result-icon">❌</div>
            <h3 class="result-status not-found">Certificate Not Found</h3>
            <p class="result-message">
                No certificate record found matching the provided Certificate ID. 
                Please verify that you have entered the ID exactly as it appears on your certificate.
            </p>
        </div>
        <div class="result-details">
            <div class="detail-row">
                <span class="detail-label">Searched Certificate ID</span>
                <span class="detail-value certificate-id">${escapeHtml(certId)}</span>
            </div>
        </div>
        <div style="margin-top: 1rem; padding: 1rem; background: #FEF3C7; border-radius: 0.5rem; color: #92400E; font-size: 0.875rem;">
            <strong>💡 Tips:</strong>
            <ul style="margin-top: 0.5rem; padding-left: 1.25rem;">
                <li>Check that the Certificate ID format is correct (e.g., AWS-17-JAN-26-CC-001)</li>
                <li>Make sure you've entered all characters including hyphens</li>
                <li>Contact the organizer if you believe this is an error</li>
            </ul>
        </div>
        
        <button type="button" class="verify-another-btn" onclick="resetVerification()">
            Try Again
        </button>
    `;
}

function showError(message) {
    showToast(message, 'error');
}

// ============================================
// Utility Functions
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    // Create container if it doesn't exist (safety check)
    if (!container) return alert(message);

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 4000);
}

function resetVerification() {
    elements.idInput.value = '';
    hideResult();
    elements.form.style.display = 'flex';
    elements.resultSection.classList.add('hidden');
    elements.idInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link copied to clipboard!', 'success');
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        
        // Visual feedback on button too
        btn.textContent = '✓ Copied!';
        btn.style.background = '#10B981';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link', 'error');
    });
}

// ============================================
// Start Application
// ============================================
document.addEventListener('DOMContentLoaded', init);
