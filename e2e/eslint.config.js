import base from '@repo/config/eslint/base';

export default [...base, { ignores: ['playwright-report/**', 'test-results/**'] }];
