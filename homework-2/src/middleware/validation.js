const { createSchema, updateSchema } = require('../schemas/ticketSchema');

function validateCreate(req, res, next) {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }
  req.validatedBody = value;
  next();
}

function validateUpdate(req, res, next) {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }
  req.validatedBody = value;
  next();
}

module.exports = { validateCreate, validateUpdate };
