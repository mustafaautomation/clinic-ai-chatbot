export type Article = {
  slug: string;
  title: string;
  kicker: string;
  paragraphs: string[];
};

export const ARTICLES: Article[] = [
  {
    slug: "providers",
    title: "Clinicians and specialties",
    kicker: "Who you can book",
    paragraphs: [
      "Cedar Grove Family Clinic schedules visits with clinicians in family medicine, pediatrics, internal medicine, women's health, behavioral health, and visiting cardiology.",
      "Dr. Elena Alvarez, MD, practices family medicine at the Grove campus and speaks English and Spanish.",
      "Dr. James Whitaker, DO, practices family medicine at the River campus and speaks English.",
      "Dr. Priya Shah, MD, practices pediatrics at the Grove campus and speaks English, Hindi, and Gujarati.",
      "Dr. Marcus Hale, MD, practices internal medicine at the River campus and speaks English.",
      "NP Amina Diallo practices women's health at the Grove campus and speaks English and French.",
      "Dr. Sofia Nguyen, MD, sees behavioral health visits at the Grove campus and by video, and speaks English and Vietnamese. Chat is not counseling.",
      "Dr. Omar Haddad, MD, sees cardiology visits on Wednesdays at the River campus and speaks English and Arabic.",
      "The guide can search this directory by specialty and language. It cannot tell you which clinician is medically right for your symptoms.",
    ],
  },
  {
    slug: "hours-locations",
    title: "Hours and locations",
    kicker: "Two campuses",
    paragraphs: [
      "Clinic hours are Monday through Friday, 8:00 a.m. to 5:00 p.m. at both campuses.",
      "The Grove campus at 418 Cedar Lane, Cedar City is also open Saturday, 8:00 a.m. to noon, for scheduled visits only. The River campus at 22 Willow Street, Cedar City is closed Saturday and Sunday.",
      "The Grove desk phone is (555) 010-0140. The River desk phone is (555) 010-0141. Both numbers are the public clinic lines, not a personal line.",
      "The clinic is closed on Sundays. A holiday closure is posted at the desk and does not appear as an open slot in the scheduler.",
      "If you may be having an emergency, including chest pain, trouble breathing, or stroke signs, call 911. Do not wait for clinic hours.",
    ],
  },
  {
    slug: "insurance",
    title: "Insurance accepted",
    kicker: "In network and out of network",
    paragraphs: [
      "In-network plans at Cedar Grove are Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Medicare, Cedar State Medicaid, Humana, and Tricare.",
      "Kaiser Permanente, Oscar Health, and Ambetter are out of network. Self-pay visits are welcome when a plan is out of network or you do not have insurance.",
      "Bring the insurance card to the visit. The guide does not need a member ID in chat, and a plan name is not a benefit quote.",
      "The front desk verifies benefits before the visit. Copay amounts depend on your specific plan and are not calculated here.",
    ],
  },
  {
    slug: "new-patients",
    title: "New patient process",
    kicker: "Getting established",
    paragraphs: [
      "New patients book a new-patient visit, then arrive about 20 minutes early with a photo ID and the insurance card.",
      "The guide asks only for a name and a callback number to hold the visit. It does not ask for a Social Security number, date of birth, or member ID in chat.",
      "Forms are completed at the clinic or on the tablet in the lobby. You do not upload medical records into this chat.",
      "A new-patient visit is a scheduling category. It is not a diagnosis and it does not start a prescription.",
    ],
  },
  {
    slug: "visit-prep",
    title: "Visit prep",
    kicker: "What to bring",
    paragraphs: [
      "Bring a photo ID, your insurance card, and a medication list with the name and strength of each medicine you take.",
      "Fast only if the desk or a clinician told you to fast for that specific visit. The guide will not tell you to fast.",
      "Wear clothing that is easy to move in for an annual visit. Arrive at the campus named on your confirmation.",
      "Write down questions for the clinician. This chat cannot answer those clinical questions for them.",
    ],
  },
  {
    slug: "telehealth",
    title: "Telehealth",
    kicker: "Video visits",
    paragraphs: [
      "Video visits are available with clinicians who offer telehealth, including Dr. Alvarez, Dr. Hale, NP Diallo, and Dr. Nguyen. The clinic texts a video link the morning of the visit. You need a quiet room, a camera, and a stable connection.",
      "Video visits are for scheduled problems the clinician has already agreed to see remotely. They are not for emergencies, and they are not started from a symptom description in chat.",
      "If the video link does not arrive by 30 minutes before the visit, call the campus desk.",
    ],
  },
  {
    slug: "billing",
    title: "Billing FAQ",
    kicker: "Payments",
    paragraphs: [
      "A copay is collected at check-in when your plan requires one. The guide cannot see your copay.",
      "Synthetic self-pay fees for this demo are $180 for a new-patient office visit, $120 for a follow-up, and $90 for a video visit. The desk confirms the fee before you arrive.",
      "The clinic can set up a payment plan for a statement balance. Ask the billing desk or request a callback.",
      "Statements are mailed or sent through the patient portal. Do not send a credit card number in this chat.",
    ],
  },
  {
    slug: "refills",
    title: "Prescription refill policy",
    kicker: "Staff review only",
    paragraphs: [
      "Refill requests made here become a staff ticket and are never approved in chat. A clinician reviews the chart before any pharmacy is contacted.",
      "Allow two business days for a routine refill review. The ticket status stays pending until a person on the care team opens it.",
      "Controlled medications are not refilled through chat. The ticket only tells the team that you asked, and they may require an in-person visit.",
      "Have the medication name, a callback number, and the pharmacy ready. Do not send a photo of a bottle in this demo.",
    ],
  },
  {
    slug: "vaccines",
    title: "Vaccines",
    kicker: "What the clinic stocks",
    paragraphs: [
      "The clinic offers flu, COVID-19, Tdap, and shingles vaccines for adults who the care team confirms are due, plus routine pediatric vaccines during well visits. A vaccine clinic runs Thursday afternoons at the Grove campus.",
      "The guide can book a vaccine visit. It cannot tell you which vaccine you should receive or when a dose is due.",
      "Bring your vaccine record if you have one. The clinician confirms what is appropriate at the visit.",
    ],
  },
  {
    slug: "lab-results",
    title: "Lab results policy",
    kicker: "Not in chat",
    paragraphs: [
      "Lab results are not available in this chat. Results are released in the patient portal after a clinician reviews them.",
      "Most routine results are posted within three business days. Some send-out tests take longer.",
      "The guide cannot interpret an A1C, a blood count, or any other result, and it cannot see portal messages.",
      "If you are waiting on a result, the front desk can call you. A callback request does not release the result.",
    ],
  },
  {
    slug: "privacy",
    title: "Privacy notice",
    kicker: "Demo boundaries",
    paragraphs: [
      "Cedar Grove Family Clinic in this project is fictional. Every patient, plan example, and appointment is synthetic. Do not type real health information.",
      "The guide stores a redacted transcript and, when you book or request a refill, a name and callback number. Logs mask phone numbers, emails, Social Security numbers, dates of birth, and member IDs.",
      "Chat transcripts in this design are kept for 30 days and are not the medical record. A retention pass deletes older transcripts. Appointments stay on the synthetic schedule until the desk cancels them.",
      "A real deployment would need a business associate agreement, encryption at rest, role-based access, and a covered-entity privacy notice. This portfolio demo does not provide those.",
      "Staff access to a callback number is written to an audit log. You can read that log from the staff desk.",
    ],
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
