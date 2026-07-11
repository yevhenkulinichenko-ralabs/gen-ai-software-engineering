const jsonParser = require('./jsonParser');
const csvParser = require('./csvParser');
const xmlParser = require('./xmlParser');

const parsers = {
  'application/json': jsonParser,
  'text/csv': csvParser,
  'application/xml': xmlParser,
  'text/xml': xmlParser
};

async function parse(contentType, body) {
  const baseType = contentType ? contentType.split(';')[0].trim().toLowerCase() : '';
  const parser = parsers[baseType];
  if (!parser) {
    throw new Error(
      `Unsupported Content-Type: "${contentType}". Use application/json, text/csv, or application/xml`
    );
  }
  return parser.parse(body);
}

module.exports = { parse };
