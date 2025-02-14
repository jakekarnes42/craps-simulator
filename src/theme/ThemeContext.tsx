import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextProps {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

const getInitialTheme = (): Theme => {
    // Check if user preference is stored in localStorage
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
        return stored as Theme;
    }
    // Otherwise, use the browser preference if available
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Optionally read from localStorage
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        // Update Bootstrap’s color mode by setting data attribute on <html>
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextProps => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
