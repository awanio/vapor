const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');

async function validateOpenAPI() {
    try {
        const filePath = path.join(__dirname, 'openapi.yaml');
        console.log('Validating OpenAPI specification:', filePath);
        
        const api = await SwaggerParser.validate(filePath);
        console.log('✅ OpenAPI specification is valid!');
        console.log(`API Title: ${api.info.title}`);
        console.log(`API Version: ${api.info.version}`);
        console.log(`Number of paths: ${Object.keys(api.paths).length}`);
        
        return true;
    } catch (error) {
        console.error('❌ OpenAPI specification validation failed:');
        console.error(error.message);
        if (error.details) {
            console.error('Details:', error.details);
        }
        return false;
    }
}

validateOpenAPI().then(success => {
    process.exit(success ? 0 : 1);
});
