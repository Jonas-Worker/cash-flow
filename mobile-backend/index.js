const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');  // Importing the existing supabaseClient

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
// Route for user login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data, error } = await supabase
    .from('custom_users')
    .select('*')
    .eq('email', username)
    .eq('password', password)
    .single();

  if (error) return res.status(400).json({ message: 'Invalid credentials' });

  res.json(data);
});

// Route for inserting cash flow
app.post('/cashflow', async (req, res) => {
    const { cashIn, cashOut, date, category, email, remark } = req.body;
  
    // Validate inputs
    if (!cashIn || !cashOut || !date ||!category ||!remark) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
  
    // Parse the amounts to numbers and validate
    const parsedCashIn = parseFloat(cashIn);
    const parsedCashOut = parseFloat(cashOut);
  
    if (isNaN(parsedCashIn) || isNaN(parsedCashOut)) {
      return res.status(400).json({ message: 'Cash In and Cash Out must be valid numbers.' });
    }
  
    try {
      const { data, error } = await supabase
        .from('cash_flows')
        .insert([
          {
            category: category,
            cash_in: parsedCashIn,
            cash_out: parsedCashOut,
            created_at: date, 
            email: email,
            remark: remark,
          }
        ]);
  
      if (error) {
        return res.status(400).json({ message: error.message });
      }
  
      res.status(200).json(data); 
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'An error occurred while submitting the data.' });
    }
  });
  app.post('/target', async (req, res) => {
    const { email, dailyLimit } = req.body;

    try {
      const { data, error } = await supabase
        .from('daily_expenses')
        .insert([
          {
            email: email,
            limit_value: dailyLimit,
          }
        ]);
  
      if (error) {
        return res.status(400).json({ message: error.message });
      }
  
      res.status(200).json(data); 
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'An error occurred while submitting the data.' });
    }
  });
  

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
