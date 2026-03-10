/**
 * Simple SPA Router
 */

export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
  }

  init() {
    window.addEventListener('popstate', () => this.navigate(window.location.pathname));
    this.navigate(window.location.pathname);
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  // Alias for register
  define(routes) {
    Object.keys(routes).forEach(path => {
      this.routes[path] = routes[path];
    });
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute(path);
  }

  handleRoute(path) {
    const route = this.routes[path];
    if (route) {
      this.currentRoute = path;
      route();
    } else {
      // 404 fallback
      console.log('Route not found:', path);
    }
  }
}
