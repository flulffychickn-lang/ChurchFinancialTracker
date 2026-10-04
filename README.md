# Church Finance System

A browser-based church finance tracker. Open `index.html` in a modern browser. Records are saved in that browser's local storage; use Backup/Restore to move data between browsers or devices.

## Cash collection workflow
1. Open **Grace Giving – Cash on Hand** from the sidebar.
2. Record an offering or donation with its collection date. The amount increases Cash on Hand and is automatically split among Church Activities using the configured percentages.
3. Use **Change Percentages** on Church Activities to set the allocation for future collections. Percentages must total 100%; previous allocation balances are not recalculated.
4. Transfer physical cash to a bank account after depositing it. The transfer updates both cash and bank balances and creates records in both histories.
5. Use **Church Activities** to review allocation balances and record expenses. Pastor and Music Director takeaways are recorded as dated withdrawals paid from Cash on Hand; descriptions are optional for those two categories.
6. Correct cash, bank, and activity records using their **Update** buttons. A correction note is required.

## Notes
- The app is not connected to real bank accounts or shared storage.
- Back up your data regularly. Financial corrections are recorded in the note field; keep supporting receipts separately.
- Fun Savings Cooperative behavior has not been redesigned in this update.
