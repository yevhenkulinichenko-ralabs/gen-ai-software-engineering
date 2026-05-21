class JsonParser {
  parse(body) {
    let data;
    try {
      data = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    if (!Array.isArray(data)) {
      throw new Error('JSON body must be an array of ticket objects');
    }
    return data;
  }
}

module.exports = new JsonParser();
