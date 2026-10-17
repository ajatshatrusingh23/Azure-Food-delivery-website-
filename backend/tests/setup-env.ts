// Runs before every test file, before any app module reads process.env.
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? 'postgresql://azure:azure@localhost:55433/azure_test';
process.env['JWT_SECRET'] = 'test-secret-that-is-long-enough-0123456789';
process.env['BCRYPT_ROUNDS'] = '4'; // fast hashing in tests
process.env['RAZORPAY_KEY_ID'] = ''; // always use the built-in test gateway
process.env['RAZORPAY_KEY_SECRET'] = '';
process.env['TEST_GATEWAY_SECRET'] = 'test-gateway-secret';
