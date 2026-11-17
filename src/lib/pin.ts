export const PIN_LENGTH = 6;

export function pinConfigured(pin = process.env.APP_PIN): boolean {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function pinMatches(input: string, expected = process.env.APP_PIN ?? ""): boolean {
  const left = input.slice(0, PIN_LENGTH).padEnd(PIN_LENGTH, "\0");
  const right = expected.slice(0, PIN_LENGTH).padEnd(PIN_LENGTH, "\0");
  let diff = input.length === PIN_LENGTH && expected.length === PIN_LENGTH ? 0 : 1;
  for (let index = 0; index < PIN_LENGTH; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
