# TableFor

A restaurant discovery and table booking website for Angeles City and Clark, Pampanga.

Diners can browse a curated list of restaurants, check which places can take their date, time and group, and book a table with a ₱100 booking fee that comes off the food bill. Restaurant owners get a Partner Portal to manage bookings, their menu, floor plan and booking rules.

TableFor is a front-end mock-up built for coursework at Holy Angel University. There's no server or database. Everything is plain HTML, CSS and JavaScript, and the "backend" is the browser's own storage (localStorage).

---

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Search bar (location, date and time, guests), journal carousel, trending restaurants, vouchers to claim, reviews, how it works, partner call-out |
| Explore | `explore.html` | All restaurants with filters (availability, distance, cuisine, price, rating, pre-order, pick your table, pet-friendly, saved), keyword search, sorting, upcoming bookings |
| Partner | `partner.html` | For restaurant owners: Partner Portal features, pricing plans (monthly or yearly), success stories and an application form |
| Blog | `blog.html` | TableFor's own guides, plus recent articles from Kapampangan food writers that open on the writer's own site |
| About Us | `about.html` | Mission, what we do for diners and restaurants, how we choose restaurants, our promises and FAQs |
| Partner Portal | `owner.html` | Restaurant owner dashboard (owners only, after signing in) |

Every page has the same header (Home, Explore, Partner, Blog, About Us) and footer.

---

## Main features

### For diners
- **Booking:** choose a date, time and party size (up to 20, or the restaurant's own limit). You can optionally pick a table on the floor plan, pre-order dishes, add an occasion and requests, and apply a voucher. Double bookings are prevented: each table is held for 90 minutes.
- **Dates read naturally:** Today, Tonight (from 5 PM), Tomorrow, then "Sat, 10 Oct".
- **Vouchers:** claim one on the home page, then enter the code when booking. Each voucher only works for the cuisines, party sizes or times it lists, and it can only be used once.
- **My bookings and My vouchers:** open from the profile icon. One panel shows both, with tabs that glide between the sections.
  - "View details" shows the full booking: reference, table, pre-order total and when free cancellation ends.
  - From the details you can call the restaurant, get directions, add the booking to your calendar (.ics) or cancel.
- **Cancellation:** free up to 2 hours before the booking. After that the booking fee isn't refunded.
- **Calls and directions:** Call buttons use each restaurant's real phone number. Directions open Google Maps.

### For restaurant owners (Partner Portal)
- **Dashboard:** today's reservations, guests, who's seated, approvals waiting, the week ahead and kitchen pre-orders.
- **Reservations:** search, filter by status, take phone or walk-in bookings, assign tables, and mark guests as seated, completed or no-show.
- **Floor plan:** live table status, with tables you can block for the day.
- **Menu editor, vouchers, profile and hours.**
- **Booking settings:** confirm automatically or by hand, pause online bookings, and share a booking link.
- **Portal guide:** shown on the first visit, and reopened any time from the "Portal guide" button.

### Sign in (mock-up)
- Booking needs a diner account. Browsing and menus don't.
- **Formats are enforced, but any correctly formatted details sign you in:**
  - Diners: an email, or a PH mobile number (e.g. 0917 123 4567), and a password of at least 6 characters.
  - Owners: a business email, plus choosing their restaurant.
- Only one account can be signed in at a time. Signing in again asks you to sign out first.
- Signing in or out updates every open page and tab.

---

## Demo tips

- **Diner:** click **Sign In**, then use any email (e.g. `juan@email.com`) and any password of 6+ characters.
- **Owner:** click **Sign In**, then **Restaurant Owner Sign In**. Choose a restaurant (Sage by Ardesia has a floor plan and sample bookings), then use any business email and password.
- **Reset everything:** Partner Portal → Booking settings → **Reset demo data**, or clear the site's storage in the browser.
- Sample bookings in the Partner Portal are generated for today and the next 6 days, so the dashboard always has something to show.

---

## Files

```
TableFor/
├── index.html, explore.html, partner.html, blog.html, about.html, owner.html
├── styles.css        All styles (mobile-first; breakpoints 560 / 860 / 1024 / 1120 / 1440)
├── sync.js           Keeps saved data the same across pages when opened from a folder
├── restaurants.js    The 21 restaurants (hours, menus, floor plans, phone numbers) and 6 vouchers
├── store.js          Shared data layer: bookings, owner settings, table availability
├── script.js         Header, search, booking window, vouchers, sign-in, account panel, toasts
├── explore.js        Explore filters, sorting, cards and upcoming bookings
├── owner.js          Partner Portal
├── get-photos.sh     Downloads restaurant and blog photos into images/
└── images/           Restaurant photos (images/<id>.jpg) and blog photos (images/blog/)
```

Scripts load in this order on every page: `sync.js` (in the head), then `restaurants.js` → `store.js` → `script.js`, then `explore.js` or `owner.js` where needed.

### Saved data (localStorage)
| Key | Holds |
|---|---|
| `tablefor_session` | Who's signed in (diner or owner) |
| `tablefor_bookings` | Diner bookings |
| `tablefor_vouchers_v2` | Claimed voucher codes |
| `tablefor_saved` | Saved (hearted) restaurants |
| `tablefor_owner` | Owner changes: menu, hours, floor plan, settings, sample reservations |
| `tablefor_owner_guide_*` | Whether an owner has seen the portal guide |
| `tablefor_sync_at` | When the data last changed (used by `sync.js`) |

---

## Photos

- **The original 16 restaurants:** photos are in `images/`.
- **Barn by Conti's, Crabs N Crack, Amare by Chef Chris, John's Kitchen and Cafe Retro 252:** these load the restaurant's published photo until a local copy is saved.
- **Blog articles from other writers:** these use the photo published with each article. TableFor's own posts use designed covers, so no restaurant photos appear on the blog.

To save these photos locally, run this once in the TableFor folder, then commit the `images/` folder:

```
bash get-photos.sh
```

If a photo can't be found, the site shows a lettered or TableFor Journal cover instead of a broken image. Photos from other sites belong to their owners and are used here for a non-commercial coursework demo, with each blog card linking back to the original article.

---

## Standards and accessibility

- Text colours meet WCAG 2.1 AA contrast. Form fields and controls have visible outlines.
- **Keyboard and screen readers:**
  - Skip link and visible focus states.
  - Labelled fields.
  - Focus is kept inside dialogs, and Escape closes them.
  - Screen readers are told when something changes (toasts, voucher messages, availability).
- **Reduced motion:** respects the reduced motion setting.
- **Layout:** works from 320px phones up to 1920px desktops, with no sideways scrolling. The full nav shows from 1024px; below that there's a menu button.
- **Text cursor:** only shows in fields you type into.

---

## Limitations (it's a mock-up)

- **No real accounts or payments:** sign-in accepts any correctly formatted details, and no money is taken.
- **Data stays in your browser:** bookings and owner changes are only saved there, so a diner's booking and an owner's view only match within the same browser.
- **Sample content:** distances are measured from the chosen area, not live GPS. Ratings and review counts are sample data.
- **Social and legal links:** the footer social icons, Privacy Policy and Terms of Service are placeholders.
