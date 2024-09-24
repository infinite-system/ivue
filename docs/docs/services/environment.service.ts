const root = 'blackline-app.com';
const env = 'docs';
const environment = 'docs'

const domain = 'localhost';

const EnvironmentService = {
  env,
  domain,
  server: `https://api.${domain}`,
};

// Test Gitlab CII
export default EnvironmentService;
