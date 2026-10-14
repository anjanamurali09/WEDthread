// The blog: guides for couples planning a wedding. Each article is a list of simple blocks, so the page layout, the
// search tags and the article structured data are all built from the same words. To add an article, add an entry
// here and a hero image under public/blog/.

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "img"; src: string; alt: string; width: number; height: number; caption?: string }
  | { t: "tip"; text: string };

export type BlogPost = {
  slug: string;
  /** Under 60 characters including the brand, so Google shows it in full. */
  metaTitle: string;
  metaDescription: string;
  title: string;
  excerpt: string;
  category: string;
  /** Hero image, 1200x630, also used as the social share picture. */
  image: string;
  imageAlt: string;
  published: string; // YYYY-MM-DD
  body: Block[];
  related: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "wedding-planning-priorities",
    metaTitle: "Wedding Planning Priorities: Top 10 to Sort | WEDthread",
    metaDescription: "The 10 things to sort for your wedding, in order of priority, from venue and budget to guest list, vendors, invitations and the final details.",
    title: "The top 10 things to sort for your wedding, in order of priority",
    excerpt: "Start with the venue, then work down the list. Here is what to book and decide first, and what can wait.",
    category: "Planning",
    image: "/blog/wedding-planning-priorities.jpg",
    imageAlt: "A villa surrounded by gardens, with guests gathering at a wedding celebration on the lawn",
    published: "2026-10-14",
    related: ["wedding-budget-planning", "unique-wedding-ideas"],
    body: [
      { t: "p", text: "Planning a wedding feels like a hundred decisions at once. The trick is that they are not equal. A few early choices decide almost everything that follows: where you marry, how many people come, and how much you can spend. Get those right and the rest falls into place. This list puts the ten most important things in the order that usually works best." },
      { t: "tip", text: "Before anything else, agree a rough total budget and a rough guest number with your partner, and with anyone who is contributing. You will use both in every step below." },
      { t: "h2", text: "1. The venue and the date" },
      { t: "p", text: "The venue is the biggest decision you will make, and it is also the one that limits all the others. It sets your date, your capacity, your style and a large share of your budget. Popular venues are often booked a year or more ahead, especially for weekends in peak season, so start here." },
      { t: "p", text: "Visit your shortlist if you can, and ask what is included: tables and chairs, catering, a wet-weather plan, how late music can play and when you can access the space. If you are marrying in a city you do not know, browse venues by capacity, price and type of space first so you only visit the ones that fit." },
      { t: "h2", text: "2. Your budget breakdown" },
      { t: "p", text: "Once you know what the venue costs, divide the rest of your budget between catering, photography, attire, decor, music and everything else. Venue and catering are usually the two largest costs, so seeing them first stops you overspending on small items early. Keep a buffer for things you have not thought of yet." },
      { t: "p", text: "Our guide to wedding budget planning goes through this step by step." },
      { t: "h2", text: "3. The guest list" },
      { t: "p", text: "Your guest list shapes the venue size, the catering bill and the invitations. Write a first list of the people you cannot imagine the day without, then a second list of people you would love to invite if there is room. If you are holding more than one event, decide who is invited to which one from the start." },
      { t: "img", src: "/blog/aerial-ceremony-chairs.webp", alt: "Curved rows of white chairs set out for an outdoor wedding ceremony beside a lake", width: 1000, height: 667, caption: "Your guest number decides how many chairs, tables and seats you need to plan for." },
      { t: "h2", text: "4. Photographer and videographer" },
      { t: "p", text: "Good photographers book up early, often before the rest of the vendors, and your photos are the one thing you keep forever. Look at full galleries, not only highlights, and check that their style suits your venue and your light. Ask how many hours are included and when you will see the pictures." },
      { t: "h2", text: "5. Catering, drinks and the menu" },
      { t: "p", text: "Check first whether your venue includes catering or has an approved list. Taste the food if you can. Gather dietary needs and allergies as early as you can, because they decide the menu, the bar and the seating." },
      { t: "h2", text: "6. A planner or day-of coordinator" },
      { t: "p", text: "A planner is the person who runs the day so you and your family do not have to. If a full planner is outside your budget, a day-of coordinator who takes over in the final weeks is often enough. Either way, decide early, because they can recommend vendors and catch problems before they happen." },
      { t: "h2", text: "7. Attire" },
      { t: "p", text: "Outfits can take months to make, alter and ship, and delays are common. Start looking as soon as your date is set, and leave time for fittings. Plan accessories, shoes and any outfit changes for different events at the same time." },
      { t: "h2", text: "8. Invitations, your wedding website and RSVPs" },
      { t: "p", text: "Send a save-the-date once the venue and date are confirmed, especially if guests need to travel. Follow it with invitations around two to three months before the wedding. Put the schedule, venue details, travel advice and dress code on a wedding website, and collect replies in one place so you are not chasing guests across group chats." },
      { t: "h2", text: "9. Decor, flowers and styling" },
      { t: "p", text: "Decor is where costs can quietly grow. Start from the venue: what is already beautiful, and what does it need? Decide your colours and two or three key moments, such as the ceremony backdrop and the table centrepieces, and put your money there." },
      { t: "h2", text: "10. Music, the seating plan and the final details" },
      { t: "p", text: "Book your music, whether that is a band, a DJ or a playlist, once the venue is fixed. In the last weeks, build your seating plan from your final replies, confirm times with every vendor, plan transport and accommodation for guests who are travelling, and write a clear timeline for the day that everyone can follow." },
      { t: "img", src: "/blog/table-number-styling.webp", alt: "A wedding table with a numbered table sign, place cards, glasses and a flower centrepiece", width: 1000, height: 667, caption: "Seating plans are easiest once your final guest replies are in." },
      { t: "h2", text: "What to do when you feel behind" },
      { t: "p", text: "Almost every couple feels behind at some point. Go back to the list: if the venue, budget and guest list are settled, you are in a good place. Everything else can be simplified, delegated or done later. Keep your plan in one place, share it with your partner, and tick things off as you go." },
      { t: "p", text: "WEDthread keeps your guest list, RSVPs, seating, budget, registry and wedding website together, so the ten steps above live in one plan instead of ten different apps." },
    ],
  },

  {
    slug: "wedding-budget-planning",
    metaTitle: "Wedding Budget Planning: A Step-by-Step Guide | WEDthread",
    metaDescription: "How to plan a wedding budget: set your total, split it by priority, plan for weather, delays and last-minute changes, and track every payment.",
    title: "Wedding budget planning: how to go about it",
    excerpt: "Where the money goes, how to split it, and why you need room for weather, delays and last-minute changes.",
    category: "Budget",
    image: "/blog/wedding-budget-planning.jpg",
    imageAlt: "A couple smiling together as they plan their wedding budget",
    published: "2026-10-14",
    related: ["wedding-planning-priorities", "unique-wedding-ideas"],
    body: [
      { t: "p", text: "A wedding budget is not a restriction. It is a way of deciding what matters most to you before the bills arrive. Couples who plan their money early usually spend it better, argue about it less and avoid the surprise that comes when final invoices add up to more than expected. Here is a simple way to plan yours." },
      { t: "h2", text: "Step 1: Agree your total and who is contributing" },
      { t: "p", text: "Start with an honest total. Add what you can save, any gifts or contributions from family, and anything you would not want to go without. Be clear about who is paying for what, and talk about it early, because expectations can differ and surprises are easier to handle in the planning stage than in the final week." },
      { t: "h2", text: "Step 2: Decide what matters most" },
      { t: "p", text: "Write down the three things you would hate to compromise on. For some couples it is the food, for others the photographer, the music or the venue itself. Spend more where it matters to you and less where it does not. This is what makes a budget feel generous and not restrictive." },
      { t: "h2", text: "Step 3: Know where the money usually goes" },
      { t: "p", text: "Every wedding is different, but the pattern is familiar. The venue is usually the single biggest cost, and catering often comes close behind, especially when it is priced per guest. After those, decor and flowers can climb faster than people expect, followed by photography, attire, music and everything else. As a starting point, many couples find that venue and catering together take around half of the budget. Treat that as a guide, not a rule." },
      { t: "ul", items: [
        "Venue: usually the largest cost, and it often decides the date and the number of guests",
        "Catering and drinks: priced per guest, so your guest list drives it directly",
        "Decor and flowers: easy to let grow, so decide your key moments first",
        "Photography and video: worth protecting, because you keep the results",
        "Attire and beauty: include fittings, alterations and any outfit changes",
        "Music and entertainment: from a playlist to a full band",
        "Stationery, transport, favours and gifts: small items that add up",
      ] },
      { t: "img", src: "/blog/couple-planning-payments.webp", alt: "A couple on a sofa going through papers and a laptop together, planning their payments", width: 800, height: 800, caption: "Going through quotes and invoices together keeps surprises small." },
      { t: "h2", text: "Step 4: Build in a buffer" },
      { t: "p", text: "Set aside a contingency of about ten percent of your total for the things nobody can predict. It is the most useful line in the whole budget, and if you do not need it, you have a lovely surplus for the honeymoon." },
      { t: "h3", text: "Last-minute changes" },
      { t: "p", text: "Guest numbers change, dietary needs appear late, vendors ask for an extra hour, and someone remembers a cake knife. Small additions in the final weeks are normal, and they add up. Your buffer is what keeps them from becoming a stressful conversation." },
      { t: "h3", text: "Weather" },
      { t: "p", text: "If any part of your day is outdoors, plan for rain and for heat. A marquee or an indoor backup space, umbrellas, shade, fans or heaters all cost money, and hiring them in a hurry costs more than booking them in advance. Ask your venue what its wet-weather plan is, and what that plan costs." },
      { t: "h3", text: "Delays" },
      { t: "p", text: "Outfits, printed items and imported decor can arrive late, and a late delivery sometimes means paying for express shipping or a replacement. Order early, build in extra time, and keep a small amount aside for fixes. Vendors can also run over time, so check what overtime costs before you sign." },
      { t: "h2", text: "Step 5: Get every quote in writing, and map out the payments" },
      { t: "p", text: "Most vendors take a deposit to hold your date and a final payment shortly before the wedding. Put every due date in one place, with the amount, so you can see your cash flow across the months. Missing a payment can put a booking at risk, and it is one of the most common avoidable mistakes." },
      { t: "ul", items: [
        "Ask what is included and what is extra before you sign",
        "Note each deposit, balance and due date",
        "Check cancellation and rescheduling terms",
        "Ask about service charges and taxes, which are sometimes added later",
      ] },
      { t: "h2", text: "Step 6: Track it as you go" },
      { t: "p", text: "A budget only works if you keep it up to date. Log every quote and payment against a category, mark what is paid and what is pending, and check your remaining total regularly. Spending split by category shows you early when one area is running over, so you can adjust something else while there is still time." },
      { t: "tip", text: "If you are holding more than one event, give each its own allocation. A ceremony, a cocktail hour and a reception each have separate costs, and seeing them separately avoids one big number hiding a problem." },
      { t: "h2", text: "A simple checklist" },
      { t: "ol", items: [
        "Agree a total and who contributes",
        "Pick your top three priorities",
        "Split the budget by category, with venue and catering first",
        "Add a ten percent buffer for weather, delays and last-minute changes",
        "List every vendor payment with its due date",
        "Set reminders so no payment is missed",
        "Review your totals every week or two",
      ] },
      { t: "p", text: "WEDthread's budget planner lets you set a total, log every cost by category and by event, see charts of where the money is going, and get an email reminder before a payment is due. It is free to start." },
    ],
  },

  {
    slug: "unique-wedding-ideas",
    metaTitle: "Unique Wedding Ideas for 2026 and 2027 | WEDthread",
    metaDescription: "Fresh, personal wedding ideas for 2026 and 2027: live painting, a LEGO build table, a photo booth, a quiz night and more ways to make your day yours.",
    title: "A unique wedding? New ideas for your 2026 or 2027 celebration",
    excerpt: "Live painting, LEGO building, a photo booth, a quiz night and other ways to make your wedding feel like yours.",
    category: "Ideas",
    image: "/blog/unique-wedding-ideas.jpg",
    imageAlt: "Orange marigold garlands and green leaves hanging from soft white drapes at a wedding venue",
    published: "2026-10-14",
    related: ["wedding-planning-priorities", "wedding-budget-planning"],
    body: [
      { t: "p", text: "The best weddings are not the ones that follow a formula. They are the ones where guests leave saying that it was so completely the two of you. If you are planning for 2026 or 2027 and want to do something a little different, here are ideas that give guests something to do, something to remember and something to talk about." },
      { t: "p", text: "None of these needs a huge budget. Pick one or two that suit your personalities and your guest list, and do them well." },
      { t: "h2", text: "Live wedding painting" },
      { t: "p", text: "A live painter sets up an easel at your ceremony or reception and paints the scene as it happens. By the end of the night you have a one-of-a-kind artwork that captures the day, and guests love watching it come to life. Many couples display the finished painting at the party and hang it at home afterwards." },
      { t: "ul", items: [
        "Book early: good painters have limited dates",
        "Choose between your ceremony, the first dance or the whole reception",
        "Check the size, the canvas and when you will receive it",
        "Give them a spot with good light and a clear view",
      ] },
      { t: "h2", text: "A LEGO building table" },
      { t: "p", text: "Set out a table of bricks and invite guests to build something for you: a tiny model of the venue, a message, a wedding cake, or a creation of their choice. It suits relaxed weddings, family weddings and anyone who loves to play, and it keeps children, and adults who forget they are not children, happily busy." },
      { t: "ul", items: [
        "Offer a prompt such as build us something for our first home",
        "Keep a few finished pieces to display as the evening goes on",
        "Choose a corner away from the dance floor so people can chat while they build",
      ] },
      { t: "h2", text: "A photo booth" },
      { t: "p", text: "A photo booth gives guests a reason to relax and be silly, and it gives you a stack of images you would never get from a formal photographer. Choose a classic strip booth, a 360-degree platform or a simple backdrop with props and a camera. Ask for a digital gallery so every guest can find their own pictures afterwards." },
      { t: "ul", items: [
        "Decide whether you want printed strips for a guest book",
        "Pick a backdrop that matches your colours",
        "Place it near the bar or the dance floor, where people gather",
      ] },
      { t: "img", src: "/blog/ceremony-fans-favours.webp", alt: "A cane chair at a wedding ceremony with a guest's name on a paper fan tied with a green ribbon", width: 800, height: 987, caption: "Small personal touches, like named paper fans, make a ceremony feel considered." },
      { t: "h2", text: "A quiz night" },
      { t: "p", text: "A welcome dinner or an evening before the wedding is a perfect place for a quiz about the two of you. Guests work in teams, learn funny stories about how you met, and meet people from the other side of the family while they argue over answers. It breaks the ice faster than any speech." },
      { t: "ul", items: [
        "Mix rounds: how well do you know the couple, childhood photos, music, and a family round",
        "Mix the teams across both families and friendship groups",
        "Keep it to under an hour, and finish with a prize and a toast",
      ] },
      { t: "h2", text: "More ideas to borrow" },
      { t: "ul", items: [
        "Personal touches on the seats, like named fans, handwritten notes or a small favour at every place",
        "A late-night food stall with snacks from your favourite places",
        "A silent disco so everyone can pick their own soundtrack",
        "A guest postcard table, where everyone writes a message to open on your first anniversary",
        "A signature drink for each of you, with a story on the menu",
        "A welcome table with maps, a schedule and tips for guests who are travelling",
      ] },
      { t: "h2", text: "How to fit new ideas into your plan" },
      { t: "p", text: "Every extra element needs a time, a place and a person responsible for it. Add each idea to your schedule, decide which event it belongs to, and note who is booking or setting it up. A cocktail hour is perfect for a photo booth or live painting, a welcome dinner for a quiz, and the late evening for a silent disco." },
      { t: "p", text: "Check your budget before you commit. Entertainment can be added gradually, but it is easier to say yes to a live painter when you know the money is already set aside. Choose the elements that tell your story, and let the rest go." },
      { t: "h2", text: "Share the plan with your guests" },
      { t: "p", text: "Guests enjoy extras more when they know what to expect. Put the schedule for every event on your wedding website, say what to wear, and mention the activities so people come ready to join in. WEDthread lets you list each event with its time, venue and dress code, and collect RSVPs for each one in the same place." },
    ],
  },
];

export const postBySlug = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);

export const postWordCount = (p: BlogPost) =>
  p.body.reduce((n, b) => n + (b.t === "ul" || b.t === "ol" ? b.items.join(" ").split(/\s+/).length : b.t === "img" ? 0 : b.text.split(/\s+/).length), 0);

export const readingMinutes = (p: BlogPost) => Math.max(1, Math.round(postWordCount(p) / 200));

export const formatPostDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
