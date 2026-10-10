// ============================================================
// TableFor — restaurant data (one source for both pages)
//
// Restaurant names, cuisines, areas, ratings follow the
// TableFor Figma mockup. Hours, party sizes, weekly bookings, prices,
// descriptions and a few ratings are SAMPLE DATA for the demo —
// confirm them with each restaurant before publishing. Places marked
// approxLocation: true only have a city-level location, so their distance
// is shown as approximate.
//
// Field guide
//   price        1–4 (₱ to ₱₱₱₱)
//   hours        { open, close } in minutes from midnight (1440 = 12:00 AM)
//   closedDays   0 = Sun … 6 = Sat
//   minParty / maxParty   group sizes taken through TableFor
//   badge        optional editorial badge: 'critics-pick' | 'local-favourite'
//   photo        local image in the images/ folder (images/<id>.jpg)
//   phone        number for the Call button, from the restaurant's own page or
//                listing (null = no number confirmed; the button shows as unavailable)
// ============================================================

window.TABLEFOR_BOOKING_FEE = 100; // ₱, the old flat deposit (kept for bookings made before online payment)

// ------------------------------------------------------------
// Vouchers (claimed on the Home page, applied in the booking form)
//   cuisines     restaurants' cuisines it works at (null = every restaurant)
//   minParty     smallest group it applies to
//   latestTime   last seating time it applies to, in minutes (optional)
//   validUntil   last booking date (YYYY-MM-DD)
// ------------------------------------------------------------
window.TABLEFOR_VOUCHERS = [
  {
    code: 'PASTA10', value: '10%', unit: 'off food', title: 'Italian & pizza nights',
    cuisines: ['Italian', 'Pizza'], minParty: 2, validUntil: '2026-10-31',
    terms: 'For tables of 2 or more.',
  },
  {
    code: 'NIHON150', value: '₱150', unit: 'off the bill', title: 'Japanese favourites',
    cuisines: ['Japanese'], minParty: 1, validUntil: '2026-10-31',
    terms: 'Minimum food spend of ₱1,000 at the restaurant.',
  },
  {
    code: 'EARLYBIRD15', value: '15%', unit: 'off food', title: 'Café & diner brunch',
    cuisines: ['Café', 'American'], minParty: 1, latestTime: 11 * 60, validUntil: '2026-12-31',
    terms: 'Bookings up to 11:00 AM.',
  },
  {
    code: 'WORLD12', value: '12%', unit: 'off food', title: 'Flavours from abroad',
    cuisines: ['Spanish', 'Mediterranean', 'Southeast Asian', 'International'], minParty: 1, validUntil: '2026-11-30',
    terms: 'Food only, drinks excluded.',
  },
  {
    code: 'GRILL200', value: '₱200', unit: 'off the bill', title: 'Grill, steak & pub',
    cuisines: ['Steakhouse', 'Pub & Grill', 'Filipino'], minParty: 2, validUntil: '2026-11-30',
    terms: 'For tables of 2 or more. Minimum food spend of ₱1,500.',
  },
  {
    code: 'BARKADA500', value: '₱500', unit: 'off the bill', title: 'Big group dinners',
    cuisines: null, minParty: 8, validUntil: '2026-12-31',
    terms: 'For groups of 8 or more, at any TableFor restaurant.',
  },
];

(function () {
  const H = (h, m = 0) => h * 60 + m;

  window.TABLEFOR_RESTAURANTS = [
    {
      id: 'sage', name: 'Sage by Ardesia', cuisine: 'Italian', style: 'Fine Dining', price: 3,
      city: 'Angeles City', area: 'Margot', lat: 15.1290, lng: 120.5940,
      rating: 4.9, reviews: 234, bookingsWeek: 148,
      hours: { open: H(10), close: H(22) }, closedDays: [], minParty: 1, maxParty: 10,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'A candlelit dining room serving coastal Italian plates and small-batch wines, tucked into a quiet corner of Margot.',
      photo: 'images/sage.jpg', phone: '+639175340111',
    },
    {
      id: 'rustica', name: 'Rustica', cuisine: 'Filipino', style: 'Live Fire', price: 4,
      city: 'Angeles City', area: 'Friendship', lat: 15.1730, lng: 120.5980,
      rating: 4.8, reviews: 189, bookingsWeek: 139,
      hours: { open: H(11), close: H(22) }, closedDays: [], minParty: 1, maxParty: 16,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'Modern Filipino comfort food built around live-fire cooking and heirloom recipes, reimagined for a night out.',
      photo: 'images/rustica.jpg', phone: '+639772444045',
    },
    {
      id: 'trattoria', name: 'Trattoria Altrové', cuisine: 'Italian', style: 'Romantic', price: 4,
      city: 'Angeles City', area: 'Don Juico Ave, Malabanias', lat: 15.1590, lng: 120.5800,
      rating: 5.0, reviews: 142, bookingsWeek: 131,
      hours: { open: H(12), close: H(22) }, closedDays: [], minParty: 1, maxParty: 8,
      preorder: false, isNew: false, fillingFast: true, badge: null,
      desc: 'An intimate trattoria known for handmade pasta, a tightly curated wine list, and candlelit tables built for lingering.',
      photo: 'images/trattoria.jpg', phone: '+639626211072',
    },
    {
      id: 'hola-parade', name: 'Hola Parade', cuisine: 'International', style: 'Rooftop', price: 3,
      city: 'Clark', area: 'Clark Parade Grounds', lat: 15.1860, lng: 120.5540,
      rating: 4.7, reviews: 318, bookingsWeek: 92,
      hours: { open: H(11), close: H(24) }, closedDays: [], minParty: 1, maxParty: 20,
      preorder: false, isNew: false, fillingFast: false, badge: null,
      desc: 'A rooftop café, bar and restaurant at the Clark Parade Grounds. Come for the view at sunset and stay for steaks, pasta and a long drinks list.',
      photo: 'images/hola-parade.jpg', phone: '+639152867507',
    },
    {
      id: 'fiery-meats', name: 'Fiery Meats Angeles', cuisine: 'Steakhouse', style: 'Grill', price: 3,
      city: 'Angeles City', area: 'Sto. Domingo', lat: 15.1390, lng: 120.5810,
      rating: 4.9, reviews: 148, bookingsWeek: 118,
      hours: { open: H(11), close: H(23) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'A steakhouse on Friendship Highway in Sto. Domingo, best known for its unlimited steak with refillable sides.',
      photo: 'images/fiery-meats.jpg', phone: '+639999351982',
    },
    {
      id: 'matsuya', name: 'Matsuya Japanese Restaurant', cuisine: 'Japanese', style: 'Casual', price: 2,
      city: 'Angeles City', area: 'Cutcut', lat: 15.1418, lng: 120.5698, approxLocation: true,
      rating: 4.8, reviews: 210, bookingsWeek: 112,
      hours: { open: H(10), close: H(24) }, closedDays: [], minParty: 1, maxParty: 16,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'A Japanese restaurant in Cutcut for fresh sashimi, sushi and hot pot, open until midnight.',
      photo: 'images/matsuya.jpg', phone: '+639543418600',
    },
    {
      id: 'roso', name: 'Roso Pizza', cuisine: 'Pizza', style: 'Pizzeria', price: 2,
      city: 'Angeles City', area: 'Fil-Am Friendship Hwy', lat: 15.144, lng: 120.572, approxLocation: true,
      rating: 4.9, reviews: 256, bookingsWeek: 88,
      hours: { open: H(16), close: H(23) }, closedDays: [1], minParty: 1, maxParty: 12,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'Pizza from a stone-fired oven with blistered crusts, by self-taught pizzaiolo Rainier Ildefonso. Evenings only, Tuesday to Sunday.',
      photo: 'images/roso.jpg', phone: null,
    },
    {
      id: 'changkat', name: 'Changkat Asian Kitchen & Bar', cuisine: 'Southeast Asian', style: 'Kitchen & Bar', price: 2,
      city: 'Angeles City', area: 'A. Santos St, Balibago', lat: 15.1682, lng: 120.5936,
      rating: 4.7, reviews: 112, bookingsWeek: 74,
      hours: { open: H(9), close: H(24) }, closedDays: [], minParty: 1, maxParty: 14,
      preorder: false, isNew: false, fillingFast: false, badge: null,
      desc: 'A Southeast Asian kitchen and bar in Balibago with Malaysian dishes, biryani and shawarma, open late.',
      photo: 'images/changkat.jpg', phone: '+639472081883',
    },
    {
      id: 'champs', name: 'Champs Diner', cuisine: 'American', style: 'Diner', price: 2,
      city: 'Angeles City', area: 'Fil-Am Friendship Hwy', lat: 15.1700, lng: 120.5950,
      rating: 4.9, reviews: 42, bookingsWeek: 70,
      hours: { open: 0, close: H(24) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: true, isNew: true, fillingFast: false, badge: null,
      desc: 'A classic American diner on Friendship Highway, open 24/7, for burgers, pancakes and steaks.',
      photo: 'images/champs.jpg', phone: '+639175511726',
    },
    {
      id: 'el-espanol', name: 'El Español Restaurant', cuisine: 'Spanish', style: 'Tapas & Paella', price: 3,
      city: 'Angeles City', area: 'The Quad, Nepo Center', lat: 15.1440, lng: 120.5980,
      rating: 4.8, reviews: 67, bookingsWeek: 66,
      hours: { open: H(11, 30), close: H(22) }, closedDays: [1], minParty: 1, maxParty: 14,
      preorder: true, isNew: true, fillingFast: false, badge: 'critics-pick',
      desc: 'Tapas and paella by Chef Pedro at The Quad, Nepo Center, from gambas al ajillo to croquetas de jamón.',
      photo: 'images/el-espanol.jpg', phone: '+639171328425',
    },
    {
      id: 'barbarinos', name: "Barbarino's Pub & Restaurant", cuisine: 'Pub & Grill', style: 'Tavern', price: 2,
      city: 'Angeles City', area: 'Zeppelin St, Malabanias', lat: 15.1596, lng: 120.5817,
      rating: 4.6, reviews: 189, bookingsWeek: 61,
      hours: { open: H(16), close: H(24) }, closedDays: [], minParty: 1, maxParty: 20,
      preorder: false, isNew: false, fillingFast: false, badge: 'local-favourite',
      desc: 'An English-themed pub and restaurant on Zeppelin Street with pub food, cold beer and quiz nights.',
      photo: 'images/barbarinos.jpg', phone: null,
    },
    {
      id: 'al-bacio', name: 'Al Bacio Italian Restaurant', cuisine: 'Italian', style: 'Ristorante & Pizzeria', price: 2,
      city: 'Angeles City', area: '21st St, Malabanias', lat: 15.16, lng: 120.585, approxLocation: true,
      rating: 4.7, reviews: 201, bookingsWeek: 58,
      hours: { open: H(11), close: H(22) }, closedDays: [], minParty: 1, maxParty: 16,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'The longest-running Italian restaurant in Angeles, open since 2007, cooking with ingredients imported from Italy.',
      photo: 'images/al-bacio.jpg', phone: '+63458920252',
    },
    {
      id: 'couscousi', name: 'Couscousi Mediterranean Grill', cuisine: 'Mediterranean', style: 'Grill', price: 3,
      city: 'Clark', area: 'Parade Grounds', lat: 15.1858, lng: 120.5545,
      rating: 4.7, reviews: 38, bookingsWeek: 44,
      hours: { open: H(11), close: H(23) }, closedDays: [], minParty: 1, maxParty: 10,
      preorder: false, isNew: true, fillingFast: false, badge: null,
      desc: 'Mediterranean and North African cooking by a Tunisian chef at the Clark Parade Grounds, from lamb chops to hummus and baklava.',
      photo: 'images/couscousi.jpg', phone: '+639672077529',
    },
    {
      id: 'niji', name: 'NIJI Infinity', cuisine: 'Japanese', style: 'Casual', price: 2,
      city: 'Angeles City', area: 'The Infinity, Pulung Maragul', lat: 15.1605, lng: 120.609, approxLocation: true,
      rating: 4.6, reviews: 154, bookingsWeek: 40,
      hours: { open: H(10), close: H(23) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'Sashimi, a sushi bar and teppanyaki at the Infinity branch of Niji, near Marquee Mall.',
      photo: 'images/niji.jpg', phone: '+639705693879',
    },
    {
      id: 'scots', name: 'Scots Restaurant & Cafe', cuisine: 'Café', style: 'All-Day Dining', price: 2,
      city: 'Angeles City', area: 'Zeppelin St, Malabanias', lat: 15.1597, lng: 120.5815,
      rating: 4.5, reviews: 97, bookingsWeek: 33,
      hours: { open: H(7), close: H(23) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'American classics and big breakfasts on Zeppelin Street: burgers, pasta, wings and steaks.',
      photo: 'images/scots.jpg', phone: '+639695718999',
    },
    {
      id: 'wildspices', name: 'Wildspices Café Infinity', cuisine: 'Café', style: 'Coffee & Brunch', price: 1,
      city: 'Angeles City', area: 'The Infinity, Pulung Maragul', lat: 15.1605, lng: 120.6092, approxLocation: true,
      rating: 4.6, reviews: 88, bookingsWeek: 29,
      hours: { open: H(10), close: H(22) }, closedDays: [], minParty: 1, maxParty: 8,
      preorder: false, isNew: false, fillingFast: false, badge: null,
      desc: 'A café at The Infinity mixing Mediterranean, Western, Mexican and Indian comfort food, from porterhouse steak to chicken tikka masala.',
      photo: 'images/wildspices.jpg', phone: '+639603243434',
    },
    // ---- Added September 2026 (details from each restaurant's own pages and listings;
    //      ratings, weekly bookings and party sizes are SAMPLE DATA) ----
    {
      id: 'barn-contis', name: "Barn by Conti's", cuisine: 'International', style: 'Comfort & Café', price: 3,
      city: 'Clark', area: 'Barn House 2085, R.C. Santos St', lat: 15.1862, lng: 120.5537, approxLocation: true,
      rating: 4.7, reviews: 64, bookingsWeek: 88,
      hours: { open: H(8), close: H(21) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: "Conti's first dining concept, opened in February 2026 inside one of Clark's breezy old barn houses, with comfort dishes, cakes, coffee and cocktails.",
      photo: 'images/barn-contis.jpg',
      // Backup while images/barn-contis.jpg isn't in the folder yet (run get-photos.sh once to save it locally)
      photoWeb: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg82DMw28ilFbiWcPKeEKZvv6JyqLN6L4q6RfPZXT6ZRQ9_cAwPnn665fzkgnW1-Vn7NhGgHer1hqHEyA1-xw0zm5u5ytdkdtY__B9CDonop1sb6xvFi7IzEDEGN_mINy-4-yj5h3UsLpAjzD_pOT4kUU76gkaP2N3FXGoBWuClwP706m9hbRy33EvMptA/w1600/Barn%202.jpg', phone: '+639173031061',
    },
    {
      id: 'crabs-n-crack', name: 'Crabs N Crack', cuisine: 'Seafood', style: 'Seafood Platters', price: 2,
      city: 'Angeles City', area: 'Don Aniceto Gueco Ave', lat: 15.1631, lng: 120.6080,
      rating: 4.5, reviews: 312, bookingsWeek: 121,
      hours: { open: H(10), close: H(23) }, closedDays: [], minParty: 1, maxParty: 20,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'A seafood house built for sharing, with crab and shrimp platters in chili garlic or Cajun sauce, eaten by hand boodle-style.',
      photo: 'images/crabs-n-crack.jpg',
      // Backup while images/crabs-n-crack.jpg isn't in the folder yet (run get-photos.sh once to save it locally)
      photoWeb: 'https://whereinpampanga.com/wp-content/uploads/2023/02/Crabs-N-Carck.jpg', phone: '+639176775482',
    },
    {
      id: 'amare', name: 'Amare by Chef Chris', cuisine: 'Italian', style: 'Italian-Mediterranean', price: 3,
      city: 'Clark', area: 'Royce Hotel, M.A. Roxas Hwy', lat: 15.1708, lng: 120.5822, approxLocation: true,
      rating: 4.3, reviews: 91, bookingsWeek: 54,
      hours: { open: H(11), close: H(22) }, closedDays: [], minParty: 1, maxParty: 12,
      preorder: false, isNew: false, fillingFast: false, badge: null,
      desc: 'Classic Italian-Mediterranean cooking at Royce Hotel in Clark, home of the late Chef Chris Locher\'s signature rollizza and fresh pasta.',
      photo: 'images/amare.jpg',
      // Backup while images/amare.jpg isn't in the folder yet (run get-photos.sh once to save it locally)
      photoWeb: 'https://whereinpampanga.com/wp-content/uploads/2023/07/Amare-by-Chef-Chris3-1.jpg', phone: '+639054449167',
    },
    {
      id: 'johns-kitchen', name: "John's Kitchen", cuisine: 'Steakhouse', style: 'Unli Steak', price: 2,
      city: 'Angeles City', area: 'Sampaguita Ave, Timog', lat: 15.1465, lng: 120.5790, approxLocation: true,
      rating: 3.9, reviews: 21, bookingsWeek: 47,
      hours: { open: H(16), close: H(23) }, closedDays: [0], minParty: 1, maxParty: 12,
      preorder: false, isNew: false, fillingFast: false, badge: null,
      desc: 'An unli-steak favourite since 2010, with steaks grilled to order and an unlimited buffet of sides. Dinner only, Monday to Saturday.',
      photo: 'images/johns-kitchen.jpg',
      // Backup while images/johns-kitchen.jpg isn't in the folder yet (run get-photos.sh once to save it locally)
      photoWeb: 'https://media-cdn.tripadvisor.com/media/photo-o/0f/33/43/ff/john-s-kitchen.jpg', phone: '+639336236908',
    },
    {
      id: 'cafe-retro-252', name: 'Cafe Retro 252', cuisine: 'Café', style: 'Korean-style Café', price: 2,
      city: 'Angeles City', area: 'Fil-Am Friendship Hwy', lat: 15.1450, lng: 120.5720, approxLocation: true,
      rating: 4.6, reviews: 8, bookingsWeek: 36,
      hours: { open: H(9), close: H(24) }, closedDays: [], minParty: 1, maxParty: 10,
      preorder: true, isNew: false, fillingFast: false, badge: null,
      desc: 'A modern-vintage café on Friendship Highway serving croffles, bingsu, tonkatsu and pasta, with an upstairs floor and al fresco seats.',
      photo: 'images/cafe-retro-252.jpg',
      // Backup while images/cafe-retro-252.jpg isn't in the folder yet (run get-photos.sh once to save it locally)
      photoWeb: 'https://media-cdn.tripadvisor.com/media/photo-m/1280/21/6e/72/7e/nice-place-retro-252.jpg', phone: null,
    },
  ];
})();

// ------------------------------------------------------------
// Menus (shown on every restaurant card; restaurants with
// preorder: true let diners add dishes to their booking).
// Dish names come from each restaurant's published menu or
// reviews. Prices marked * were published by the restaurant or
// a food writer; the rest are SAMPLE prices to confirm.
// ------------------------------------------------------------
(function () {
  // A trailing " *" marks a published price; it's stripped from the name shown to diners
  const M = (cat, items) => ({
    cat,
    items: items.map(([name, price, note]) => ({
      name: name.replace(/ \*$/, ''), price, note: note || '', published: / \*$/.test(name),
    })),
  });
  const menus = {
    sage: [
      M('Starters', [['Burrata Salad', 520, 'Tomatoes, basil, olive oil'], ['Mushroom Risotto with Prawns', 720]]),
      M('Pizza', [['Calabrese', 680, 'Spicy salami, mozzarella'], ['Quattro Formaggi', 650]]),
      M('Mains', [['Rosemary Lamb', 1450], ['Rib-eye Steak', 1850]]),
      M('Dessert', [['Tiramisu', 320]]),
    ],
    rustica: [
      M('Mains', [['Crispy Pork Adobo', 420], ['Sinigang na Hipon', 520], ['Kare-kare', 620], ['Grilled Liempo', 450]]),
      M('Rice', [['Shrimp Yang Chow Fried Rice', 360]]),
      M('Dessert', [['Halo-halo', 180]]),
    ],
    trattoria: [
      M('Antipasti', [['Pomodori', 420, 'Tomatoes and mozzarella']]),
      M('Pizza', [['Prosciutto Crudo con Tartufo *', 765], ['Hungarian Salsiccia', 620]]),
      M('Pasta & Risotto', [['Frutti di Mare *', 580], ['Pesto alla Genovese *', 650], ['Risotto Pollo Crema con Funghi di Tartufo *', 580]]),
      M('Mains', [["Bistecca con l'Osso *", 1100]]),
      M('Drinks', [['Amaretto Sour *', 260]]),
    ],
    'hola-parade': [
      M('Starters', [['Pumpkin Soup *', 220]]),
      M('Pizza & Pasta', [['Margherita *', 800], ['Frutti di Mare *', 870]]),
      M('Grill', [['Stone Ribeye *', 2600, 'Served on a hot stone'], ['Texas BBQ Platter', 1200], ['Slider Burgers', 480]]),
    ],
    'fiery-meats': [
      M('Unlimited', [['Unlimited Steak *', 549, 'With refillable sides']]),
      M('Sides & Extras', [['Chicken Wings (4 flavours)', 320], ['Pasta Carbonara', 280], ['Hungarian Sausage', 260], ['Mashed Potatoes', 120]]),
    ],
    matsuya: [
      M('Sashimi & Sushi', [['Salmon Sashimi', 480], ['Sushi Platter', 890]]),
      M('Hot', [['Tempura Moriawase', 420], ['Katsudon', 320]]),
      M('Hot Pot', [['Sukiyaki Hot Pot', 780, 'Good for two']]),
    ],
    roso: [
      M('Pizza', [['Margherita', 520], ['Pepperoni', 620], ['Quattro Formaggi', 650], ['Nduja & Honey', 690]]),
    ],
    changkat: [
      M('Rice', [['Nasi Lemak', 320], ['Chicken Biryani', 380]]),
      M('Mains', [['Beef Rendang', 450], ['Laksa', 390], ['Chicken Shawarma', 260]]),
    ],
    champs: [
      M('Burgers', [['Classic Cheeseburger', 320], ['Bacon Double Burger', 420]]),
      M('All-day Breakfast', [['Buttermilk Pancakes', 260], ['Steak & Eggs', 520]]),
      M('Sides & Drinks', [['Fries', 150], ['Milkshake', 210]]),
    ],
    'el-espanol': [
      M('Tapas', [['Gambas al Ajillo', 520], ['Croquetas de Jamón', 380], ['Fabada Asturiana', 560]]),
      M('Paella', [['Paella Negra', 1250, 'Good for 2–3'], ['Paella Mixta', 1300, 'Good for 2–3']]),
      M('Sandwiches & Dessert', [['Cuban Sandwich', 420], ['Crema Catalana', 240]]),
    ],
    barbarinos: [
      M('Pub Food', [['Fish & Chips', 450], ['Shrimp Carbonara', 420]]),
      M('Grill', [['Sirloin Steak', 890], ['Grilled Salmon', 780]]),
    ],
    'al-bacio': [
      M('Primi', [['Bigoli with Duck Ragù', 620], ['Seafood Risotto', 690]]),
      M('Secondi', [['Polenta with Baccalà', 580]]),
      M('Pizza & Dessert', [['Pizza Margherita', 480], ['Tiramisù', 260]]),
    ],
    couscousi: [
      M('Dips & Platters', [['Hummus & Baba Ganoush *', 500], ['Mixed Mediterranean Platter *', 990, 'Good for 2–3']]),
      M('Mains', [['Lamb Chops', 950], ['Chicken Couscous', 520]]),
      M('Dessert & Drinks', [['Baklava', 180], ['Tunisian Lemonade', 220]]),
    ],
    niji: [
      M('Sushi Bar', [['Salmon Sashimi', 450], ['Rainbow California Roll', 380]]),
      M('Teppanyaki & Hot', [['Beef Teppanyaki', 620], ['Tempura', 390], ['Chicken Curry', 320]]),
    ],
    scots: [
      M('Breakfast', [['Big Breakfast', 380], ['Eggs Benedict', 340]]),
      M('Mains', [['Cheeseburger', 360], ['Chicken Wings', 330], ['Carbonara', 320]]),
      M('Drinks', [['Earl Grey Tea', 120]]),
    ],
    wildspices: [
      M('Mains', [['Porterhouse Steak', 1250], ['Swiss Mushroom Chicken', 380], ['Seared Salmon in Basil Cream', 560]]),
      M('Indian', [['Chicken Tikka Masala', 390], ['Malai Chicken Boti', 360]]),
      M('Street Food', [['Birria Tacos', 340]]),
    ],
    'barn-contis': [
      M('Starters', [['Tomato Soup', 195], ['Asian Salad *', 345], ['Burger Sliders', 395]]),
      M('Mains', [['Grilled Satay & Basil Rice', 425], ['Mussels & Sourdough', 495], ['Baked Salmon', 595], ['Roast Beef in Mushroom Sauce', 545]]),
      M('Sweets', [['Cinnamon Toast', 220], ['Mango Bravo (slice)', 210]]),
    ],
    'crabs-n-crack': [
      M('Platters', [['Mixed Seafood Platter *', 1299, 'Good for 3'], ['Shrimp Platter *', 1199, 'Good for 3']]),
      M('Crabs', [['Crabs in Chili Garlic', 890], ['Cajun Crabs', 890]]),
      M('Rice & Sides', [['Crab Fat Rice', 320], ['Seafood Yang Chow', 290], ['Sinigang na Hipon', 450], ['Crispy Pata', 695], ['Kapampangan Sisig', 320]]),
    ],
    amare: [
      M('Signatures', [['Rollizza', 590, "Chef Chris's rolled flatbread"], ['Homemade Pasta', 520]]),
      M('Risotto & Gnocchi', [['Mushroom Risotto', 560], ['Gnocchi', 520]]),
      M('Grill', [['Grilled Angus Beef', 1450], ['Lamb', 1280]]),
    ],
    'johns-kitchen': [
      M('Unlimited', [['Unli Steak + Unli Buffet', 399, 'Steak, rice, pasta, soup, vegetables, mashed potatoes, corn, drinks']]),
    ],
    'cafe-retro-252': [
      M('Brunch', [['Croffle', 180], ['Monte Cristo', 320], ['Classic NY Burger', 360]]),
      M('Mains', [['King of Tonkatsu', 380], ['Hamburg Steak', 350], ['Seafood Tomato Pasta', 340], ['Pepperoni Pizza', 420], ['Buffalo Wings', 320]]),
      M('Desserts', [['Injeolmi Bingsu', 280], ['Cream Puff', 90], ['White Chocolate Sans Rival', 160]]),
    ],
  };

  // ------------------------------------------------------------
  // Table layouts (optional: only some restaurants share one).
  // Coordinates are % of the floor plan box. Availability shown
  // to diners is SIMULATED for the demo (see script.js).
  // ------------------------------------------------------------
  const T = (id, seats, x, y, shape, zone) => ({ id, seats, x, y, shape, zone });
  const layouts = {
    sage: {
      features: [{ label: 'Kitchen', x: 70, y: 4, w: 26, h: 18 }, { label: 'Entrance', x: 4, y: 86, w: 20, h: 10 }, { label: 'Garden', x: 4, y: 4, w: 30, h: 10 }],
      tables: [T('G1', 2, 8, 22, 'round', 'Garden'), T('G2', 2, 22, 22, 'round', 'Garden'), T('G3', 4, 38, 20, 'rect', 'Garden'),
        T('D1', 2, 10, 50, 'round', 'Dining room'), T('D2', 4, 28, 48, 'rect', 'Dining room'), T('D3', 4, 48, 48, 'rect', 'Dining room'),
        T('D4', 6, 72, 46, 'rect', 'Dining room'), T('D5', 2, 30, 76, 'round', 'Dining room'), T('D6', 8, 48, 74, 'rect', 'Dining room'),
        T('D7', 10, 74, 74, 'rect', 'Private corner')],
    },
    trattoria: {
      features: [{ label: 'Brick oven', x: 72, y: 4, w: 24, h: 16 }, { label: 'Entrance', x: 4, y: 86, w: 20, h: 10 }],
      tables: [T('W1', 2, 8, 12, 'round', 'Window'), T('W2', 2, 24, 12, 'round', 'Window'), T('W3', 2, 40, 12, 'round', 'Window'),
        T('C1', 4, 12, 44, 'rect', 'Centre'), T('C2', 4, 34, 44, 'rect', 'Centre'), T('C3', 6, 58, 44, 'rect', 'Centre'),
        T('O1', 4, 40, 76, 'rect', 'Outdoor'), T('O2', 8, 68, 76, 'rect', 'Outdoor')],
    },
    'hola-parade': {
      features: [{ label: 'Bar', x: 4, y: 4, w: 30, h: 14 }, { label: 'View of Parade Grounds', x: 40, y: 88, w: 56, h: 9 }],
      tables: [T('B1', 2, 42, 8, 'round', 'Bar side'), T('B2', 2, 56, 8, 'round', 'Bar side'), T('B3', 4, 72, 8, 'rect', 'Bar side'),
        T('L1', 4, 8, 36, 'rect', 'Lounge'), T('L2', 6, 30, 36, 'rect', 'Lounge'), T('L3', 4, 54, 36, 'rect', 'Lounge'),
        T('V1', 2, 12, 66, 'round', 'Rooftop edge'), T('V2', 2, 28, 66, 'round', 'Rooftop edge'), T('V3', 4, 46, 64, 'rect', 'Rooftop edge'),
        T('V4', 6, 68, 64, 'rect', 'Rooftop edge'), T('V5', 20, 76, 36, 'rect', 'Group table')],
    },
    'el-espanol': {
      features: [{ label: 'Open kitchen', x: 64, y: 4, w: 32, h: 16 }, { label: 'Entrance', x: 4, y: 86, w: 20, h: 10 }],
      tables: [T('1', 2, 8, 10, 'round', 'Indoor'), T('2', 2, 24, 10, 'round', 'Indoor'), T('3', 4, 10, 42, 'rect', 'Indoor'),
        T('4', 4, 32, 42, 'rect', 'Indoor'), T('5', 6, 58, 42, 'rect', 'Indoor'), T('6', 4, 44, 74, 'rect', 'Outdoor'), T('7', 14, 72, 74, 'rect', 'Outdoor')],
    },
    couscousi: {
      features: [{ label: 'Grill', x: 70, y: 4, w: 26, h: 14 }, { label: 'Veranda', x: 4, y: 86, w: 30, h: 10 }],
      tables: [T('I1', 2, 8, 10, 'round', 'Indoor'), T('I2', 4, 24, 10, 'rect', 'Indoor'), T('I3', 4, 46, 10, 'rect', 'Indoor'),
        T('I4', 6, 12, 42, 'rect', 'Indoor'), T('I5', 8, 40, 42, 'rect', 'Indoor'), T('S1', 6, 70, 42, 'rect', 'Floor cushions'),
        T('V1', 2, 44, 72, 'round', 'Veranda'), T('V2', 4, 58, 72, 'rect', 'Veranda'), T('V3', 10, 76, 72, 'rect', 'Veranda')],
    },
  };

  // Pet-friendly: only where the restaurant's own listing says so (Couscousi lists
  // "Dog Friendly" on Tripadvisor). Add more once a restaurant confirms.
  const petFriendly = new Set(['couscousi']);

  window.TABLEFOR_RESTAURANTS.forEach((r) => {
    r.menu = menus[r.id] || [];
    r.layout = layouts[r.id] || null;
    r.petFriendly = petFriendly.has(r.id);
    // Reservation tax each restaurant charges per booking (owners change it in the Partner Portal; minimum ₱100)
    if (r.tax == null) r.tax = r.price >= 4 ? 200 : r.price === 3 ? 150 : 100;
  });
})();
