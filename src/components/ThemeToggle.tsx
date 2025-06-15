import { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isRotating, setIsRotating] = useState(false);

  const handleToggle = () => {
    setIsRotating(true);
    toggleTheme();
  };

  useEffect(() => {
    if (isRotating) {
      const timer = setTimeout(() => setIsRotating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isRotating]);

  return (
    <button
      className={`theme-toggle ${isRotating ? 'animate-spin-once' : ''}`}
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}