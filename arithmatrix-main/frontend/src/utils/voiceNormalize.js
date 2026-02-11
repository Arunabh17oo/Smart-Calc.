export function normalizeVoiceExpression(raw) {
  let text = String(raw || '').toLowerCase();

  const phraseReplacements = [
    [/×/g, '*'],
    [/\bx\b/g, '*'],
    [/[÷]/g, '/'],

    [/open bracket/g, ' ( '],
    [/open parenthesis/g, ' ( '],
    [/close bracket/g, ' ) '],
    [/close parenthesis/g, ' ) '],

    [/divided by/g, ' / '],
    [/divide by/g, ' / '],
    [/over/g, ' / '],

    [/multiplied by/g, ' * '],
    [/multiply by/g, ' * '],
    [/times/g, ' * '],
    [/into/g, ' * '],

    [/plus/g, ' + '],
    [/minus/g, ' - '],
    [/negative/g, ' - '],

    [/point/g, '.'],
    [/dot/g, '.'],

    [/per cent/g, '%'],
    [/percentage/g, '%'],
    [/percent/g, '%']
  ];

  for (const [pattern, replacement] of phraseReplacements) {
    text = text.replace(pattern, replacement);
  }

  const numberWordReplacements = [
    [/\bnineteen\b/g, '19'],
    [/\beighteen\b/g, '18'],
    [/\bseventeen\b/g, '17'],
    [/\bsixteen\b/g, '16'],
    [/\bfifteen\b/g, '15'],
    [/\bfourteen\b/g, '14'],
    [/\bthirteen\b/g, '13'],
    [/\btwelve\b/g, '12'],
    [/\beleven\b/g, '11'],
    [/\bten\b/g, '10'],

    [/\b(zero|oh)\b/g, '0'],
    [/\b(one|won)\b/g, '1'],
    [/\b(two|to|too|tu|do)\b/g, '2'],
    [/\b(three|tree)\b/g, '3'],
    [/\b(four|for|fore)\b/g, '4'],
    [/\bfive\b/g, '5'],
    [/\bsix\b/g, '6'],
    [/\bseven\b/g, '7'],
    [/\b(eight|ate)\b/g, '8'],
    [/\bnine\b/g, '9']
  ];

  for (const [pattern, replacement] of numberWordReplacements) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/[^0-9+\-*/().% ]/g, ' ').replace(/\s+/g, ' ').trim();
}
