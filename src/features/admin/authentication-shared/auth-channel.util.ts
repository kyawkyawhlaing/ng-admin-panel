export function formatAuthTemplatePreview(template: string, code = '123456', minutes = 5): string {
  return template
    .replaceAll('{code}', code)
    .replaceAll('{minutes}', String(minutes));
}

export function formatExpiryLabel(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export function providerLabel(value: string, labels: Record<string, string>): string {
  return labels[value] ?? value;
}
