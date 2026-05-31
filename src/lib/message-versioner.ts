const GREETINGS = [
  'Hello',
  'Hi',
  'Dear',
  'Greetings',
  '',
];

const CLOSINGS = [
  'Best regards',
  'Warmly',
  'Thanks',
  'Regards',
  '',
];

const FILLERS = [
  '',
  '',
  'Please',
  'Kindly',
  '',
];

const CONNECTORS = [
  ', ',
  '! ',
  ' - ',
  '. ',
  ': ',
];

export class MessageVersioner {
  private static variantHistory: Map<string, number[]> = new Map();

  static rotateMessage(
    baseMessage: string,
    recipientKey: string
  ): string {
    const variantIndex = MessageVersioner.getNextVariantIndex(recipientKey);

    const greeting = GREETINGS[variantIndex % GREETINGS.length];
    const closing = CLOSINGS[(variantIndex + 1) % CLOSINGS.length];
    const filler = FILLERS[(variantIndex + 2) % FILLERS.length];
    const connector = CONNECTORS[(variantIndex + 3) % CONNECTORS.length];

    let variant = baseMessage;

    if (greeting) {
      variant = `${greeting}${connector}${variant.charAt(0).toLowerCase()}${variant.slice(1)}`;
    }

    if (filler && !variant.includes(filler)) {
      const firstSentenceEnd = variant.indexOf('.');
      if (firstSentenceEnd > 0) {
        variant =
          variant.slice(0, firstSentenceEnd + 1) +
          ` ${filler},` +
          variant.slice(firstSentenceEnd + 1);
      }
    }

    if (closing && variant.length < 1000) {
      variant = `${variant}\n\n${closing}`;
    }

    const subtleVariants = [
      variant.replace('!', '.'),
      variant.replace(/\.\s/g, '! '),
      variant,
      `${variant.charAt(0).toUpperCase()}${variant.slice(1)}`,
      `${variant} `,
    ];

    const chosen = subtleVariants[variantIndex % subtleVariants.length];

    MessageVersioner.recordVariant(recipientKey, variantIndex);

    return chosen.trim();
  }

  private static getNextVariantIndex(recipientKey: string): number {
    const history = MessageVersioner.variantHistory.get(recipientKey) || [];
    const usedSet = new Set(history);

    const totalVariants = GREETINGS.length * CLOSINGS.length;
    for (let i = 0; i < totalVariants; i++) {
      if (!usedSet.has(i)) {
        return i;
      }
    }

    return Math.floor(Math.random() * totalVariants);
  }

  private static recordVariant(
    recipientKey: string,
    variantIndex: number
  ): void {
    const history = MessageVersioner.variantHistory.get(recipientKey) || [];
    history.push(variantIndex);

    if (history.length > 10) {
      history.shift();
    }

    MessageVersioner.variantHistory.set(recipientKey, history);
  }

  static resetRecipient(recipientKey: string): void {
    MessageVersioner.variantHistory.delete(recipientKey);
  }

  static resetAll(): void {
    MessageVersioner.variantHistory.clear();
  }

  static generateVariants(baseMessage: string, count: number = 5): string[] {
    const variants: string[] = [];

    for (let i = 0; i < count; i++) {
      const greeting = GREETINGS[i % GREETINGS.length];
      const closing = CLOSINGS[(i + 1) % CLOSINGS.length];
      const connector = CONNECTORS[(i + 3) % CONNECTORS.length];

      let variant = baseMessage;

      if (greeting) {
        variant = `${greeting}${connector}${variant.charAt(0).toLowerCase()}${variant.slice(1)}`;
      }

      if (closing && variant.length < 1000) {
        variant = `${variant}\n\n${closing}`;
      }

      variants.push(variant.trim());
    }

    return variants;
  }
}