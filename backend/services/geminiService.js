const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

let genAI = null;
let model = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Using gemini-2.5-flash which is the standard free tier model available
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const generateExpenseInsights = async (expenses) => {
  if (!genAI || !model) {
    return generateFallbackInsights(expenses);
  }

  try {
    const expenseData = expenses
      .map(
        (exp) =>
          `Amount: ₹${exp.amount}, Category: ${exp.category}, Date: ${
            new Date(exp.date).toISOString().split("T")[0]
          }, Description: ${exp.description}`
      )
      .join("\n");

    const prompt = `
      Analyze these expense records and provide useful insights:
      ${expenseData}
      
      Please include in your analysis:
      1. Top spending categories
      2. Monthly spending trends
      3. Unusual spending patterns
      4. 2-3 personalized money-saving suggestions
      5. Brief budget health assessment
      
      Return the response as a JSON object with the following structure:
      {
        "topCategories": [{"category": string, "amount": number}],
        "trends": [{"month": string, "amount": number}],
        "unusualPatterns": string,
        "suggestions": [string],
        "budgetHealth": string
      }
      
      Important: Use the Indian Rupee symbol (₹) for any currency values in the response and make sure not to include any currency symbols in the numeric values of the JSON. Return only the JSON.
    `;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    
    let jsonStr = raw;
    const fenceMatch = raw.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return generateFallbackInsights(expenses);
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return generateFallbackInsights(expenses);
  }
};

const generateFallbackInsights = (expenses) => {
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryTotals = {};
  expenses.forEach((exp) => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const monthlySpending = {};
  expenses.forEach((exp) => {
    const date = new Date(exp.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + exp.amount;
  });

  const trends = Object.entries(monthlySpending)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount }));

  return {
    topCategories,
    trends,
    unusualPatterns: "No unusual patterns detected with basic analysis.",
    suggestions: [
      "Consider reviewing spending in your top category to find potential savings",
      "Track your expenses regularly to maintain awareness of your spending habits",
      "Set budget targets for each spending category",
    ],
    budgetHealth: `You've tracked ${
      expenses.length
    } expenses totaling ₹${totalSpent.toFixed(
      2
    )}. Continue monitoring your spending to improve financial awareness.`,
  };
};

const VALID_CATEGORIES = ['Groceries', 'Leisure', 'Electronics', 'Utilities', 'Clothing', 'Health', 'Others'];

const parseNaturalLanguageExpense = async (text, referenceDate) => {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (!genAI || !model) {
    return null;
  }

  const prompt = `
Today's date is ${todayStr}.
The user said: "${text}"

Extract expense details and return ONLY a valid JSON object — no markdown, no explanation.
Use this exact shape:
{
  "amount": <number, required>,
  "description": <string, required>,
  "category": <one of: ${VALID_CATEGORIES.join(', ')}>,
  "date": <ISO 8601 date string, e.g. "${todayStr}">
}

Rules:
- amount must be a positive number (interpret currency symbols / words like "rupees", "rs", "₹").
- description should be a short readable label (3–8 words).
- Pick the closest matching category from the allowed list; default to "Others" if unclear.
- Infer the date from relative words like "yesterday", "last Monday", "2 days ago"; default to today.
- If you cannot determine the amount, return { "error": "amount_missing" }.
`;

  try {
    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    
    let jsonStr = raw;
    const fenceMatch = raw.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.error) return null;

    if (!VALID_CATEGORIES.includes(parsed.category)) {
      parsed.category = 'Others';
    }

    return {
      amount: Number(parsed.amount),
      description: String(parsed.description),
      category: parsed.category,
      date: parsed.date ? parsed.date.split('T')[0] : todayStr,
    };
  } catch (err) {
    console.error('NLP parse error:', err);
    return null;
  }
};

module.exports = {
  generateExpenseInsights,
  parseNaturalLanguageExpense,
};
