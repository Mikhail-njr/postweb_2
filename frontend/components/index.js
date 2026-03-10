/**
 * Components Index - Export all modal components
 * Centralized access to all modal components
 */

const Components = {
    init() {
        console.log('Components initialized');
    },

    get(name) {
        const modalMap = {
            'product': window.productModal,
            'lote': window.loteModal,
            'customer': window.customerModal,
            'supplier': window.supplierModal,
            'caja': window.cajaModal
        };
        return modalMap[name] || null;
    },

    open(name) {
        const modal = this.get(name);
        if (modal && modal.open) {
            modal.open();
        }
    },

    close(name) {
        const modal = this.get(name);
        if (modal && modal.close) {
            modal.close();
        }
    },

    showSkeleton(containerId, type, options) {
        if (window.Skeleton) {
            window.Skeleton.show(containerId, type, options);
        }
    },

    hideSkeleton(containerId) {
        if (window.Skeleton) {
            window.Skeleton.hide(containerId);
        }
    },

    replaceSkeleton(containerId, content) {
        if (window.Skeleton) {
            window.Skeleton.replace(containerId, content);
        }
    }
};

window.Components = Components;

document.addEventListener('DOMContentLoaded', () => {
    Components.init();
});
