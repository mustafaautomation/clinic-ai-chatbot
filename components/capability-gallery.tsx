"use client";

import { ConfirmCard, PlanCard, ProviderCarousel, SafetyCard, SlotPicker, TicketTimeline } from "@/components/chat-cards";

const plan = {
  kind: "plan" as const,
  plan: "Blue Cross Blue Shield",
  network: "In network",
  note: "The front desk still verifies benefits.",
};

const providers = {
  kind: "providers" as const,
  providers: [
    {
      id: "alvarez",
      name: "Dr. Alvarez, MD",
      specialty: "Family medicine",
      languages: ["English", "Spanish"],
      campus: "Grove campus",
    },
    {
      id: "shah",
      name: "Dr. Shah, MD",
      specialty: "Pediatrics",
      languages: ["English", "Hindi"],
      campus: "Grove campus",
    },
  ],
};

const slots = {
  kind: "slots" as const,
  provider: "Dr. Alvarez",
  visit: "new patient",
  slots: [
    { id: "a", label: "Thu, Nov 27, 10:00 a.m." },
    { id: "b", label: "Thu, Nov 27, 1:30 p.m." },
    { id: "c", label: "Fri, Nov 28, 8:30 a.m." },
  ],
};

export function CapabilityGallery() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PlanCard card={plan} onBook={() => undefined} />
      <ProviderCarousel card={providers} onOpenings={() => undefined} />
      <SlotPicker card={slots} locked onBook={() => undefined} />
      <ConfirmCard
        card={{
          kind: "confirm",
          title: "You're booked",
          code: "CG-1048",
          when: "Thu, Nov 27, 10:00 a.m.",
          where: "Grove campus, 418 Cedar Lane",
          who: "Dr. Alvarez",
        }}
      />
      <TicketTimeline card={{ kind: "timeline", ticket: "RF-12", status: "Needs review", title: "Refill ticket", controlled: false }} />
      <SafetyCard card={{ kind: "safety", crisis: true }} />
    </div>
  );
}
