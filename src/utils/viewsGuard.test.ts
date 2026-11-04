import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('views guard (REVISI-03 A)', () => {
  const citizen = fs.readFileSync('src/views/CitizenPortalView.tsx', 'utf8');
  const saas = fs.readFileSync('src/views/SaasPlatformView.tsx', 'utf8');
  const citizenApiSrc = fs.readFileSync('src/utils/citizenApi.ts', 'utf8');
  const saasApiSrc = fs.readFileSync('src/utils/saasApi.ts', 'utf8');

  it('CitizenPortalView imports citizenApi', () => {
    assert.match(citizen, /from ['"]\.\.\/utils\/citizenApi['"]/);
  });
  it('SaasPlatformView imports saasApi', () => {
    assert.match(saas, /from ['"]\.\.\/utils\/saasApi['"]/);
  });
  it('no direct fetch to citizen/saas endpoints in views', () => {
    assert.doesNotMatch(citizen, /fetch\(['"]\/api\/citizen\//);
    assert.doesNotMatch(saas, /fetch\(['"]\/api\/saas\//);
  });
  it('no Fallback local or client Lunas in CitizenPortalView', () => {
    assert.doesNotMatch(citizen, /Fallback local/i);
    assert.doesNotMatch(citizen, /status:\s*['"]Lunas['"]/);
  });
  it('citizenApi and saasApi are imported by views (not dead code)', () => {
    assert.match(citizen, /citizenApi/);
    assert.match(saas, /saasApi/);
  });
});