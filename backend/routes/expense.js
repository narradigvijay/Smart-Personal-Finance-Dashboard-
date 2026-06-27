const express = require('express');
const {
    addExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    exportExpensesCSV,
    parseExpense,
} = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware').authMiddleware;
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Expense:
 *       type: object
 *       required:
 *         - description
 *         - amount
 *         - category
 *       properties:
 *         description:
 *           type: string
 *           description: Description of the expense 
 *         amount:
 *           type: number
 *           description: Amount spent
 *         category:
 *           type: string
 *           enum: [Groceries, Leisure, Electronics, Utilities, Clothing, Health, Others]
 *           description: Category of the expense
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the expense
 */

router.use(authMiddleware);

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expense'
 *     responses:
 *       200:
 *         description: Successfully created expense
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', addExpense);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses with optional filters
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering expenses
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering expenses
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, 3months, 6months, custom]
 *         description: Predefined period for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page (max 100, default 20)
 *     responses:
 *       200:
 *         description: List of expenses
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', getExpenses);

/**
 * @swagger
 * /api/expenses/export:
 *   get:
 *     summary: Export expenses to CSV
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 */
router.get('/export', exportExpensesCSV);

/**
 * @swagger
 * /api/expenses/parse:
 *   post:
 *     summary: Parse a natural-language sentence into a structured expense (does not save)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Spent 450 rupees on groceries yesterday"
 *     responses:
 *       200:
 *         description: Parsed expense fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parsed:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *       400:
 *         description: Missing text field
 *       422:
 *         description: Could not extract expense details
 *       500:
 *         description: Server error
 */
router.post('/parse', parseExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expense'
 *     responses:
 *       200:
 *         description: Updated expense details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Server error
 */
router.put('/:id', updateExpense);

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', deleteExpense);

module.exports = router;
