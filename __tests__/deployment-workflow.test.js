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

test('every pull-request run reconciles its preview after tests and deployment', () => {
    const closeJob = job('close_pull_request_job');

    expect(closeJob).toContain('needs: [portfolio_tests, build_and_deploy_job]');
    expect(closeJob).toContain("if: always() && github.event_name == 'pull_request'");
    expect(closeJob).not.toContain('github.event.action');
    expect(closeJob).toContain('id: preview_status');
    expect(closeJob).toContain("if: steps.preview_status.outputs.open == 'false'");
    expect(closeJob).toContain('action: "close"');
});

test('preview cleanup uses the current pull-request state and fails on unexpected states', () => {
    const closeJob = job('close_pull_request_job');

    expect(closeJob).toContain('gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .state');
    expect(closeJob).toMatch(/open\)\n\s+echo "open=true" >> "\$GITHUB_OUTPUT"/);
    expect(closeJob).toMatch(/closed\)\n\s+echo "open=false" >> "\$GITHUB_OUTPUT"/);
    expect(closeJob).toMatch(/::error::Unexpected pull request state: \$state"\n\s+exit 1/);
    expect(closeJob.indexOf('gh api')).toBeLessThan(closeJob.indexOf('action: "close"'));
});

test('pull-request runs finish before preview cleanup without serializing production runs', () => {
    expect(deployment).toContain(
        "group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"
    );
    expect(deployment).toMatch(/^  cancel-in-progress: false$/m);
});

test('the preview deploy checks the current pull-request state', () => {
    const deployJob = job('build_and_deploy_job');
    const deployStep = deployJob.slice(deployJob.indexOf('- name: Build And Deploy'));

    expect(deployJob).toContain('id: pr_status');
    expect(deployJob).toContain('gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER" --jq .state');
    expect(deployJob).toContain('Pull request is closed; skipping preview deployment.');
    expect(deployStep).toContain("if: github.event_name == 'push' || steps.pr_status.outputs.open == 'true'");
});

test('portfolio checks are reusable, manually runnable, and include both dependency sets', () => {
    expect(checks).toMatch(/^on:\n  workflow_call:\n  workflow_dispatch:/m);
    expect(checks).toContain('run: npm ci\n');
    expect(checks).toContain('run: npm ci --prefix api');
    expect(checks).toContain('run: npm test -- --runInBand');
    expect(checks).not.toMatch(/^\s*continue-on-error:\s*true\s*$/m);
});
