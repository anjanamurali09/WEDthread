// The words on each feature page (/features/<slug>). Kept in one file so the page layout, the search tags
// (title, description, FAQ structured data) and the visible copy can never drift apart.
//
// Everything stated here describes what WEDthread actually does today. When a feature changes, change it here.

import budgetHero from "@/assets/features/budget-hero.webp";
import budgetReminders from "@/assets/features/budget-reminders.webp";
import seatingHero from "@/assets/features/seating-hero.webp";
import seatingSeatGuests from "@/assets/features/seating-seat-guests.webp";
import seatingShare from "@/assets/features/seating-share.webp";

// A real photograph on a feature page. `alt` describes what is in it, for people using screen readers and for
// search engines' image results.
export type FeaturePhoto = { src: string; alt: string; width: number; height: number };

export type FeatureContent = {
  slug: string;
  /** Under 60 characters including the brand, so Google shows it in full. */
  metaTitle: string;
  /** About 150 characters. */
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  heroBullets: string[];
  /** When set, the hero shows this photo and the animated preview moves into the first detail block. */
  hero?: FeaturePhoto;
  blocks: { h2: string; body: string[]; points: string[]; photo?: FeaturePhoto }[];
  steps: { title: string; body: string }[];
  different: { h2: string; body: string; points: string[] };
  faqs: { q: string; a: string }[];
  related: string[];
};

export const FEATURE_CONTENT: Record<string, FeatureContent> = {
  "guest-list": {
    slug: "guest-list",
    metaTitle: "Wedding Guest List Manager & RSVP Tracker | WEDthread",
    metaDescription: "Build your wedding guest list, track RSVPs, dietary needs and plus-ones for every event, and message guests on WhatsApp or email. Free to start.",
    eyebrow: "Guest list and RSVPs",
    h1: "Wedding guest list manager and RSVP tracker",
    intro: "Keep every name, contact, dietary need and reply in one place. Invite each guest to the events they are actually coming to, watch your guest count update as people respond, and stop chasing answers across group chats and spreadsheets.",
    heroBullets: [
      "Invite each guest to the right events, not all of them",
      "Track attending, declined, maybe and pending in real time",
      "Record dietary needs, allergies and accessibility notes",
      "Import a spreadsheet, or add guests one at a time",
    ],
    blocks: [
      {
        h2: "One guest list for every event",
        body: [
          "Most wedding guest list tools assume one party and one headcount. Real weddings are rarely that tidy. You might have a small family ceremony, a larger reception and a welcome dinner for travellers, each with a different guest list.",
          "In WEDthread you add each person once and choose which events they are invited to. Group guests into families or households, add tags such as \"college friends\" or \"bride's side\", and keep plus-ones attached to the right person.",
        ],
        points: ["Per-event invitations for every guest", "Families and households kept together", "Tags to sort and filter any way you like", "Plus-ones tracked with the guest who brought them"],
      },
      {
        h2: "RSVP tracking that updates itself",
        body: [
          "Every guest can reply from a personal link or from one open link you share with everyone. Their answer lands in your list immediately, marked as attending, declined, maybe or still pending, for each event they were invited to.",
          "Filter by event, household, dietary need or RSVP status to see exactly who has not replied yet, and your totals stay correct without any manual counting.",
        ],
        points: ["Personal RSVP link for each guest", "One open link when you would rather not send individual ones", "Live totals for every event", "Filters for the guests who still owe you an answer"],
      },
      {
        h2: "Dietary needs, allergies and accessibility in one place",
        body: [
          "Ask the question once when guests RSVP and the answer is saved against their name. Your caterer gets accurate numbers, and the same information carries into your seating plan so a nut allergy is never placed carelessly.",
        ],
        points: ["Dietary tags you choose, such as vegetarian, halal, kosher or vegan", "Allergy and accessibility notes saved per guest", "Information reused in seating and menu planning", "Export your list when a vendor asks for numbers"],
      },
      {
        h2: "Message guests without leaving your list",
        body: [
          "Send save-the-dates, invitations and reminders from the same screen. Pick a template, and WEDthread fills in each guest's name and opens WhatsApp or your email app with the message ready. You press send.",
          "Nudging everyone who has not responded takes a few clicks, because the list already knows who they are.",
        ],
        points: ["WhatsApp and email templates greeting every guest by name", "Reminder for guests who have not replied", "Works for guests in any country", "No app for guests to download"],
      },
    ],
    steps: [
      { title: "Add your guests", body: "Type them in, or import a CSV file from a spreadsheet you already have. A template is ready to download." },
      { title: "Choose who is invited to what", body: "Tick the events each guest or household is invited to, and add dietary needs as you go." },
      { title: "Share the link and watch replies arrive", body: "Send RSVP links by WhatsApp or email. Responses appear in your list as they come in." },
    ],
    different: {
      h2: "Built for multi-day and multicultural weddings",
      body: "A wedding with a ceremony, a cocktail hour and a reception, or guests flying in from three countries, needs more than one list and one number. WEDthread was designed around that from the start.",
      points: [
        "Different guest lists for each ceremony or celebration",
        "WhatsApp-first messaging for families who live on it",
        "International phone numbers and mixed-language households",
        "Dietary tags and allergy notes for any tradition, not just three meal choices",
      ],
    },
    faqs: [
      { q: "How do I create a wedding guest list?", a: "Start with the people you cannot imagine the day without, then add the next circle of family and friends. In WEDthread you add each person once, group families together, and choose which events they are invited to. You can import a CSV file or type guests in." },
      { q: "Can I invite different guests to different events?", a: "Yes. Every guest has their own set of events, so your ceremony, reception, welcome party and any other celebration can each have a different list and a separate headcount." },
      { q: "How do guests RSVP?", a: "Each guest can reply from a personal link, or you can share one open RSVP link. They answer on their phone for every event they are invited to. No app and no account is needed." },
      { q: "Can I import my guest list from a spreadsheet?", a: "Yes, you can import a CSV file. Download the template from the guest list, fill it in, and upload it. You can export your list as a CSV file at any time as well." },
      { q: "How do I keep track of dietary requirements and allergies?", a: "Guests record dietary needs and allergies when they RSVP, and you can add notes yourself. The information is saved against each guest and used in your seating plan and menu planning." },
      { q: "Do my guests need to create an account?", a: "No. Guests open their RSVP link, answer a few questions and they are done." },
      { q: "Can my partner or planner help with the guest list?", a: "Yes. You can invite a collaborator to your wedding so you both can add guests, update replies and plan together." },
      { q: "Is the guest list free?", a: "You can start planning for free, including your guest list and RSVP tracking." },
    ],
    related: ["rsvp-automation", "seating", "website"],
  },

  budgeting: {
    slug: "budgeting",
    metaTitle: "Wedding Budget Planner & Expense Tracker | WEDthread",
    metaDescription: "Plan your wedding budget, log every payment, split costs by event and category, and get reminders before vendor payments are due. Free to start.",
    eyebrow: "Wedding budget",
    h1: "Wedding budget planner and expense tracker",
    intro: "See what you have spent, what is left and what is due next, without a spreadsheet. Set your total budget, log each cost against a category and an event, and get a reminder before a vendor payment falls due.",
    heroBullets: [
      "Totals update the moment you log a cost",
      "Split spending by category and by event",
      "Payment reminders sent before a due date",
      "Plan in your own currency",
    ],
    blocks: [
      {
        h2: "Set a wedding budget you can actually keep",
        body: [
          "Start with the total you are comfortable spending, then divide it between categories such as venue, catering, photography and attire. Give each one an allocation and WEDthread shows you how much of it is already used.",
          "If one category runs over, you see it straight away and can decide what to move, rather than finding out when the final invoices arrive.",
        ],
        points: ["One total budget with room for every category", "An allocation for each category and each event", "Spent, remaining and over-budget at a glance", "Edit anything at any time"],
      },
      {
        h2: "Track every cost, paid or pending",
        body: [
          "Log each expense with its amount, the category, the event it belongs to, who paid and how. Mark it pending with a due date, or paid with the date it went out.",
          "Change the amount, the payer or the date straight from the list, and add your own columns for anything specific to your wedding.",
        ],
        points: ["Category, event, payer and payment method on every cost", "Pending and paid status with dates", "Type 500+200 and get the total", "Custom columns for your own notes"],
      },
      {
        h2: "Payment reminders before money is due",
        body: [
          "Deposits and final payments are where weddings go wrong. Set a reminder on any pending expense and WEDthread emails you on the date and time you choose. Tick one box to include your collaborators too.",
          "Reminders show as a bell on the expense, and they stop as soon as you mark it paid.",
        ],
        points: ["Email reminders at a time you choose", "Optional reminder for your collaborators", "Bell on every expense that has one", "Never miss a deposit or final payment"],
      },
      {
        h2: "Charts, breakdowns and exports",
        body: [
          "See where the money is going with breakdowns by category and by event, in charts you can switch between. When your parents, your planner or your accountant ask for the numbers, export your budget to Excel or PDF.",
        ],
        points: ["Breakdowns by category and event", "Several chart styles to choose from", "Excel and PDF export", "Share the plan with your partner"],
      },
    ],
    steps: [
      { title: "Set your total", body: "Enter your budget and pick your currency. Add the categories you expect to spend on." },
      { title: "Log costs as they happen", body: "Add each expense with its category, event and due date, and set a reminder for payments that are coming up." },
      { title: "Watch it add up", body: "Totals and charts update instantly, so you always know what is spent and what is left." },
    ],
    different: {
      h2: "Built for weddings with more than one event",
      body: "A ceremony, a cocktail hour and a reception each have their own costs. WEDthread lets you give every event its own allocation, so you can see the real cost of each celebration and not just one big total.",
      points: [
        "Budget by event as well as by category",
        "Seven currencies, including UAE dirham, pounds, euros and rupees",
        "Costs split between families by who paid",
        "Works the same for a destination wedding abroad",
      ],
    },
    faqs: [
      { q: "How do I make a wedding budget?", a: "Decide your total, then divide it between the biggest costs such as venue, catering, photography and attire. Leave a share for things you have not thought of yet. In WEDthread you set a total, add categories, and log every cost against them." },
      { q: "How much should a wedding cost?", a: "It depends heavily on where you marry, how many guests come, and how many events you hold. Instead of aiming at an average, set the total you are comfortable with and track real quotes against it as they arrive." },
      { q: "Can I track a budget for more than one wedding event?", a: "Yes. Each cost can belong to an event, and each event can have its own allocation. You can see spending for a ceremony, a reception or a welcome party separately." },
      { q: "Does WEDthread send payment reminders?", a: "Yes. Set a reminder on any pending expense and you get an email at the date and time you choose. You can include your collaborators, and the reminder stops when you mark the cost paid." },
      { q: "Which currencies can I use?", a: "US dollars, British pounds, euros, Indian rupees, UAE dirhams, Australian dollars and Canadian dollars." },
      { q: "Can I export my wedding budget?", a: "Yes. Export to Excel or PDF to share with family, your planner or your accountant." },
      { q: "Can my partner see and edit the budget?", a: "Yes. Invite them as a collaborator and you both work from the same budget." },
      { q: "Is the budget planner free?", a: "You can start planning for free, including your budget and payment reminders." },
    ],
    related: ["vendor-marketplace", "venues", "guest-list"],
  },

  seating: {
    slug: "seating",
    metaTitle: "Wedding Seating Chart Maker | WEDthread",
    metaDescription: "Drag and drop tables, seat guests from your RSVP list, and get warnings for full tables and allergies. A simple wedding seating chart maker.",
    eyebrow: "Seating chart",
    h1: "Wedding seating chart maker",
    intro: "Lay out your venue, place your tables and seat every guest on a canvas you can drag around. Your seating plan is built on your real guest list, so it is always up to date, and it warns you before a table is overfilled.",
    heroBullets: [
      "Drag and drop tables and guests",
      "Round, square and rectangular tables",
      "Warnings for full tables and allergies",
      "Export your plan as a PDF",
    ],
    blocks: [
      {
        h2: "A seating canvas you arrange like the room",
        body: [
          "Place tables, a dance floor and a bar exactly where they will stand on the day. Choose round, square or rectangular tables, set how many seats each has, and move them around until the room feels right.",
          "Everything is on one canvas, so you can see the whole room and not a list of table numbers.",
        ],
        points: ["Round, square and rectangular tables", "Dance floor, bar and other shapes", "Set seats per table", "Move and rearrange any time"],
      },
      {
        h2: "Seat guests straight from your RSVP list",
        body: [
          "Your seating plan uses the same guest list you already built, so there is nothing to retype. Guests who are attending are ready to seat, and when someone's reply changes, your plan reflects it.",
        ],
        points: ["Guests pulled from your RSVPs", "No retyping names", "Always in sync with replies", "Families and groups easy to keep together"],
      },
      {
        h2: "Warnings before problems reach the table",
        body: [
          "WEDthread tells you when a table is overfilled, and flags allergies so a guest with a serious allergy is not seated carelessly. It is a small check that avoids a lot of awkward moments on the day.",
        ],
        points: ["Capacity warnings on every table", "Allergy awareness while you seat", "Spot empty seats at a glance", "Fix problems before you print"],
      },
      {
        h2: "Share and print your plan",
        body: [
          "When the plan is done, export it as a PDF for your venue, your caterer or your planner, and keep a printed copy for the day.",
        ],
        points: ["PDF export", "A clear plan for your venue team", "Update and re-export when anything changes", "Share with your collaborators"],
      },
    ],
    steps: [
      { title: "Build your room", body: "Add the tables and shapes that match your venue's floor plan." },
      { title: "Seat your guests", body: "Drag attending guests to their tables. Families and groups are easy to place together." },
      { title: "Check and export", body: "Resolve any warnings, then export a PDF to share." },
    ],
    different: {
      h2: "For large families and several events",
      body: "Big family weddings and multi-day celebrations bring long guest lists and real seating politics. A visual plan with live warnings helps you work through them calmly.",
      points: [
        "Keep large families and households together",
        "Separate plans for different events",
        "Dietary and allergy information close to hand",
        "Easy changes when late replies come in",
      ],
    },
    faqs: [
      { q: "How do I make a wedding seating chart?", a: "List who is attending, decide your table shapes and sizes, then group guests so families and friends who get along sit together. In WEDthread you drag tables onto a canvas and drag guests onto them." },
      { q: "Can I use different table shapes?", a: "Yes. Choose round, square or rectangular tables and set the number of seats for each." },
      { q: "Does the seating chart use my RSVP list?", a: "Yes. It is built on your guest list, so attending guests are ready to seat and replies stay in sync." },
      { q: "Will it warn me if a table is too full?", a: "Yes. You get a warning when a table is over capacity, and allergies are flagged while you seat." },
      { q: "Can I export or print my seating plan?", a: "Yes, you can export your plan as a PDF." },
      { q: "Can I make seating plans for different events?", a: "Yes. Your plan is built on each event's guest list, so a welcome dinner and a reception can be arranged separately." },
      { q: "Can my partner help me with seating?", a: "Yes. Invite them as a collaborator and you can work on the plan together." },
      { q: "Is the seating chart maker free?", a: "You can start planning for free, including your seating chart." },
    ],
    related: ["guest-list", "rsvp-automation", "venues"],
  },

  "rsvp-automation": {
    slug: "rsvp-automation",
    metaTitle: "Wedding RSVP Online via WhatsApp & Email | WEDthread",
    metaDescription: "Collect wedding RSVPs online. Send personal RSVP links by WhatsApp or email, track replies for every event, and remind guests who have not answered.",
    eyebrow: "RSVPs and messaging",
    h1: "Online wedding RSVP by WhatsApp and email",
    intro: "Reach your guests where they already are. Send each person an RSVP link by WhatsApp or email, collect answers for every event, and see at a glance who still needs a nudge. Guests need no app and no account.",
    heroBullets: [
      "Personal RSVP link for every guest",
      "WhatsApp and email messages written for you",
      "Replies for every event in one place",
      "Remind everyone who has not answered",
    ],
    blocks: [
      {
        h2: "RSVP links that work on any phone",
        body: [
          "Each guest gets a link that opens a simple page on their phone. They answer for every event they are invited to, add dietary needs and any questions you have asked, and they are done in a minute.",
          "Prefer one link for everyone? Share the open RSVP link instead, and guests find their own name.",
        ],
        points: ["Personal links or one open link", "Works on any phone, no app to install", "Dietary and custom questions included", "Answers saved to your guest list instantly"],
      },
      {
        h2: "WhatsApp and email messages, written and personalised",
        body: [
          "Choose a template for a save-the-date, an invitation, a reminder or a thank-you. WEDthread greets each guest by name and opens WhatsApp or your email app with the message ready to send.",
          "Messages are sent from your own WhatsApp and email, so they come from a person guests know.",
        ],
        points: ["Templates for every stage, from save-the-date to thank you", "Each guest greeted by name", "WhatsApp or email, whichever suits them", "You stay in control of when each message goes"],
      },
      {
        h2: "Reminders for the guests who have gone quiet",
        body: [
          "Every wedding has a few guests who never quite reply. Open the reminder with everyone who has not responded already selected, and nudge them in a few clicks.",
        ],
        points: ["Automatic list of guests who have not replied", "One reminder template ready to go", "Chase only the people who need it", "Track replies as they arrive"],
      },
      {
        h2: "Your own RSVP questions",
        body: [
          "Ask what matters for your wedding: meal choice, song requests, a hotel booking, a note for the couple. Add your own questions to the RSVP and the answers sit with each guest's reply.",
        ],
        points: ["Custom questions on the RSVP form", "Answers stored with each guest", "Change the attendance wording to suit you", "Allow or hide a \"maybe\" answer"],
      },
    ],
    steps: [
      { title: "Choose your message", body: "Pick a template and check the wording." },
      { title: "Send by WhatsApp or email", body: "Each message opens ready to send, with the guest's name and personal link." },
      { title: "Follow the replies", body: "Answers appear in your guest list. Remind anyone who has not responded." },
    ],
    different: {
      h2: "RSVPs for guests everywhere",
      body: "When your guests live in different countries and speak different languages at home, an email alone is rarely enough. Meeting people on WhatsApp usually gets the answers back faster.",
      points: [
        "WhatsApp-first for families who live on it",
        "Links that open on any device",
        "Different invitations for different events",
        "No sign-ups or downloads for guests",
      ],
    },
    faqs: [
      { q: "How do I collect wedding RSVPs online?", a: "Send each guest a personal RSVP link, or share one open link. Guests answer on their phone and their reply is saved to your guest list." },
      { q: "Can I send RSVPs on WhatsApp?", a: "Yes. WEDthread opens WhatsApp with a personalised message and the guest's RSVP link ready, and you press send. You can use email instead, or both." },
      { q: "Do guests need an account or an app?", a: "No. They open the link and answer. Nothing to install and nothing to sign up for." },
      { q: "Can guests RSVP to individual events?", a: "Yes. They answer separately for every event they were invited to." },
      { q: "How do I remind guests who haven't replied?", a: "Open the reminder from your RSVP overview. Everyone who has not responded is already selected, so you can send a nudge in a few clicks." },
      { q: "Can I add my own questions to the RSVP?", a: "Yes. Add any questions you like, such as meal choice or travel plans, and the answers are saved with each guest." },
      { q: "Are messages sent automatically?", a: "Messages open ready to send from your own WhatsApp or email, so you decide when each one goes. Replies are collected automatically." },
      { q: "Is online RSVP free?", a: "You can start planning for free, including RSVP links and tracking." },
    ],
    related: ["guest-list", "website", "seating"],
  },

  registry: {
    slug: "registry",
    metaTitle: "Wedding Registry From Any Store | WEDthread",
    metaDescription: "Build one wedding registry from any store, plus cash funds for your honeymoon or home. Paste a link and WEDthread adds the photo, name and price.",
    eyebrow: "Wedding registry",
    h1: "Wedding registry from any store, in one place",
    intro: "Add gifts from any shop in any country by pasting a link. WEDthread pulls in the photo, name and price. Add cash funds for a honeymoon or a first home, and share one link with every guest.",
    heroBullets: [
      "Add any gift by pasting a product link",
      "Cash funds for your honeymoon or home",
      "One link to share with every guest",
      "See what has been claimed",
    ],
    blocks: [
      {
        h2: "Add gifts from any store",
        body: [
          "Most registries tie you to a few retailers. With WEDthread you find the item wherever you like, paste its link, and the photo, name and price are filled in for you.",
          "Guests buy from the retailer you chose, so a registry works wherever you and your guests live.",
        ],
        points: ["Works with the shops guests already use", "Photo, name and price pulled from the link", "Any country, any retailer", "Edit details if you want to"],
      },
      {
        h2: "Cash funds for what you really need",
        body: [
          "If you would rather receive contributions than gifts, add a fund for your honeymoon, your home or something of your own. Guests pledge an amount towards it, and you see the contributions in your registry.",
        ],
        points: ["Honeymoon and home funds ready to add", "Your own custom fund", "Guests choose how much to give", "Contributions visible only to you"],
      },
      {
        h2: "One link for everyone",
        body: [
          "No more juggling several registry sites. Everything sits on one page you can share in your invitations, on your wedding website and in your messages.",
        ],
        points: ["A single registry link", "Appears on your wedding website", "Looks good on every device", "Preview it before you share"],
      },
      {
        h2: "See what has been bought, without spoiling the surprise",
        body: [
          "Guests mark gifts as claimed so nobody buys the same thing twice. You see what has been taken, so you always know where your registry stands.",
        ],
        points: ["Claimed gifts marked for guests", "See gifts as they are taken", "Stop duplicate gifts", "Add or remove items any time"],
      },
    ],
    steps: [
      { title: "Add what you would love", body: "Paste product links, or add a cash fund." },
      { title: "Share your registry link", body: "Put it on your wedding website and in your invitations." },
      { title: "Watch it fill up", body: "See what is claimed and what contributions arrive." },
    ],
    different: {
      h2: "For couples and guests in different countries",
      body: "If your families live in different places, a registry tied to one retailer rarely works for everyone. A registry that accepts any link works wherever guests shop.",
      points: [
        "Any retailer in any country",
        "Cash funds that avoid shipping altogether",
        "One link to share across every group chat",
        "Gifts and funds side by side on one page",
      ],
    },
    faqs: [
      { q: "How do I create a wedding registry?", a: "Choose the gifts you would like, from any shop, and add them to your registry by pasting each product link. You can also add cash funds. Then share your registry link with guests." },
      { q: "Can I add gifts from any store?", a: "Yes. Paste a product link from any retailer, and WEDthread fills in the photo, name and price." },
      { q: "Can I ask for cash instead of gifts?", a: "Yes. Add a honeymoon fund, a home fund or your own custom fund, and guests pledge an amount." },
      { q: "Can guests see what has already been bought?", a: "Guests can see which gifts are claimed, so nobody buys the same item twice." },
      { q: "How do guests find my registry?", a: "Share your registry link, or add it to your wedding website so guests find it there." },
      { q: "Is the registry free?", a: "You can start planning for free, including your wedding registry." },
    ],
    related: ["website", "guest-list", "budgeting"],
  },

  website: {
    slug: "website",
    metaTitle: "Free Wedding Website Builder | WEDthread",
    metaDescription: "Create a free wedding website in minutes. Choose a template, add your story, events, travel details, photos, registry and RSVP in one shareable link.",
    eyebrow: "Wedding website",
    h1: "Free wedding website builder",
    intro: "Give your guests one beautiful place for everything: the story, the schedule for every event, travel and stay details, photos, your registry and an RSVP. Pick a template, add your details and share a single link.",
    heroBullets: [
      "Pick a template and customise colours and fonts",
      "A schedule for every ceremony and celebration",
      "Registry and RSVP built in",
      "Looks great on phones, tablets and desktop",
    ],
    blocks: [
      {
        h2: "A template that feels like you",
        body: [
          "Start from a design you like, then change the colours, fonts, photos and wording until it feels like your wedding. No design skills needed.",
          "Choose which sections appear, from your story and events to travel, photos, registry and RSVP, and put them in the order you want.",
        ],
        points: ["A choice of designed templates", "Your own colours, fonts and photos", "Switch sections on or off", "Preview exactly what guests see"],
      },
      {
        h2: "Every event, every detail, in one place",
        body: [
          "List each event with its date, time, venue and dress code, so guests know where to be and what to wear. Add travel and accommodation information for guests coming from afar.",
        ],
        points: ["A schedule for every ceremony and celebration", "Dates, times, venues and dress codes", "Travel and stay information", "Everything guests ask you about, answered once"],
      },
      {
        h2: "RSVP and registry without leaving the site",
        body: [
          "Guests can reply to every event from your website, and find your registry in one tap. Replies go straight to your guest list.",
        ],
        points: ["RSVP form on your site", "Registry linked from your site", "Replies saved to your guest list", "No separate tools for guests to learn"],
      },
      {
        h2: "Share one link, anywhere",
        body: [
          "Put your link in your invitations, your messages and your social posts. Your site is built to load quickly and read well on any screen.",
        ],
        points: ["One short link for everyone", "Mobile-friendly on every device", "Update details whenever plans change", "Publish when you are ready"],
      },
    ],
    steps: [
      { title: "Choose a template", body: "Pick the look you like and make it yours." },
      { title: "Add your story and events", body: "Fill in your details. Switch on the sections you want." },
      { title: "Publish and share", body: "Share your link and update it as plans change." },
    ],
    different: {
      h2: "A website for weddings with more than one ceremony",
      body: "Many wedding website builders assume a single ceremony. WEDthread was built for weddings with several events, guests from different families and traditions, and details that need to be clear for everyone.",
      points: [
        "Separate event details for each celebration",
        "Clear dress codes and venue information",
        "Guest-friendly travel information",
        "Language and wording that is yours to change",
      ],
    },
    faqs: [
      { q: "How do I make a free wedding website?", a: "Create your WEDthread account, pick a template, add your story and event details, and publish. Your site is ready to share in minutes." },
      { q: "Do I need design skills?", a: "No. Templates are designed for you. You only add your own words, photos and details." },
      { q: "Can guests RSVP on my wedding website?", a: "Yes. Guests can reply for every event, and their answers go straight to your guest list." },
      { q: "Can I add my registry to my wedding website?", a: "Yes. Your registry appears on your site, so guests find it easily." },
      { q: "Can I list more than one event on my site?", a: "Yes. Add each event with its own date, time, venue and dress code." },
      { q: "Does the site work on phones?", a: "Yes. Your site is designed to look good on phones, tablets and computers." },
      { q: "Can I change my site after I publish?", a: "Yes. Edit it whenever your plans change." },
      { q: "Is the wedding website free?", a: "You can start planning for free, including your wedding website." },
    ],
    related: ["rsvp-automation", "registry", "guest-list"],
  },

  venues: {
    slug: "venues",
    metaTitle: "Find Wedding Venues for Any Destination | WEDthread",
    metaDescription: "Browse wedding venues by city, capacity, price and style, from beach resorts to historic houses. Compare, save favourites and enquire directly.",
    eyebrow: "Wedding venues",
    h1: "Find wedding venues for any destination",
    intro: "Browse wedding venues in the places that matter to you, from a beachfront resort to a historic country house. Filter by city, capacity, price and type of space, save your favourites and send an enquiry.",
    heroBullets: [
      "Browse venues by city and country",
      "Filter by capacity, price and type of space",
      "Photos, details and reviews in one place",
      "Enquire or request a viewing directly",
    ],
    blocks: [
      {
        h2: "Search venues the way you plan",
        body: [
          "Start with where you want to marry, then narrow it down by the size of your guest list, your budget and the kind of space you picture. Indoor, outdoor, beach, rooftop, farmhouse, poolside or banquet hall are all there to choose from.",
        ],
        points: ["City and country filters", "Guest capacity range", "Price range in simple tiers", "Space types from beach to banquet hall"],
      },
      {
        h2: "See what you are really booking",
        body: [
          "Every venue profile shows photos, the type of space, capacity and price, and where it is. Flip through the gallery on the venue card without leaving the page.",
          "Save the venues you love and build a shortlist as you go.",
        ],
        points: ["Photo galleries on every listing", "Capacity, price and space type clearly shown", "Save favourites to a shortlist", "Reviews from couples, where available"],
      },
      {
        h2: "Enquire or book a viewing",
        body: [
          "When you find a venue you like, send an enquiry or request a viewing from the listing. Your details are prefilled from your wedding, so it takes a minute.",
        ],
        points: ["Enquire directly with the venue", "Request a viewing date", "Details prefilled from your wedding", "Keep every conversation in one place"],
      },
      {
        h2: "Venues for every kind of celebration",
        body: [
          "Different traditions need different spaces: an outdoor setting for a ceremony, a banquet hall for the reception, a poolside lounge for a welcome party. Browse by what each event needs.",
        ],
        points: ["Spaces for ceremonies and receptions", "Welcome parties and farewell brunches", "Large and small guest lists", "Destination venues abroad"],
      },
    ],
    steps: [
      { title: "Choose where and how many", body: "Pick your city or country and your approximate guest count." },
      { title: "Shortlist the ones you love", body: "Save favourites and compare photos, capacity and price." },
      { title: "Get in touch", body: "Send an enquiry or request a viewing." },
    ],
    different: {
      h2: "Built for destination and multicultural weddings",
      body: "If you are marrying abroad, or planning several events across a few days, you need venues in places you may never have visited. Clear details, honest photos and direct enquiries make that easier.",
      points: [
        "Venues across cities and countries",
        "Filter by the space each event needs",
        "Direct enquiries to the venue",
        "Verified venue listings",
      ],
    },
    faqs: [
      { q: "How do I find a wedding venue?", a: "Decide where you want to marry and roughly how many guests will come, then browse venues by city, capacity, price and type of space. Save the ones you like and send enquiries." },
      { q: "Can I search for destination wedding venues?", a: "Yes. Browse by city and country, wherever you plan to marry." },
      { q: "What types of space can I filter for?", a: "Indoor, outdoor, poolside, banquet hall, rooftop, farmhouse and beach." },
      { q: "Can I filter by guest count and budget?", a: "Yes. Filter by a guest capacity range and by price tier." },
      { q: "How do I contact a venue?", a: "Send an enquiry or request a viewing from the venue's page." },
      { q: "Are the venues verified?", a: "Venue listings are reviewed before they appear in the directory." },
      { q: "Can I save venues to compare later?", a: "Yes. Save venues with the heart button and come back to your shortlist any time." },
      { q: "Is it free to browse venues?", a: "Yes. You can browse venues for free." },
    ],
    related: ["vendor-marketplace", "budgeting", "guest-list"],
  },

  "vendor-marketplace": {
    slug: "vendor-marketplace",
    metaTitle: "Wedding Vendors Marketplace | WEDthread",
    metaDescription: "Find wedding photographers, planners, caterers, florists, DJs, makeup artists and more. Browse vendors by category, location and budget, then enquire directly.",
    eyebrow: "Wedding vendors",
    h1: "Wedding vendors for every tradition and budget",
    intro: "Find the photographers, planners, caterers, florists, DJs and makeup artists who will bring your wedding to life. Browse by category, location and budget, compare their work and get in touch in a few clicks.",
    heroBullets: [
      "Photographers, planners, caterers, florists and more",
      "Browse by category, city and budget",
      "Photos of real work on every profile",
      "Send an enquiry straight from the listing",
    ],
    blocks: [
      {
        h2: "Every kind of wedding vendor in one place",
        body: [
          "Browse photographers and videographers, wedding planners, caterers, florists and decor, DJs and live music, makeup and hair, officiants and more. Pick a category and see who is available where you are marrying.",
        ],
        points: ["Photography and video", "Planning and coordination", "Catering and cake", "Music, florals, beauty and attire"],
      },
      {
        h2: "Compare real work, not just prices",
        body: [
          "Each vendor profile shows photos of their work, the services they offer and where they work. Flip through the gallery, save the vendors you like, and see which ones suit your style and budget.",
        ],
        points: ["Photo galleries of past work", "Services and categories clearly listed", "Price tiers to match your budget", "Save favourites to a shortlist"],
      },
      {
        h2: "Enquire directly",
        body: [
          "Send an enquiry from a vendor's page with your date and details already filled in. Conversations stay together in your account, so nothing gets lost between apps.",
        ],
        points: ["Enquiry from the vendor's page", "Details prefilled from your wedding", "Messages kept in one place", "Reply to enquiries in your account"],
      },
      {
        h2: "Vendors for every kind of celebration",
        body: [
          "A live musician, a celebrant or a photographer who knows the schedule can be hard to find in a new city. Browse vendors who work in the place you are marrying.",
        ],
        points: ["Vendors for many styles of wedding", "Live musicians and DJs", "Celebrants and officiants", "Local and destination vendors"],
      },
    ],
    steps: [
      { title: "Choose a category", body: "Start with the vendor you need most, such as a photographer or a planner." },
      { title: "Compare their work", body: "Look through galleries, services and price tiers." },
      { title: "Send an enquiry", body: "Get in touch from the listing and keep the conversation in your account." },
    ],
    different: {
      h2: "Vendors for weddings that do not fit a template",
      body: "If your wedding spans several days and traditions, you need vendors who understand them. WEDthread's marketplace covers the categories that multicultural and destination weddings actually need.",
      points: [
        "Wide range of categories, including traditional ceremonies",
        "Vendors in many cities and countries",
        "Direct contact with each vendor",
        "Listings reviewed before they go live",
      ],
    },
    faqs: [
      { q: "How do I find wedding vendors?", a: "Choose a category such as photography or catering, filter by country and price tier, and look through each vendor's photos and services. Send an enquiry to the ones you like." },
      { q: "What kinds of vendors can I find?", a: "Photographers, videographers, planners, caterers, florists and decor, DJs and live music, makeup and hair, officiants, cake makers, transport and more." },
      { q: "Can I find vendors for a destination wedding?", a: "Yes. Browse vendors by city and country, wherever you plan to marry." },
      { q: "How do I contact a vendor?", a: "Send an enquiry from their page. Your wedding details are filled in for you." },
      { q: "Are vendors verified?", a: "Vendor listings are reviewed before they appear in the marketplace." },
      { q: "Can vendors list their business on WEDthread?", a: "Yes. Vendors and venues can sign up and apply to list their business." },
      { q: "Is it free to browse vendors?", a: "Yes. You can browse vendors for free." },
    ],
    related: ["venues", "budgeting", "guest-list"],
  },
};

export const FEATURE_SLUGS_IN_ORDER = ["guest-list", "budgeting", "seating", "rsvp-automation", "registry", "website", "venues", "vendor-marketplace"];

// Photos for the pages that have them so far.
FEATURE_CONTENT.budgeting.hero = { src: budgetHero, width: 1100, height: 1100, alt: "A couple smiling together as they plan their wedding budget on a laptop in a sunny room" };
FEATURE_CONTENT.budgeting.blocks[2].photo = { src: budgetReminders, width: 800, height: 800, alt: "A couple on a sofa going through papers and a laptop together, planning their payments" };
FEATURE_CONTENT.seating.hero = { src: seatingHero, width: 1200, height: 800, alt: "Curved rows of white chairs set out for an outdoor wedding ceremony beside a lake" };
FEATURE_CONTENT.seating.blocks[1].photo = { src: seatingSeatGuests, width: 900, height: 600, alt: "A wedding table with a numbered table sign, place cards, glasses and a flower centrepiece" };
FEATURE_CONTENT.seating.blocks[3].photo = { src: seatingShare, width: 900, height: 601, alt: "Wooden chairs with sheepskin throws and a reserved sign, laid out for a wedding ceremony" };
