# Finora Sales & Invoices

Monitor your sales and invoices: paid, pending and overdue amounts, invoice preview popup and PDF download.
React (Vite) frontend + Express backend + MongoDB Atlas (`finora_finance.sales` collection).

## Run
Terminal 1 (backend):
    cd server && npm install && npm run dev      # http://localhost:5000/api/health

Terminal 2 (frontend):
    cd frontend && npm install && npm run dev    # http://localhost:5173

Atlas credentials go in `server/.env` (see `.env.example`). Keep that file private.
In Settings you can switch to Demo data to try the UI without a database.

## Notes
- Each sale is an invoice; invoice numbers are generated automatically (INV-1001, INV-1002, ...).
- A Pending invoice past its due date is shown as Overdue automatically.
- API: GET/POST /api/sales, PATCH/DELETE /api/sales/:invoiceNumber, POST /api/integrations/sales (x-sync-key header).
