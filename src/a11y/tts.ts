/**
 * System Skill 04: Accessible Narration
 * Bootstrap phrase kept. Prompt phrase available as alternative — do not
 * rename or delete narrateWarning.
 */

export const narrateWarning = (distance: number) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `Achtung, unbestätigte Meldung in circa ${distance} Metern. Hunde anleinen.`,
  );
  utterance.lang = "de-DE";
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
};

/** Master-Prompt alternative. Optional; does not replace narrateWarning. */
export const narratePromptPhrase = (distance: number) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `Warnung: Mutmaßlicher Giftköder in ${distance} Metern`,
  );
  utterance.lang = "de-DE";
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
};
