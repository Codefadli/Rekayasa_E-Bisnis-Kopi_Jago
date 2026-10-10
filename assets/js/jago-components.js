/**
 * JAGO COFFEE - UI COMPONENTS
 * Modal, Toast, Confirm Dialog - Production Ready
 * NO MORE alert(), confirm(), prompt()
 * Version: 2.0
 */

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

const KJToast = {
    container: null,
    
    init() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.id = 'kj-toast-container';
        this.container.className = 'kj-toast-container';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 4000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `kj-toast kj-toast-${type}`;
        
        const icon = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        }[type] || 'ℹ';
        
        toast.innerHTML = `
            <div class="kj-toast-icon">${icon}</div>
            <div class="kj-toast-message">${esc(message)}</div>
            <button class="kj-toast-close" aria-label="Close">&times;</button>
        `;
        
        this.container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('kj-toast-show'), 10);
        
        // Close button
        const closeBtn = toast.querySelector('.kj-toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));
        
        // Auto hide
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }
        
        return toast;
    },
    
    hide(toast) {
        toast.classList.remove('kj-toast-show');
        setTimeout(() => toast.remove(), 300);
    },
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        return this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// ============================================================
// MODAL DIALOG
// ============================================================

const KJModal = {
    activeModal: null,
    
    show(options = {}) {
        // Close existing modal
        if (this.activeModal) {
            this.close();
        }
        
        const {
            title = '',
            content = '',
            html = '',
            showClose = true,
            showCancel = false,
            showConfirm = true,
            cancelText = 'Batal',
            confirmText = 'OK',
            onConfirm = null,
            onCancel = null,
            size = 'medium' // small, medium, large
        } = options;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'kj-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = `kj-modal-content kj-modal-${size}`;
        
        // Header
        if (title || showClose) {
            const header = document.createElement('div');
            header.className = 'kj-modal-header';
            if (title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'kj-modal-title';
                titleEl.textContent = title;
                header.appendChild(titleEl);
            }
            if (showClose) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'kj-modal-close';
                closeBtn.innerHTML = '&times;';
                closeBtn.setAttribute('aria-label', 'Close');
                closeBtn.addEventListener('click', () => this.close());
                header.appendChild(closeBtn);
            }
            modalContent.appendChild(header);
        }
        
        // Body
        const body = document.createElement('div');
        body.className = 'kj-modal-body';
        if (html) {
            body.innerHTML = html;
        } else {
            body.textContent = content;
        }
        modalContent.appendChild(body);
        
        // Footer
        if (showCancel || showConfirm) {
            const footer = document.createElement('div');
            footer.className = 'kj-modal-footer';
            
            if (showCancel) {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-secondary';
                cancelBtn.textContent = cancelText;
                cancelBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    this.close();
                });
                footer.appendChild(cancelBtn);
            }
            
            if (showConfirm) {
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn btn-primary';
                confirmBtn.textContent = confirmText;
                confirmBtn.addEventListener('click', () => {
                    if (onConfirm) onConfirm();
                    this.close();
                });
                footer.appendChild(confirmBtn);
            }
            
            modalContent.appendChild(footer);
        }
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Trigger animation
        setTimeout(() => modal.classList.add('kj-modal-show'), 10);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });
        
        // Close on ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', escHandler);
        modal.dataset.escHandler = 'attached';
        
        this.activeModal = modal;
        return modal;
    },
    
    close() {
        if (!this.activeModal) return;
        
        this.activeModal.classList.remove('kj-modal-show');
        setTimeout(() => {
            if (this.activeModal) {
                this.activeModal.remove();
                this.activeModal = null;
            }
        }, 300);
    },
    
    alert(message, title = '') {
        return new Promise((resolve) => {
            this.show({
                title: title || 'Perhatian',
                content: message,
                showCancel: false,
                confirmText: 'OK',
                onConfirm: resolve
            });
        });
    },
    
    confirm(message, title = '') {
        return new Promise((resolve) => {
            this.show({
                title: title || 'Konfirmasi',
                content: message,
                showCancel: true,
                cancelText: 'Batal',
                confirmText: 'Ya',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    },
    
    prompt(message, defaultValue = '', title = '') {
        return new Promise((resolve) => {
            const inputId = 'kj-prompt-input-' + Date.now();
            this.show({
                title: title || 'Input',
                html: `
                    <p>${esc(message)}</p>
                    <input type="text" id="${inputId}" class="form-input" value="${esc(defaultValue)}">
                `,
                showCancel: true,
                cancelText: 'Batal',
                confirmText: 'OK',
                onConfirm: () => {
                    const input = document.getElementById(inputId);
                    resolve(input ? input.value : null);
                },
                onCancel: () => resolve(null)
            });
            
            // Focus input after modal opens
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) input.focus();
            }, 100);
        });
    }
};

// ============================================================
// BOTTOM SHEET (Mobile-friendly modal)
// ============================================================

const KJBottomSheet = {
    activeSheet: null,
    
    show(options = {}) {
        if (this.activeSheet) {
            this.close();
        }
        
        const {
            title = '',
            content = '',
            html = '',
            showClose = true,
            height = 'auto' // auto, half, full
        } = options;
        
        const sheet = document.createElement('div');
        sheet.className = 'kj-bottom-sheet';
        
        const sheetContent = document.createElement('div');
        sheetContent.className = `kj-bottom-sheet-content kj-bottom-sheet-${height}`;
        
        // Handle bar
        const handleBar = document.createElement('div');
        handleBar.className = 'kj-bottom-sheet-handle';
        sheetContent.appendChild(handleBar);
        
        // Header
        if (title || showClose) {
            const header = document.createElement('div');
            header.className = 'kj-bottom-sheet-header';
            if (title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'kj-bottom-sheet-title';
                titleEl.textContent = title;
                header.appendChild(titleEl);
            }
            if (showClose) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'kj-bottom-sheet-close';
                closeBtn.innerHTML = '&times;';
                closeBtn.setAttribute('aria-label', 'Close');
                closeBtn.addEventListener('click', () => this.close());
                header.appendChild(closeBtn);
            }
            sheetContent.appendChild(header);
        }
        
        // Body
        const body = document.createElement('div');
        body.className = 'kj-bottom-sheet-body';
        if (html) {
            body.innerHTML = html;
        } else {
            body.textContent = content;
        }
        sheetContent.appendChild(body);
        
        sheet.appendChild(sheetContent);
        document.body.appendChild(sheet);
        
        // Trigger animation
        setTimeout(() => sheet.classList.add('kj-bottom-sheet-show'), 10);
        
        // Close on backdrop click
        sheet.addEventListener('click', (e) => {
            if (e.target === sheet) {
                this.close();
            }
        });
        
        // Swipe down to close (simple implementation)
        let startY = 0;
        handleBar.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        handleBar.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 100) {
                this.close();
            }
        });
        
        this.activeSheet = sheet;
        return sheet;
    },
    
    close() {
        if (!this.activeSheet) return;
        
        this.activeSheet.classList.remove('kj-bottom-sheet-show');
        setTimeout(() => {
            if (this.activeSheet) {
                this.activeSheet.remove();
                this.activeSheet = null;
            }
        }, 300);
    }
};

// ============================================================
// LOADING OVERLAY (Inline)
// ============================================================

function showLoading(targetElement = document.body, message = 'Memuat...') {
    const existing = targetElement.querySelector('.kj-loading-overlay');
    if (existing) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'kj-loading-overlay';
    overlay.innerHTML = `
        <div class="kj-loading-spinner">
            <div class="kj-spinner"></div>
            <p class="kj-loading-text">${esc(message)}</p>
        </div>
    `;
    
    if (targetElement === document.body) {
        overlay.style.position = 'fixed';
    } else {
        targetElement.style.position = 'relative';
    }
    
    targetElement.appendChild(overlay);
}

function hideLoading(targetElement = document.body) {
    const overlay = targetElement.querySelector('.kj-loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ============================================================
// EMPTY STATE
// ============================================================

function showEmptyState(targetElement, options = {}) {
    const {
        icon = '📭',
        title = 'Tidak ada data',
        message = '',
        actionText = '',
        onAction = null
    } = options;
    
    targetElement.innerHTML = `
        <div class="kj-empty-state">
            <div class="kj-empty-icon">${icon}</div>
            <h3 class="kj-empty-title">${esc(title)}</h3>
            ${message ? `<p class="kj-empty-message">${esc(message)}</p>` : ''}
            ${actionText ? `<button class="btn btn-primary kj-empty-action">${esc(actionText)}</button>` : ''}
        </div>
    `;
    
    if (actionText && onAction) {
        const actionBtn = targetElement.querySelector('.kj-empty-action');
        if (actionBtn) {
            actionBtn.addEventListener('click', onAction);
        }
    }
}

// ============================================================
// ERROR STATE
// ============================================================

function showErrorState(targetElement, message = 'Terjadi kesalahan', onRetry = null) {
    targetElement.innerHTML = `
        <div class="kj-error-state">
            <div class="kj-error-icon">⚠️</div>
            <p class="kj-error-message">${esc(message)}</p>
            ${onRetry ? '<button class="btn btn-secondary kj-error-retry">Coba Lagi</button>' : ''}
        </div>
    `;
    
    if (onRetry) {
        const retryBtn = targetElement.querySelector('.kj-error-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', onRetry);
        }
    }
}

// ============================================================
// CONFIRMATION DIALOG (Better than confirm())
// ============================================================

async function confirmAction(message, title = 'Konfirmasi') {
    return await KJModal.confirm(message, title);
}

// ============================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================

window.KJToast = KJToast;
window.KJModal = KJModal;
window.KJBottomSheet = KJBottomSheet;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showEmptyState = showEmptyState;
window.showErrorState = showErrorState;
window.confirmAction = confirmAction;

// ============================================================
// KJComponents Wrapper (for backward compatibility with admin files)
// ============================================================

window.KJComponents = {
    showLoading(elementId, message = 'Memuat...') {
        const element = typeof elementId === 'string' 
            ? document.getElementById(elementId) 
            : elementId;
        if (element) {
            showLoading(element, message);
        }
    },
    
    hideLoading(elementId) {
        const element = typeof elementId === 'string'
            ? document.getElementById(elementId)
            : elementId;
        if (element) {
            hideLoading(element);
        }
    },
    
    showEmptyState(elementId, options) {
        const element = typeof elementId === 'string'
            ? document.getElementById(elementId)
            : elementId;
        if (element) {
            showEmptyState(element, options);
        }
    },
    
    showErrorState(elementId, message, onRetry) {
        const element = typeof elementId === 'string'
            ? document.getElementById(elementId)
            : elementId;
        if (element) {
            showErrorState(element, message, onRetry);
        }
    }
};

console.log('[Kopi Jago Components] Loaded successfully');
