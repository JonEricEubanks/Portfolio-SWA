/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const { buildDefaultContext } = require('../api/chat.js');

test('both backend fallback prompts match and do not claim PMP', () => {
    const root = path.join(__dirname, '..');
    const fallback = source => fs.readFileSync(path.join(root, source), 'utf8')
        .replace(/\r\n/g, '\n')
        .match(/function buildDefaultContext\(portfolioData = \{\}\) \{[\s\S]*?\n\}/)[0];

    expect(fallback('server.js')).toBe(fallback('api/chat.js'));
    expect(buildDefaultContext()).toContain('JonEric Eubanks — AI engineer');
    expect(buildDefaultContext()).not.toMatch(/\bPMP\b|\bPMI\b/i);
});
