const xmlParser = require('../src/services/parsers/xmlParser');

const SINGLE_TICKET_XML = `<?xml version="1.0"?>
<tickets>
  <ticket>
    <customer_id>cust-1</customer_id>
    <customer_email>user@example.com</customer_email>
    <customer_name>Test User</customer_name>
    <subject>App crashes</subject>
    <description>The app crashes on startup.</description>
    <category>technical_issue</category>
    <priority>high</priority>
    <status>new</status>
    <tags><tag>crash</tag><tag>startup</tag></tags>
    <metadata><source>api</source><browser>Firefox</browser><device_type>desktop</device_type></metadata>
  </ticket>
</tickets>`;

const MULTI_TICKET_XML = `<?xml version="1.0"?>
<tickets>
  <ticket>
    <customer_id>c1</customer_id>
    <customer_email>a@example.com</customer_email>
    <customer_name>Alice</customer_name>
    <subject>Login issue</subject>
    <description>Cannot login to the system.</description>
    <category>account_access</category>
    <priority>medium</priority>
    <status>new</status>
    <metadata><source>web_form</source><device_type>desktop</device_type></metadata>
  </ticket>
  <ticket>
    <customer_id>c2</customer_id>
    <customer_email>b@example.com</customer_email>
    <customer_name>Bob</customer_name>
    <subject>Payment error</subject>
    <description>Payment fails every time I try to checkout.</description>
    <category>billing_question</category>
    <priority>high</priority>
    <status>new</status>
    <metadata><source>api</source><device_type>mobile</device_type></metadata>
  </ticket>
</tickets>`;

describe('XmlParser', () => {
  it('parses a single ticket wrapped in an array', async () => {
    const result = await xmlParser.parse(SINGLE_TICKET_XML);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBe('cust-1');
  });

  it('parses multiple tickets', async () => {
    const result = await xmlParser.parse(MULTI_TICKET_XML);
    expect(result).toHaveLength(2);
    expect(result[0].customer_id).toBe('c1');
    expect(result[1].customer_id).toBe('c2');
  });

  it('normalises <tags><tag> structure into an array', async () => {
    const result = await xmlParser.parse(SINGLE_TICKET_XML);
    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(result[0].tags).toContain('crash');
    expect(result[0].tags).toContain('startup');
  });

  it('throws when root element is not <tickets>', async () => {
    const bad = '<items><item><id>1</id></item></items>';
    await expect(xmlParser.parse(bad)).rejects.toThrow();
  });

  it('throws on invalid XML', async () => {
    await expect(xmlParser.parse('<not valid xml<<')).rejects.toThrow();
  });
});
