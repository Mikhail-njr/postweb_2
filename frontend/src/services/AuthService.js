/**
 * Auth Service - Manejo de autenticación
 */

export class AuthService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.TOKEN_KEY = 'pos_auth_token';
    this.USER_KEY = 'pos_user';
  }

  async login(username, password) {
    const response = await this.apiClient.post('/auth/login', { username, password });
    if (response.token) {
      this.setToken(response.token);
      this.setUser(response.user);
    }
    return response;
  }

  async logout() {
    try {
      await this.apiClient.post('/auth/logout', {});
    } finally {
      this.clearToken();
      this.clearUser();
    }
  }

  async register(username, password, role = 'cajero') {
    const response = await this.apiClient.post('/auth/register', { username, password, role });
    return response;
  }

  async getProfile() {
    return this.apiClient.get('/auth/profile');
  }

  async changePassword(oldPassword, newPassword) {
    return this.apiClient.post('/auth/change-password', { oldPassword, newPassword });
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }

  getUser() {
    const user = sessionStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setUser(user) {
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  clearUser() {
    sessionStorage.removeItem(this.USER_KEY);
  }

  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  }

  isAdmin() {
    return this.hasRole('admin');
  }
}

// Export default instance
export default AuthService;
