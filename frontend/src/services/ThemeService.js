/**
 * ThemeService - Manejo de temas con persistencia en localStorage
 */
export class ThemeService {
  constructor() {
    this.THEME_KEY = 'sispost-theme';
    this.themes = {
      claro: 'theme-claro',
      tarde: 'theme-tarde',
      noche: 'theme-noche'
    };
    this.currentTheme = null;
  }

  /**
   * Inicializar el tema desde localStorage o usar el default
   */
  init() {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const theme = savedTheme && this.themes[savedTheme] ? savedTheme : 'claro';
    this.applyTheme(theme);
    return theme;
  }

  /**
   * Obtener el tema actual
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Aplicar un tema al body
   * @param {string} themeName - Nombre del tema (claro, tarde, noche)
   */
  applyTheme(themeName) {
    // Remover todos los temas existentes
    Object.values(this.themes).forEach(themeClass => {
      document.body.classList.remove(themeClass);
    });

    // Aplicar el nuevo tema
    const themeClass = this.themes[themeName];
    if (themeClass) {
      document.body.classList.add(themeClass);
      this.currentTheme = themeName;
      localStorage.setItem(this.THEME_KEY, themeName);
    }
  }

  /**
   * Cambiar al siguiente tema (ciclar)
   */
  cycleTheme() {
    const themeNames = Object.keys(this.themes);
    const currentIndex = themeNames.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    const nextTheme = themeNames[nextIndex];
    this.applyTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Obtener lista de temas disponibles
   */
  getAvailableThemes() {
    return Object.keys(this.themes).map(key => ({
      id: key,
      class: this.themes[key],
      label: this.getThemeLabel(key),
      icon: this.getThemeIcon(key)
    }));
  }

  /**
   * Obtener etiqueta legible del tema
   */
  getThemeLabel(themeName) {
    const labels = {
      claro: 'Día',
      tarde: 'Tarde',
      noche: 'Noche'
    };
    return labels[themeName] || themeName;
  }

  /**
   * Obtener icono del tema
   */
  getThemeIcon(themeName) {
    const icons = {
      claro: '☀️',
      tarde: '🌅',
      noche: '🌙'
    };
    return icons[themeName] || '🎨';
  }
}

// Instancia singleton
export const themeService = new ThemeService();
