/**
 * Modal Component - Base class for all modals
 * Provides common functionality for opening, closing, and managing modals
 */
class Modal {
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.options = {
            closeOnOverlay: true,
            closeOnEscape: true,
            animation: true,
            ...options
        };
        this.modal = null;
        this.init();
    }

    init() {
        this.modal = document.getElementById(this.modalId);
        if (!this.modal) {
            console.warn(`Modal with id "${this.modalId}" not found`);
            return;
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close on overlay click
        if (this.options.closeOnOverlay) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // Close on Escape key
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.close();
                }
            });
        }
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('show');
            this.modal.style.display = 'flex';
            this.onOpen();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.modal.style.display = 'none';
            this.onClose();
        }
    }

    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    isOpen() {
        return this.modal && this.modal.classList.contains('show');
    }

    onOpen() {
        // Override in subclasses
    }

    onClose() {
        // Override in subclasses
    }

    // Helper method to get form data
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    // Helper method to reset form
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Helper method to show error message
    showError(message) {
        alert(message);
    }

    // Helper method to show success message
    showSuccess(message) {
        alert(message);
    }
}

// Export for use in other modules
window.Modal = Modal;
