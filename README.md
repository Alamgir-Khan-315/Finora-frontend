# Finora: sales, invoices, expenses and profit

React (Vite) frontend + Express backend + MongoDB. Single-owner app: no login, no offline/demo modes. Everything is stored in the database.

## Pages
- **Dashboard**: live date and time, period switch (This month / Last 30 days / This year / All data), money received, expenses, net profit, still to collect, follow-up list, charts.
- **Sales & invoices**: filters (status, date range, payment method, search), invoice preview and PDF, CSV export.
- **Expenses**: *Monthly report* (income, expenses, profit or loss per month, margin, yearly total, CSV) and *Expenses & budgets* (add/delete expenses, monthly category limits with alerts).
- **WhatsApp**: add the client's WhatsApp number when creating a sale (auto-filled for returning clients). Open any invoice and press the green WhatsApp button: on a computer it copies the invoice picture and opens that client's chat with the message typed in (press Ctrl+V, then Send); on a phone it opens the share sheet with picture and message together. Nothing is downloaded automatically: "Picture" and "PDF" only download when you click them.
- **Logo**: replace `public/logo.png`, `logo-512.png`, `logo-192.png`, `apple-touch-icon.png`, `favicon-*.png` and `favicon.ico` to change the logo / browser icon.
- **Calculators**: loan EMI, investment growth, currency converter.
- **Settings**: business name and portfolio link (saved in the database).
- Day and night mode (toggle in the top bar, remembers your choice).

Income is counted in the month an invoice is marked **Paid**; expenses in the month they were spent. Profit = income - expenses.

## Run
    cd Finora-backend && npm install && npm run dev     # http://localhost:5000/api/health
    cd Finora-frontend && npm install && npm run dev    # http://localhost:5173

## Which server is used
On every load (and on Refresh) the app checks the **online** backend (`https://finora-backend-lilac.vercel.app/api`) first. If it is down or its database is not connected, it uses the **local** server (`http://localhost:5000/api`, start it with `npm run dev` in Finora-backend). The sidebar shows which one is active. Override with `VITE_API_URL` and `VITE_LOCAL_API_URL` before building.
