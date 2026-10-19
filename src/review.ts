import * as StoreReview from 'expo-store-review';

// Ask for an App Store rating after the player's 3rd and 15th win against the
// CPU: they're having a good time, and the match is already over. iOS itself
// caps how often the prompt really appears.
const ASK_AT_WINS = [3, 15];

export function maybeAskForReview(totalWins: number) {
  if (!ASK_AT_WINS.includes(totalWins)) return;
  setTimeout(() => {
    StoreReview.isAvailableAsync()
      .then((ok) => (ok ? StoreReview.requestReview() : undefined))
      .catch(() => {});
  }, 1500);
}
