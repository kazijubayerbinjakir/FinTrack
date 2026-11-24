# FinTrack — Personal Finance Dashboard

A responsive personal finance tracker built with HTML5, CSS3 and vanilla JavaScript.

## Features
- Dashboard with balance, monthly income, expenses and savings rate
- Add and delete income/expense transactions
- Category search and filtering
- Monthly category budgets with progress indicators, edit and delete
- Month selector for overview, budgets and reports
- Cash-flow and spending breakdown visualizations
- Reports and spending insights
- CSV export
- LocalStorage persistence
- Responsive sidebar and layouts
- Auto-scaling cash-flow chart axis, time-based greeting, defensive loading of saved data

## Deploy on Vercel
Import this repository in Vercel. Framework preset: **Other**, no build command, root directory left as default (`./`).

## Run locally
No build tools or dependencies are required. Open `index.html` in a modern browser, or use VS Code Live Server.

## Demo data
The app starts with sample transactions and budgets so the dashboard is not empty. Add, edit by deleting/re-adding, or delete transactions as needed. All data is stored in your browser under `fintrack.v1`.

## Notes
- This is a frontend portfolio demo, not a banking application.
- No real bank account, payment, or financial institution is connected.
- Data stays in the current browser's LocalStorage. Clearing browser data removes it.
- CSV export contains the transactions currently stored in this browser.
- Currency is shown in Bangladeshi Taka (BDT).

## Project structure
```
FinTrack/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```
