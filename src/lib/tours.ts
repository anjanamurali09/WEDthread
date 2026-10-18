// The guided tours. A tour is a list of steps; each step highlights one thing on the page (everything else goes dark)
// and says what it is for. A step with no `target` is a plain card in the middle of the screen.
//
// A target is either a CSS selector (such as [data-tour="nav-events"]) or "text:Add event", which finds the first
// button or link whose label starts with that text. Steps whose target is not on the page are left out, so a tour
// never points at nothing.
export type TourStep = { target?: string; title: string; body: string };
export type Tour = { id: string; steps: TourStep[] };

const SEEN_PREFIX = "wedthread.tour.";
export const hasSeenTour = (id: string) => { try { return localStorage.getItem(SEEN_PREFIX + id) === "1"; } catch { return true; } };
export const markTourSeen = (id: string) => { try { localStorage.setItem(SEEN_PREFIX + id, "1"); } catch { /* ignore */ } };

const nav = (to: string) => `[data-tour="nav-${to.replace(/\//g, "-")}"]`;

// The first thing a couple sees: where to go, in the order most couples do it.
export const WELCOME_TOUR: Tour = {
  id: "welcome",
  steps: [
    { title: "Welcome to WEDthread", body: "A quick tour of where to start, in the order most couples go. You can skip it any time, and replay it later from the Tour button." },
    { target: nav("/events"), title: "1. Add your events", body: "Start with every celebration, such as the ceremony, the reception and the welcome drinks. Guests, seating and menus all hang off these." },
    { target: nav("/guests"), title: "2. Build your guest list", body: "Add guests one by one or import a spreadsheet, and choose which events each of them is invited to." },
    { target: nav("/rsvp-questions"), title: "3. Set up your RSVP", body: "Choose what you ask guests, then share one link. Their answers come back here by themselves." },
    { target: nav("/seating"), title: "4. Plan the seating", body: "Lay out your tables and drag guests onto seats." },
    { target: nav("/budget"), title: "5. Keep an eye on the budget", body: "Set a total, log what you spend and get reminders before payments are due." },
    { target: nav("/website"), title: "6. Make your wedding website", body: "Pick a template, add your story and share one link. Nothing here is final, so you can change it any time." },
    { target: '[data-tour="discover"]', title: "Find venues and vendors", body: "Browse real venues and vendors, take the quiz and send an enquiry straight from the page." },
    { target: '[data-tour="nav-settings"]', title: "Invite your partner", body: "In Settings you can invite your partner or a planner to plan with you. Everything is shared as you both edit." },
  ],
};

// One short tour per page, shown the first time that page is opened.
export const PAGE_TOURS: Record<string, Tour> = {
  "/events": { id: "events", steps: [
    { target: "text:Add event", title: "Add an event", body: "Each event is its own mini plan, with its own guests, seating, menu and vendors." },
    { target: '[data-tour="page-body"]', title: "Your events", body: "Drag the cards to reorder them. The photo and the agenda beside them fill in as you go." },
    { target: "text:Track Progress", title: "Track progress", body: "Tick off what is done for each event so you can see at a glance what is left." },
  ] },
  "/guests": { id: "guests", steps: [
    { target: "text:Add guest", title: "Add a guest", body: "Add each person with the events they are invited to. Phone and email let you message them later." },
    { target: "text:Import", title: "Import a list", body: "Already have a spreadsheet? Import it in one go." },
    { target: '[data-tour="page-body"]', title: "Your guest list", body: "RSVP answers, dietary needs and tags show up here as guests reply." },
  ] },
  "/rsvp-questions": { id: "rsvp", steps: [
    { target: '[data-tour="page-body"]', title: "Ask what you need to know", body: "Attendance is always asked. Add questions about meals, songs or travel below it." },
    { target: "text:Preview", title: "See what guests see", body: "Preview the RSVP page exactly as your guests will." },
    { target: "text:Share", title: "Share the link", body: "Send guests their personal RSVP link by WhatsApp or email." },
    { target: "text:Track responses", title: "Track responses", body: "Answers appear here as they come in." },
  ] },
  "/seating": { id: "seating", steps: [
    { target: "text:Round", title: "Add tables", body: "Add round, rectangle or square tables, then drag them where you want them. Bars, stages and dance floors are next to them." },
    { target: "text:Floor", title: "Floor colour", body: "Change the colour of the floor to match your venue." },
    { target: '[data-tour="page-body"]', title: "Seat your guests", body: "Drag guests from the list onto a seat. Drag a seated guest to move them." },
  ] },
  "/budget": { id: "budget", steps: [
    { target: '[data-tour="page-body"]', title: "Your budget", body: "Set a total, then log each cost against a category and an event. Totals update straight away." },
  ] },
  "/menu": { id: "menu", steps: [
    { target: '[data-tour="page-body"]', title: "Plan each event's menu", body: "Add sections like starters and mains, then the dishes with their dietary tags. The preview shows how the menu will read." },
  ] },
  "/registry": { id: "registry", steps: [
    { target: '[data-tour="page-body"]', title: "Build your registry", body: "Paste a link to any gift and the photo, name and price fill in. Add cash funds for a honeymoon or a home too." },
  ] },
  "/messages": { id: "messages", steps: [
    { target: '[data-tour="page-body"]', title: "Message your guests", body: "Write a message once, then send it by email or WhatsApp to the guests you choose." },
  ] },
  "/website": { id: "website", steps: [
    { target: '[data-tour="page-body"]', title: "Start with a template", body: "Pick a template and start editing, and it fills in with your names, events and photos. Nothing is final, so you can change the template or anything on it later." },
    { target: "text:Publish", title: "Publish when you're ready", body: "Your site stays private until you publish it. You can also change its link." },
  ] },
  "/notes": { id: "notes", steps: [
    { target: '[data-tour="page-body"]', title: "Notes", body: "A place for lists and ideas. Use bullets, numbers and checklists, and it saves as you type." },
  ] },
  "/settings/profile": { id: "settings", steps: [
    { target: '[data-tour="page-body"]', title: "Settings", body: "Change your wedding details, invite your partner or a planner, and manage your account here." },
  ] },
};
