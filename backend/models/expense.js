const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    category: {
        type: String,
        enum: ['Groceries', 'Leisure', 'Electronics', 'Utilities', 'Clothing', 'Health', 'Others'],
        required: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
});

// Compound indexes for the most common query patterns
ExpenseSchema.index({ user: 1, date: -1 });       // list & filter by date
ExpenseSchema.index({ user: 1, category: 1 });    // filter by category
ExpenseSchema.index({ deletedAt: 1 });             // soft-delete filter

const Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = Expense;
