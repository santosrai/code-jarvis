
"use client";

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (valueOrFn: T | ((val: T) => T)) => {
      if (typeof window === "undefined") {
        console.warn(`Tried to set localStorage key "${key}" on the server. This operation will be ignored.`);
        return;
      }
      try {
        // Use the functional update form of setStoredValue to ensure valueOrFn operates on the latest state
        setStoredValue(prevStoredValue => {
          const valueToStore = valueOrFn instanceof Function ? valueOrFn(prevStoredValue) : valueOrFn;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key] // Remove storedValue from dependency array
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        const currentValue = item ? JSON.parse(item) : initialValue;
        // Only update if the parsed local storage value is actually different from the current state
        // This comparison might not be perfect for complex objects but is a reasonable check.
        if (JSON.stringify(currentValue) !== JSON.stringify(storedValue)) {
           setStoredValue(currentValue);
        }
      } catch (error) {
        console.error(`Error re-syncing localStorage key "${key}":`, error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]); // initialValue dependency is okay here for initial sync logic

  return [storedValue, setValue];
}

export default useLocalStorage;
