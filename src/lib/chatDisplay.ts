const legacyIntroductions = [
  "أنا مساعد منصة نشمي الذكي. بقدر أساعدك تفهم القوانين والانتخابات والأحزاب بطريقة مبسطة ومحايدة.",
  "أنا مساعد منصة نشمي الذكي."
];

export function cleanAssistantContent(content: string) {
  let clean = content.trim();
  for (const introduction of legacyIntroductions) {
    if (clean.startsWith(introduction)) clean = clean.slice(introduction.length).trim();
  }
  return clean || content;
}
