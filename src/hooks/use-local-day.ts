import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDate } from '@/utils/tasks';

/** Update at midnight and when returning from the background, using local calendar days. */
export function useLocalDay() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const update = () => setToday(localDate());
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return today;
}
