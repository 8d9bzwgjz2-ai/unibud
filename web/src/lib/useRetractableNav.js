import { useEffect, useState } from 'react';

/**
 * Contextual navigation per the UNIBUD direction: the bar retracts as you read
 * down a thread and returns the moment you scroll back up.
 */
export default function useRetractableNav() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const current = window.scrollY;
      if (current > last + 12 && current > 90) setHidden(true);
      else if (current < last - 8) setHidden(false);
      last = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}
