const SwaggerParser = require('@apidevtools/swagger-parser');

async function validateOpenAPI() {
  try {
    const api = await SwaggerParser.validate('openapi.yaml');
    console.log('✅ OpenAPI specification is valid!');
    console.log(`API Name: ${api.info.title}`);
    console.log(`Version: ${api.info.version}`);
    console.log(`Paths: ${Object.keys(api.paths).length}`);
    console.log(`Components: ${Object.keys(api.components || {}).length}`);
    console.log(`Schemas: ${Object.keys(api.components?.schemas || {}).length}`);
  } catch (err) {
    console.error('❌ OpenAPI specification validation failed:');
    console.error(err.message);
    process.exit(1);
  }
}

validateOpenAPI();
