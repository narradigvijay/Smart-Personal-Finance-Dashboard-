const Expense = require('../models/expense');
const { parseNaturalLanguageExpense } = require('../services/geminiService');

exports.addExpense = async (req, res) => {
    const { description, amount, category, date } = req.body;
    try {
        const expense = new Expense({
            user: req.user.id,
            description,
            amount,
            date,
            category,
        });
        await expense.save();
        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getExpenses = async (req, res) => {
    const { startDate, endDate, period, page, limit } = req.query;
    const filter = { user: req.user.id, deletedAt: null };
    const now = new Date();
    let start, end;

    if (period) {
        switch (period) {
            case 'week':
                start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
                end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
                end.setDate(end.getDate() + 6);
                break;
            case 'month':
                start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
                end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case '3months':
                start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 2, 1);
                end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case '6months':
                start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
                end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'custom':
                if (startDate && endDate) {
                    start = new Date(startDate);
                    end = new Date(endDate);
                } else {
                    return res.status(400).json({ message: 'Please provide startDate and endDate for custom period' });
                }
                break;
            default:
                return res.status(400).json({ message: 'Invalid period. Choose from week, month, 3months, or custom.' });
        }
    }

    if (start && end) {
        filter.date = { $gte: start, $lte: end };
    }

    try {
        const pageNum  = Math.max(1, parseInt(page)  || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip     = (pageNum - 1) * pageSize;

        const [expenses, totalCount] = await Promise.all([
            Expense.find(filter).sort({ date: -1 }).skip(skip).limit(pageSize),
            Expense.countDocuments(filter),
        ]);

        const totalAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

        res.json({
            totalAmount,
            expenses,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(totalCount / pageSize),
            },
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findById(id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { description, amount, date, category } = req.body;
    try {
        const expense = await Expense.findByIdAndUpdate(
            id,
            { description, amount, date, category },
            { new: true }
        );
        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        await Expense.findByIdAndUpdate(id, { deletedAt: new Date() });
        res.json({ message: 'Expense removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.exportExpensesCSV = async (req, res) => {
    try {
        const filter = { user: req.user.id, deletedAt: null };
        const expenses = await Expense.find(filter).sort({ date: -1 });

        const header = 'Date,Description,Category,Amount\n';
        const rows = expenses.map(e => {
            const dateStr = e.date ? new Date(e.date).toISOString().split('T')[0] : '';
            return `"${dateStr}","${e.description}","${e.category}",${e.amount}`;
        }).join('\n');

        const csvData = header + rows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
        res.status(200).send(csvData);
    } catch (err) {
        console.error('Error exporting expenses:', err);
        res.status(500).json({ message: 'Server error during export' });
    }
};

/**
 * Parse a natural-language description into structured expense fields.
 * Does NOT save the expense — returns the parsed object for the frontend to confirm.
 */
exports.parseExpense = async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ message: '"text" field is required' });
    }
    try {
        const parsed = await parseNaturalLanguageExpense(text.trim());
        if (!parsed) {
            return res.status(422).json({
                message: 'Could not extract expense details. Please include an amount and description.',
            });
        }
        res.json({ parsed });
    } catch (err) {
        console.error('parseExpense error:', err);
        res.status(500).json({ message: 'Server error during NLP parsing' });
    }
};
