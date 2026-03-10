/**
 * Skeleton Component - Loading placeholder component
 */
class Skeleton {
    static create(type, options = {}) {
        const { rows = 5, animated = true } = options;
        const animationClass = animated ? 'skeleton-animated' : '';

        switch (type) {
            case 'table':
                return Skeleton.table(rows, animationClass);
            case 'list':
                return Skeleton.list(rows, animationClass);
            case 'form':
                return Skeleton.form(rows, animationClass);
            default:
                return `<div class="skeleton-box ${animationClass}" style="width: 100%; height: 20px;"></div>`;
        }
    }

    static table(rows, animationClass) {
        let bodyHtml = '';
        for (let r = 0; r < rows; r++) {
            bodyHtml += `<tr>
                <td><div class="skeleton-box ${animationClass}" style="width: 80%; height: 14px;"></div></td>
                <td><div class="skeleton-box ${animationClass}" style="width: 60%; height: 14px;"></div></td>
                <td><div class="skeleton-box ${animationClass}" style="width: 40%; height: 14px;"></div></td>
            </tr>`;
        }
        return `<table class="skeleton-table"><tbody>${bodyHtml}</tbody></table>`;
    }

    static list(rows, animationClass) {
        let itemsHtml = '';
        for (let i = 0; i < rows; i++) {
            const width = Math.random() * 40 + 30;
            itemsHtml += `<div class="skeleton-list-item"><div class="skeleton-box ${animationClass}" style="width: ${width}%; height: 20px;"></div></div>`;
        }
        return `<div class="skeleton-list">${itemsHtml}</div>`;
    }

    static form(rows, animationClass) {
        let fieldsHtml = '';
        for (let i = 0; i < rows; i++) {
            const width = Math.random() * 30 + 50;
            fieldsHtml += `<div class="skeleton-form-group">
                <div class="skeleton-box ${animationClass}" style="width: ${width}%; height: 40px; border-radius: 4px;"></div>
            </div>`;
        }
        return `<div class="skeleton-form">${fieldsHtml}</div>`;
    }

    static show(containerId, type, options = {}) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = Skeleton.create(type, options);
        }
    }

    static hide(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    static replace(containerId, content) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = content;
        }
    }
}

// Add CSS styles
Skeleton.styles = `
    <style>
        @keyframes skeleton-pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
        }
        .skeleton-animated {
            animation: skeleton-pulse 1.5s ease-in-out infinite;
            background: #e0e0e0;
        }
        .skeleton-box { background: #e0e0e0; border-radius: 4px; display: inline-block; }
        .skeleton-table { width: 100%; border-collapse: collapse; }
        .skeleton-table td { padding: 12px 8px; }
        .skeleton-list { display: flex; flex-direction: column; gap: 10px; }
        .skeleton-list-item { padding: 12px; background: #f8f8f8; border-radius: 4px; }
        .skeleton-form { display: flex; flex-direction: column; gap: 15px; }
    </style>
`;
document.head.insertAdjacentHTML('beforeend', Skeleton.styles);

window.Skeleton = Skeleton;
