const fs = require('fs');
const path = require('path');

const workflows = path.join(__dirname, '..', '.github', 'workflows');
const deployment = fs.readFileSync(
    path.join(workflows, 'azure-static-web-apps-happy-tree-026e2110f.yml'),
    'utf8'
).replace(/\r\n/g, '\n');
const checks = fs.readFileSync(path.join(workflows, 'portfolio-checks.yml'), 'utf8')
    .replace(/\r\n/g, '\n');

function job(name) {
    const lines = deployment.split('\n');
    const start = lines.indexOf(`  ${name}:`);
    if (start === -1) {
        throw new Error(`Missing deployment workflow job: ${name}`);
    }
    const end = lines.findIndex((line, index) =>
        index > start && /^  [a-zA-Z0-9_-]+:\s*$/.test(line)
    );
    return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

test('Azure previews and production call the shared checks first', () => {
    const checksJob = job('portfolio_tests');
    const deployJob = job('build_and_deploy_job');
    const activeEvents = "github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')";

    expect(checksJob).toContain(`if: ${activeEvents}`);
    expect(checksJob).toContain('uses: ./.github/workflows/portfolio-checks.yml');
    expect(deployJob).toContain('needs: portfolio_tests');
    expect(deployJob).toContain(`if: ${activeEvents}`);
    expect(deployJob).not.toMatch(/if:.*(?:always|failure|cancelled)\(\)/);
    expect(deployJob).toContain('uses: Azure/static-web-apps-deploy@v1');
    expect(deployJob).toContain('app_location: "/"');
    expect(deployJob).toContain('api_location: "api"');
});

test('closing a pull request still cleans up its Azure preview', () => {
    const closeJob = job('close_pull_request_job');

    expect(closeJob).toContain("github.event.action == 'closed'");
    expect(closeJob).not.toMatch(/^\s+needs:/m);
    expect(closeJob).toContain('action: "close"');
});

test('portfolio checks are reusable, manually runnable, and include both dependency sets', () => {
    expect(checks).toMatch(/^on:\n  workflow_call:\n  workflow_dispatch:/m);
    expect(checks).toContain('run: npm ci\n');
    expect(checks).toContain('run: npm ci --prefix api');
    expect(checks).toContain('run: npm test -- --runInBand');
    expect(checks).not.toMatch(/^\s*continue-on-error:\s*true\s*$/m);
});
