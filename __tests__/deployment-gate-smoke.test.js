test('temporarily fail to verify that Azure deployment is blocked', () => {
    throw new Error('Intentional failure for deployment-gate verification.');
});
