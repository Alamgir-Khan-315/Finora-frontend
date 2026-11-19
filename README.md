# Finora: sales, invoices, expenses and profit

React (Vite) frontend + Express backend + MongoDB. Single-owner app: no login, no offline/demo modes. Everything is stored in the database.

## Pages
- **Dashboard**: live date and time, period switch (This month / Last 30 days / This year / All data), money received, expenses, net profit, still to collect, follow-up list, charts.
- **Sales & invoices**: filters (status, date range, payment method, search), invoice preview and PDF, CSV export.
- **Expenses**: *Monthly report* (income, expenses, profit or loss per month, margin, yearly total, CSV) and *Expenses & budgets* (add/delete expenses, monthly category limits with alerts).
- **WhatsApp**: add the client's WhatsApp number when creating a sale (auto-filled for returning clients). Open any invoice and press the green WhatsApp button. Phone/tablet: copies the invoice picture and jumps straight into the WhatsApp app on that client's chat via the `whatsapp://send` link (falls back to wa.me if the app does not open), message already typed. Computer: copies the picture and opens the client's chat on WhatsApp Web/Desktop (wa.me). Then paste the picture (press-and-hold > Paste, or Ctrl+V) and Send. A separate "Share" button opens the system share sheet where the browser supports it. Nothing is downloaded automatically: "Picture" and "PDF" only download when you click them.
- **Logo**: replace `public/logo.png`, `logo-512.png`, `logo-192.png`, `apple-touch-icon.png`, `favicon-*.png` and `favicon.ico` to change the logo / browser icon.
- **Calculators**: loan EMI, investment growth, currency converter.
- **Settings**: business name and portfolio link (saved in the database).
- Day and night mode (toggle in the top bar, remembers your choice).

Income is counted in the month an invoice is marked **Paid**; expenses in the month they were spent. Profit = income - expenses.

## Run
    cd Finora-backend && npm install && npm run dev     # http://localhost:5000/api/health
    cd Finora-frontend && npm install && npm run dev    # http://localhost:5173

## Which server is used
The app talks to the **online** backend `https://finora-backend-lilac.vercel.app/api`. On localhost only, it falls back to `http://localhost:5000/api`
if the online one is down. The sidebar shows which one is active. Override with `VITE_API_URL` / `VITE_LOCAL_API_URL` (see `.env.example`) before building.
Needs backend **v4** (`/api/health` shows the version); an older backend shows a clear "redeploy the backend" message.

## New in this version
- **New sale** asks for **house / plot no.** and **address** (shown on the invoice, PDF, picture, Customers and search).
- **Part payments**: open an invoice > *Payments* > record any amount. Status goes Pending → **Partial** → **Paid** automatically; the Paid stamp appears when fully received. Income reports count each payment in the month it was received.
- **WhatsApp update to the customer** after every payment / invoice change (automatic if the backend has the WhatsApp API keys, otherwise one tap on *Send on WhatsApp*).
- **Expenses**: *Paid to* (employee / seller) with type, a **search box** (name, title, category) and a **Spending by person** table with the total spent on each.

- **Bills to pay** (Expenses > Bills to pay): money you owe to an employee / seller, paid in parts like invoices, with a payment slip (PDF / picture) and WhatsApp updates to that person. Every payment counts as an expense.
- Expenses page: *Spending by person* comes first (top 5, *View all*), the monthly budget shows only the most used categories (*View all categories*), and the expense list shows the latest 8 (*View all*).

## Phone app layout
On phones (up to 760 px wide) the menu is a bottom tab bar (Home, Customers, Invoices, Expenses, About, Contact) with a red badge for overdue invoices; "New sale" is a floating + button; lists are cards; pop-ups slide up as sheets; safe areas for the iPhone notch / home bar are respected. Pinch and double-tap zoom are switched off (`src/mobile.js`, viewport tag) and inputs use 16 px text so iPhone Safari never zooms on focus.
Every form has a **Description** field (sale, expense, bill, payment, renewal) for extra information.

## Latest changes
- **Invoice**: the "download as picture" button is replaced by **Print** (prints only the invoice). PDF download stays.
- **Customers**: tap a customer for a profile screen (contact buttons, totals, all their invoices, *Download Excel*, *Send payment reminder*). The list has a general *Download Excel* (customers + all invoices).
- **Expense profiles** (Expenses > Profiles): every category is a profile, like a customer. Create your own (Home, Office, Site A...) from *New profile* or while adding an expense / bill (*＋ New profile…* in the category list). Open a profile to see its expenses, bills to pay, add an expense, and *Download Excel*.
- Excel files are real .xlsx (made in the browser, no extra library).


- **Menu order**: Dashboard, Customers, Invoices, Expenses, About Finora, Contact (developer). The Settings button is the last icon in the top bar, after Refresh.
- **About Finora** tab: what the app is and what it does.
- **Contact (developer)** tab: About me + Contact me with **Visit profile**, **Contact** (call) and **WhatsApp** buttons for people who want a website or software. Details live in `src/contact.js`.
- **Portfolio link is locked**: Settings shows it but cannot change it, and the server always returns the fixed link.
- **Delete profile** (Expenses > Profiles) is a pill at the top-right of the profile screen, next to *All profiles*.