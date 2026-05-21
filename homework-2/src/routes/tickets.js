const express = require('express');
const router = express.Router();
const controller = require('../controllers/ticketsController');
const { validateCreate, validateUpdate } = require('../middleware/validation');

router.post('/', validateCreate, controller.createTicket);
router.post('/import', controller.importTickets);
router.get('/', controller.listTickets);
router.get('/:id', controller.getTicket);
router.put('/:id', validateUpdate, controller.updateTicket);
router.delete('/:id', controller.deleteTicket);
router.post('/:id/auto-classify', controller.autoClassify);

module.exports = router;
