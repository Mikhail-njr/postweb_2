/**
 * Simple State Management Store
 */

export class Store {
  constructor() {
    this.state = {};
    this.listeners = {};
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key);
  }

  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  notify(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(this.state[key]));
    }
  }
}
