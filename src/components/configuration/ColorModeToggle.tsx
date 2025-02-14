import React from 'react';
import { BsMoon, BsSun } from 'react-icons/bs';
import { useTheme } from '../../theme/ThemeContext';
import styles from './ColorModeToggle.module.css';

const ColorModeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const title = `Switch between dark and light mode (currently ${
    theme === 'dark' ? 'dark mode' : 'light mode'
  })`;

  return (
    <div className={styles.toggleContainer}>
      <button
        className={styles.toggleButton}
        type="button"
        onClick={toggleTheme}
        title={title}
        aria-label={title}
      >
        {theme === 'dark' ? (
          <BsSun className={styles.toggleIcon} />
        ) : (
          <BsMoon className={styles.toggleIcon} />
        )}
      </button>
    </div>
  );
};

export default React.memo(ColorModeToggle);