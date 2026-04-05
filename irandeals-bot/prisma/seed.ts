/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// const SUPPORTED_CITIES: Record<string, string[]> = {
//   'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
//   'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
//   'Sweden': ['Stockholm', 'Gothenburg', 'Malmö'],
//   'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
//   'United States': ['Los Angeles', 'New York', 'San Jose', 'Washington DC', 'Houston'],
// }
const SUPPORTED_CITIES: Record<string, string[]> = {
  Germany: [
    "Berlin",
    "Hamburg",
    "Munich",
    "Cologne",
    "Frankfurt",
    "Stuttgart",
    "Düsseldorf",
    "Leipzig",
    "Dortmund",
    "Essen",
    "Bremen",
    "Dresden",
    "Hannover",
    "Nuremberg",
    "Duisburg",
    "Bochum",
    "Wuppertal",
    "Bielefeld",
    "Bonn",
    "Mannheim",
    "Karlsruhe",
    "Wiesbaden",
    "Münster",
    "Gelsenkirchen",
    "Aachen",
    "Braunschweig",
    "Chemnitz",
    "Kiel",
    "Halle",
    "Magdeburg",
    "Freiburg",
    "Krefeld",
    "Lübeck",
    "Oberhausen",
    "Erfurt",
    "Mainz",
    "Rostock",
    "Kassel",
    "Hagen",
    "Saarbrücken",
    "Hamm",
    "Potsdam",
    "Ludwigshafen",
    "Oldenburg",
    "Leverkusen",
    "Osnabrück",
    "Solingen",
    "Heidelberg",
    "Herne",
    "Neuss",
    "Darmstadt",
    "Paderborn",
    "Regensburg",
    "Ingolstadt",
    "Würzburg",
    "Fürth",
    "Wolfsburg",
    "Ulm",
    "Heilbronn",
    "Pforzheim",
    "Göttingen",
    "Bottrop",
    "Trier",
    "Reutlingen",
    "Koblenz",
    "Bremerhaven",
    "Jena",
    "Remscheid",
    "Erlangen",
    "Moers",
    "Siegen",
    "Hildesheim",
    "Salzgitter",
  ],

  "United Kingdom": [
    "London",
    "Birmingham",
    "Manchester",
    "Leeds",
    "Glasgow",
    "Liverpool",
    "Sheffield",
    "Bristol",
    "Edinburgh",
    "Leicester",
    "Coventry",
    "Bradford",
    "Cardiff",
    "Belfast",
    "Nottingham",
    "Hull",
    "Newcastle",
    "Stoke-on-Trent",
    "Southampton",
    "Derby",
    "Portsmouth",
    "Brighton",
    "Plymouth",
    "Reading",
    "Northampton",
    "Luton",
    "Wolverhampton",
    "Bolton",
    "Bournemouth",
    "Norwich",
    "Swindon",
    "Oxford",
    "Cambridge",
    "Ipswich",
    "Exeter",
    "York",
    "Milton Keynes",
    "Aberdeen",
    "Dundee",
  ],

  Sweden: [
    "Stockholm",
    "Gothenburg",
    "Malmö",
    "Uppsala",
    "Västerås",
    "Örebro",
    "Linköping",
    "Helsingborg",
    "Jönköping",
    "Norrköping",
    "Lund",
    "Umeå",
    "Gävle",
    "Borås",
    "Södertälje",
    "Eskilstuna",
    "Halmstad",
    "Växjö",
    "Karlstad",
    "Sundsvall",
    "Östersund",
    "Trollhättan",
    "Falun",
    "Kalmar",
    "Karlskrona",
    "Kristianstad",
  ],

  Canada: [
    "Toronto",
    "Montreal",
    "Vancouver",
    "Calgary",
    "Edmonton",
    "Ottawa",
    "Winnipeg",
    "Quebec City",
    "Hamilton",
    "Kitchener",
    "London",
    "Victoria",
    "Halifax",
    "Oshawa",
    "Windsor",
    "Saskatoon",
    "Regina",
    "Sherbrooke",
    "St. John's",
    "Barrie",
    "Kelowna",
    "Abbotsford",
    "Sudbury",
    "Kingston",
    "Trois-Rivières",
    "Guelph",
    "Moncton",
    "Brantford",
    "Thunder Bay",
  ],

  "United States": [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose",
    "Austin",
    "Jacksonville",
    "Fort Worth",
    "Columbus",
    "Charlotte",
    "San Francisco",
    "Indianapolis",
    "Seattle",
    "Denver",
    "Washington DC",
    "Boston",
    "El Paso",
    "Nashville",
    "Detroit",
    "Oklahoma City",
    "Portland",
    "Las Vegas",
    "Memphis",
    "Louisville",
    "Baltimore",
    "Milwaukee",
    "Albuquerque",
    "Tucson",
    "Fresno",
    "Sacramento",
    "Kansas City",
    "Mesa",
    "Atlanta",
    "Omaha",
    "Colorado Springs",
    "Raleigh",
    "Miami",
    "Long Beach",
    "Virginia Beach",
    "Oakland",
    "Minneapolis",
    "Tulsa",
    "Arlington",
    "Tampa",
    "New Orleans",
    "Wichita",
    "Cleveland",
    "Bakersfield",
    "Aurora",
    "Anaheim",
    "Honolulu",
    "Santa Ana",
    "Riverside",
    "Corpus Christi",
    "Lexington",
    "Stockton",
    "Henderson",
    "Saint Paul",
    "St. Louis",
    "Cincinnati",
    "Pittsburgh",
    "Greensboro",
    "Anchorage",
    "Plano",
    "Lincoln",
    "Orlando",
    "Irvine",
    "Newark",
    "Toledo",
    "Durham",
    "Chula Vista",
    "Fort Wayne",
    "Jersey City",
    "St. Petersburg",
    "Laredo",
    "Madison",
    "Chandler",
    "Buffalo",
    "Lubbock",
    "Scottsdale",
    "Reno",
    "Glendale",
    "Gilbert",
    "Winston-Salem",
    "North Las Vegas",
    "Norfolk",
    "Chesapeake",
    "Garland",
    "Irving",
    "Hialeah",
    "Fremont",
    "Boise",
  ],
};
async function main() {
  // Seed locations
  const expectedCountries = new Set(Object.keys(SUPPORTED_CITIES));
  for (const [countryName, cities] of Object.entries(SUPPORTED_CITIES)) {
    const country = await prisma.country.upsert({
      where: { name: countryName },
      update: { active: true },
      create: { name: countryName, active: true },
    });

    const expectedCities = new Set(cities);

    for (const cityName of cities) {
      await prisma.city.upsert({
        where: { name_countryId: { name: cityName, countryId: country.id } },
        update: { active: true },
        create: { name: cityName, countryId: country.id, active: true },
      });
    }

    await prisma.city.updateMany({
      where: {
        countryId: country.id,
        name: { notIn: Array.from(expectedCities) },
      },
      data: { active: false },
    });
  }

  await prisma.country.updateMany({
    where: { name: { notIn: Array.from(expectedCountries) } },
    data: { active: false },
  });
  console.log("Locations seeded.");

  // Seed default admin user
  const adminPassword = process.env.ADMIN_UI_PASSWORD ?? "changeme";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: { password: hash },
    create: { username: "admin", password: hash },
  });
  console.log("Admin user seeded.");

  // ── Sample businesses ────────────────────────────────────────────────────────
  const sampleBusinesses = [
    { telegramId: 1000000001n, name: "Dariush Persian Grocery", country: "Germany",        city: "Berlin",  category: "Grocery",    phone: "+49 30 1234567", website: "https://dariush-grocery.de",  instagram: "dariush_grocery_berlin", status: "approved" },
    { telegramId: 1000000002n, name: "Ariana Persian Restaurant", country: "United Kingdom", city: "London",  category: "Restaurant", phone: "+44 20 7946 0958", website: "https://ariana-restaurant.co.uk", instagram: "ariana_london",     status: "approved" },
    { telegramId: 1000000003n, name: "Laleh Beauty Salon",        country: "Sweden",         city: "Stockholm", category: "Beauty",  phone: "+46 8 123 456", website: null,                           instagram: "laleh_beauty_stockholm", status: "approved" },
    { telegramId: 1000000004n, name: "Tehran Travel Agency",      country: "Canada",         city: "Toronto", category: "Travel",    phone: "+1 416 555 0100", website: "https://tehrantravels.ca",    instagram: "tehran_travels_to",      status: "approved" },
    { telegramId: 1000000005n, name: "Shiraz Real Estate",        country: "United States",  city: "Los Angeles", category: "RealEstate", phone: "+1 310 555 0199", website: "https://shirazre.com", instagram: "shiraz_realestate",      status: "approved" },
    { telegramId: 1000000006n, name: "Persepolis Retail",         country: "Germany",        city: "Hamburg", category: "Retail",     phone: "+49 40 9876543", website: null,                           instagram: "persepolis_hamburg",     status: "pending"  },
  ] as const;

  const createdBusinesses: Record<string, string> = {};
  for (const b of sampleBusinesses) {
    const biz = await prisma.business.upsert({
      where: { telegramId: b.telegramId },
      update: { status: b.status },
      create: {
        telegramId: b.telegramId,
        name: b.name,
        country: b.country,
        city: b.city,
        category: b.category,
        phone: b.phone ?? null,
        website: b.website ?? null,
        instagram: b.instagram ?? null,
        status: b.status,
        verified: b.status === "approved",
        approvedAt: b.status === "approved" ? new Date() : null,
      },
    });
    createdBusinesses[b.name] = biz.id;
  }
  console.log("Sample businesses seeded.");

  // ── Sample deals ─────────────────────────────────────────────────────────────
  const inOneWeek  = new Date(Date.now() + 7  * 86400_000);
  const inTwoWeeks = new Date(Date.now() + 14 * 86400_000);
  const inOneMonth = new Date(Date.now() + 30 * 86400_000);

  const sampleDeals = [
    {
      businessName: "Dariush Persian Grocery",
      title: "15% off all Iranian imported goods",
      description: "Use code IRAN15 at checkout. Valid on all imported Iranian products including saffron, dried fruits, nuts, and spices.",
      targetCountry: "Germany", targetCity: "Berlin",
      expiresAt: inTwoWeeks,
    },
    {
      businessName: "Ariana Persian Restaurant",
      title: "20% off weekend family dinners",
      description: "Book a table for 4 or more on Friday or Saturday evenings and enjoy 20% off your total bill. Mention Iran Deals when booking.",
      targetCountry: "United Kingdom", targetCity: "London",
      expiresAt: inOneWeek,
    },
    {
      businessName: "Laleh Beauty Salon",
      title: "Free eyebrow threading with any haircut",
      description: "Book any haircut service and get complimentary eyebrow threading. Appointment required. Valid Mon–Thu only.",
      targetCountry: "Sweden", targetCity: "Stockholm",
      expiresAt: inTwoWeeks,
    },
    {
      businessName: "Tehran Travel Agency",
      title: "€50 off flights to Tehran this winter",
      description: "Exclusive discount on round-trip flights from Toronto to Tehran (IKA). Book before end of month. Limited seats.",
      targetCountry: "Canada", targetCity: "Toronto",
      expiresAt: inOneMonth,
    },
    {
      businessName: "Shiraz Real Estate",
      title: "Free home valuation for Iranian community",
      description: "Get a free, no-obligation home valuation from our bilingual Farsi/English speaking agents. Call or WhatsApp to book.",
      targetCountry: "United States", targetCity: "Los Angeles",
      expiresAt: inOneMonth,
    },
  ];

  for (const d of sampleDeals) {
    const businessId = createdBusinesses[d.businessName];
    if (!businessId) continue;
    const existing = await prisma.deal.findFirst({ where: { businessId, title: d.title } });
    if (!existing) {
      await prisma.deal.create({
        data: {
          businessId,
          title: d.title,
          description: d.description,
          targetCountry: d.targetCountry,
          targetCity: d.targetCity,
          expiresAt: d.expiresAt,
          active: true,
          broadcastAt: new Date(),
        },
      });
    }
  }
  console.log("Sample deals seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
