# Package payments

1. Run `npm run db:migrate` in each environment before deploying this change.
2. Add `SIFALO_API_USERNAME` and `SIFALO_API_PASSWORD` to the server environment. Use the API credentials from Sifalo, not the business portal login.
3. Set `NEXT_PUBLIC_APP_URL` to the public HTTPS site URL (localhost HTTP is allowed only in development).
4. Assign an active priced package to an approved, active client. The server snapshots its price and linked group content, and creates an unpaid invoice.
5. Complete a test checkout with Sifalo before enabling real customer payments. The automated integration test mocks the provider and does not move money.

Official contract: https://developer.sifalopay.com/sifalo-pay-checkout

The return URL is `/client/payments?order_id=<our UUID>`. Sifalo appends `sid`; the application deliberately ignores browser-supplied `sid`, status and amount. It verifies using the stored order ID through Sifalo's authenticated Verify API, checks success/code/exact amount, and enforces a unique transaction ID in MySQL. Each attempt has a different order ID. No undocumented webhook or signature format is assumed.

Checkout creation is serialized per client. Returning to checkout verifies the previous order first, then requests a fresh key/token with a new unique order ID if the provider confirms failure or no submitted transaction. The live Verify API returns `status: failed`, numeric `code: 600`, `sid: null`, and `response: order_id not found` for an unsubmitted checkout; this permits retry only for a successfully created (`ready`) attempt. Pending payments, unknown responses, and creation timeouts remain blocked for reconciliation. Old order IDs are retained so late returns remain verifiable. Do not manually mark an invoice paid from a return URL or screenshot.

Invoice settlement and plan creation share one transaction. Old package payments remain in history but cannot unlock a replacement package. Paid monthly/quarterly access lasts one/three calendar months from verification; the next invoice is created on the first client request after expiry at the current package price. There is no automatic debit. One-time packages do not expire; server-priced zero-cost packages activate without checkout. Paused clients remain locked.

Existing package labels acquire unpaid invoices on first client access. Legacy service/demo invoices do not prove purchase of a specific package. Review existing customers before production rollout. Billed packages must be archived instead of deleted.

Home, Payments, Profile and Settings remain available. Restricted page content, plan actions, messages and media-upload authorization require current paid access. No plan content is included in unpaid server responses. Provider reconciliation is initiated on the authenticated return page or with **Check payment status**, including when the customer closes checkout before returning.

Checks:

```sh
node scripts/payments.test.mjs
node scripts/payments.integration.cjs
npx tsc --noEmit
npm run lint
```

The integration check creates and removes isolated fixture rows in the configured database. It covers stale approval, concurrent assignment/checkout, invoice ownership, immutable pricing, underpayment, duplicate callbacks, transaction replay, expiry/renewal, uncertain requests and replacement isolation. `--ui` retains isolated unpaid UI fixtures; `--cleanup` removes them. Neither command contacts Sifalo.

Coach price or billing-interval edits synchronize current unpaid invoices. A checkout that has already been issued keeps its original invoice amount; a new current invoice is created for the new price. Old invoices remain verifiable and appear as Replaced, excluded from outstanding balances. Paid periods and payment history retain their original amounts. Client reads also reconcile stale prices, and a stale Pay request refreshes the displayed amount before continuing.

The Assignments menu tracks package invoice history, current access, and the first time the client views the invoice on the Payments page. The viewed timestamp is recorded by an authenticated, ownership-checked action after the page is visible; it is not an email delivery/read receipt.
