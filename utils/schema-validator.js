// ============================================================
// SEO Master — Schema Validator (Utility)
// Parses and validates JSON-LD schema objects
// ============================================================

const SchemaValidator = {
  validate(schemas) {
    if (!schemas || schemas.length === 0) return { count: 0, types: [], valid: true, errors: [] };

    const types = [];
    const errors = [];
    let isValid = true;

    schemas.forEach((schema, index) => {
      // Check for parse errors caught during extraction
      if (schema._error) {
        isValid = false;
        errors.push({
          type: 'ParseError',
          message: 'Invalid JSON format in schema script tag.',
          raw: schema._raw
        });
        return;
      }

      const type = schema['@type'];
      if (type) {
        types.push(type);
        const validation = this.validateType(type, schema);
        if (!validation.valid) {
          isValid = false;
          validation.missing.forEach(field => {
            errors.push({
              type: type,
              message: `Missing required property: ${field}`
            });
          });
        }
      } else {
        isValid = false;
        errors.push({
          type: 'Unknown',
          message: 'Schema missing "@type" property.'
        });
      }
    });

    return {
      count: schemas.length,
      types: [...new Set(types)], // unique types
      valid: isValid,
      errors: errors
    };
  },

  // Basic validation rules based on Schema.org recommendations
  validateType(type, schema) {
    const missing = [];
    let valid = true;

    // Helper to check nested properties safely
    const hasProp = (obj, path) => {
      if (!obj) return false;
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current[part] === undefined) return false;
        current = current[part];
      }
      return true;
    };

    switch (type) {
      case 'Article':
      case 'NewsArticle':
      case 'BlogPosting':
        if (!schema.headline) missing.push('headline');
        if (!schema.image) missing.push('image');
        if (!schema.author) missing.push('author');
        if (!schema.datePublished) missing.push('datePublished');
        break;
      
      case 'Product':
        if (!schema.name) missing.push('name');
        if (!schema.image) missing.push('image');
        if (!schema.offers && !schema.review && !schema.aggregateRating) {
          missing.push('offers OR review OR aggregateRating');
        }
        break;
      
      case 'FAQPage':
        if (!schema.mainEntity) missing.push('mainEntity');
        break;
      
      case 'HowTo':
        if (!schema.name) missing.push('name');
        if (!schema.step) missing.push('step');
        break;

      case 'Organization':
      case 'LocalBusiness':
        if (!schema.name) missing.push('name');
        if (!schema.url) missing.push('url');
        if (!schema.logo && type === 'Organization') missing.push('logo');
        if (type === 'LocalBusiness' && !schema.address) missing.push('address');
        break;
    }

    if (missing.length > 0) valid = false;

    return { valid, missing };
  }
};
