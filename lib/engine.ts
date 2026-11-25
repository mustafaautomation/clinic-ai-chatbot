import { randomUUID } from "crypto";
import {
  CAMPUSES,
  buildSlots,
  checkInsurance,
  extractMedication,
  extractPharmacy,
  extractPlanQuery,
  findProviders,
  getProvider,
  inferVisitType,
  isSelfPay,
  languageLabel,
  matchLanguage,
  matchProviderName,
  matchSpecialty,
  parsePersonName,
  specialtyLabel,
  visitLabel,
} from "@/lib/directory";
import { answerFromGuide, abstainCopy } from "@/lib/rag";
import { excessPhiMention, findPhone, last4, redact, redactDeep } from "@/lib/redact";
import {
  detectEmergency,
  emergencyCopy,
  frustrationCopy,
  humanHandoffCopy,
  injectionAttempt,
  injectionCopy,
  isFrustrated,
  isGreeting,
  isMedicalAdvice,
  isOffTopic,
  isSensitive,
  offTopicCopy,
  refusalCopy,
  sensitiveCopy,
  wantsHuman,
  type EmergencyKind,
} from "@/lib/safety";
import { conversationSummary } from "@/lib/summary";
import type { HandoffCategory } from "@/lib/types";
import { ClinicStore } from "@/lib/store";
import { mentionedWeekday, parseTime } from "@/lib/time";
import type {
  ChatMessage,
  Citation,
  Expecting,
  Session,
  Slot,
  ToolName,
  ToolTrace,
  TurnResult,
} from "@/lib/types";

export type TurnOptions = {
  now?: Date;
};

const AFFIRM = /^(yes|yeah|yep|sure|ok|okay|please|show me|that works|sounds good)\b/i;

function trace(
  name: ToolName,
  args: Record<string, unknown>,
  result: unknown,
  ok = true,
): ToolTrace {
  return {
    name,
    args: redactDeep(args) as Record<string, unknown>,
    result: redactDeep(result),
    ok,
  };
}

function remember(
  store: ClinicStore,
  session: Session,
  message: Omit<ChatMessage, "id" | "createdAt">,
): ChatMessage {
  const saved: ChatMessage = {
    ...message,
    text: redact(message.text),
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.addMessage(session, saved);
  return saved;
}

function finish(
  store: ClinicStore,
  session: Session,
  draft: Omit<TurnResult, "sessionId" | "messageId"> & { expecting?: Expecting },
): TurnResult {
  if (draft.expecting !== undefined) session.expecting = draft.expecting;
  const saved = remember(store, session, {
    role: "assistant",
    text: draft.text,
    citations: draft.citations,
    tools: draft.tools,
    suggestions: draft.suggestions,
    emergency: draft.emergency,
    refusal: draft.refusal,
  });
  store.commit();
  return {
    sessionId: session.id,
    messageId: saved.id,
    text: saved.text,
    citations: draft.citations,
    tools: draft.tools,
    suggestions: draft.suggestions,
    emergency: draft.emergency,
    refusal: draft.refusal,
    handoff: draft.handoff,
  };
}

function cite(slug: string, query: string): { text: string; citations: Citation[] } | null {
  const grounded = answerFromGuide(`${slug} ${query}`);
  if (!grounded) return null;
  const own = grounded.citations.filter((item) => item.slug === slug);
  if (!own.length) return null;
  return { text: own[0].excerpt, citations: [own[0]] };
}

function operational(text: string, session: Session): boolean {
  return (
    /\b(book|appointment|opening|available|reschedul|cancel|refill|insurance|accept|callback|call me|front desk|family medicine|pediatric|provider|doctor|slot)\b/i.test(
      text,
    ) ||
    Boolean(matchSpecialty(text) || matchProviderName(text) || extractPlanQuery(text)) ||
    session.expecting === "slot" ||
    session.expecting === "contact" ||
    session.expecting === "slots" ||
    session.expecting === "refill" ||
    session.expecting === "callback"
  );
}

function matchOffered(message: string, slots: Slot[]): Slot | undefined {
  if (/\b(earliest|soonest|first one|first opening|first available)\b/i.test(message) && slots[0]) {
    return slots[0];
  }
  const weekday = mentionedWeekday(message);
  const time = parseTime(message);
  const exact = slots.find((slot) => message.toLowerCase().includes(slot.label.toLowerCase()));
  if (exact) return exact;
  let best: { slot: Slot; score: number } | undefined;
  for (const slot of slots) {
    let score = 0;
    const when = new Date(slot.start);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(when);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    if (weekday != null && map[get("weekday")] === weekday) score += 2;
    let hour = Number(get("hour"));
    if (hour === 24) hour = 0;
    const minute = Number(get("minute"));
    if (time && time.hour === hour && time.minute === minute) score += 3;
    if (score > (best?.score ?? 0)) best = { slot, score };
  }
  return best && best.score >= 3 ? best.slot : undefined;
}

function phiNote(text: string): string | null {
  if (!excessPhiMention(text)) return null;
  return "I don't need a Social Security number, date of birth, or member ID in this chat, so please don't send those. A name and a callback number are enough when a request needs them.";
}

function providerSentence(id: string): string {
  const provider = getProvider(id);
  if (!provider) return "I couldn't find that clinician.";
  const campus = CAMPUSES[provider.campus];
  const languages = provider.languages.map(languageLabel).join(" and ");
  return `${provider.shortName}, ${provider.credentials}, sees ${provider.specialtyLabel.toLowerCase()} at the ${campus.label} and speaks ${languages}.`;
}

export function handleTurn(
  store: ClinicStore,
  sessionId: string,
  rawMessage: string,
  options: TurnOptions = {},
): TurnResult {
  const now = options.now ?? new Date();
  const session = store.getSession(sessionId);
  if (!session) {
    throw new Error("Unknown session");
  }
  const message = rawMessage.trim();
  remember(store, session, { role: "user", text: message });

  if (!message) {
    return finish(store, session, {
      text: "Type a question about the clinic, a plan name, or the visit you want to book.",
      citations: [],
      tools: [],
      suggestions: ["Do you accept Blue Cross?", "What are your hours?"],
      emergency: false,
      refusal: false,
      handoff: false,
    });
  }

  if (injectionAttempt(message)) {
    store.addAudit({
      actor: "guide",
      action: "prompt_injection_blocked",
      resource: "session",
      detail: "Blocked an instruction to ignore clinic rules or reveal records.",
      sessionId: session.id,
    });
    return finish(store, session, {
      text: injectionCopy(),
      citations: [],
      tools: [],
      suggestions: ["What are your hours?", "Which plans are in network?"],
      emergency: false,
      refusal: true,
      handoff: false,
    });
  }

  const emergency = detectEmergency(message);
  if (emergency) return handoff(store, session, emergency);
  if (isSensitive(message)) return staffHandoff(store, session, "sensitive");
  if (wantsHuman(message)) return staffHandoff(store, session, "human_request");
  if (isFrustrated(message)) return staffHandoff(store, session, "frustration");
  if (isOffTopic(message)) {
    return finish(store, session, {
      text: offTopicCopy(),
      citations: [],
      tools: [],
      suggestions: ["What are your hours?", "Do you accept Blue Cross?"],
      emergency: false,
      refusal: true,
      handoff: false,
    });
  }
  if (isGreeting(message)) {
    return finish(store, session, {
      text: "Hello. I can check a plan, find a clinician, book a visit, or quote the patient guide. What do you need?",
      citations: [],
      tools: [],
      suggestions: ["Do you accept Blue Cross?", "What are your hours?", "I want to talk to a human"],
      emergency: false,
      refusal: false,
      handoff: false,
    });
  }

  const advice = isMedicalAdvice(message);
  const doing = operational(message, session);
  if (advice && !doing) {
    store.addAudit({
      actor: "guide",
      action: "medical_advice_refused",
      resource: "session",
      detail: "Refused a request for diagnosis, interpretation, or dosing.",
      sessionId: session.id,
    });
    return finish(store, session, {
      text: refusalCopy(),
      citations: [],
      tools: [],
      suggestions: ["Book a family medicine visit", "Ask the front desk to call me"],
      emergency: false,
      refusal: true,
      handoff: false,
      expecting: null,
    });
  }

  const sections: string[] = [];
  const citations: Citation[] = [];
  const tools: ToolTrace[] = [];
  const boundary = advice
    ? "I can't assess symptoms or recommend treatment. I can still help with scheduling and clinic questions."
    : null;
  if (boundary) sections.push(boundary);
  const privacy = phiNote(message);
  if (privacy) sections.push(privacy);

  if (/new patient/i.test(message)) session.isNewPatient = true;
  const specialty = matchSpecialty(message);
  if (specialty) session.specialty = specialty;
  const language = matchLanguage(message);
  if (language) session.language = language;
  const named = matchProviderName(message);
  if (named) {
    session.providerId = named.id;
    session.specialty = named.specialty;
  }
  const visit = inferVisitType(message, session.isNewPatient);
  if (visit) session.visitType = visit;

  const wantsCancel = /\bcancel\b/i.test(message);
  const wantsReschedule = /reschedul/i.test(message);
  const wantsRefill =
    /\b(refill|prescription)\b/i.test(message) &&
    !/\b(how do|how does|policy|what is the|what's the)\b/i.test(message);
  const refillInfo =
    /\b(refill|prescription)\b/i.test(message) &&
    /\b(how do|how does|policy|what is the|what's the)\b/i.test(message);
  const wantsCallback =
    session.expecting === "callback" ||
    /\b(call me|callback|have (the |someone )?call|speak to (a |the )?(person|someone|the desk|front desk)|front desk)\b/i.test(
      message,
    );
  const wantsInsurance =
    isSelfPay(message) ||
    Boolean(extractPlanQuery(message)) ||
    (/\b(insurance|in network|out of network)\b/i.test(message) && !refillInfo);
  const wantsProvider =
    !wantsCancel &&
    !wantsReschedule &&
    (Boolean(specialty || language || named) ||
      /\b(who speaks|which doctor|which clinician|find a)\b/i.test(message) ||
      session.expecting === "specialty" ||
      session.expecting === "provider");
  const wantsSlots =
    /\b(opening|openings|available|availability|slot|this week|next week)\b/i.test(message) ||
    (session.expecting === "slots" && AFFIRM.test(message));
  const choosingSlot =
    session.expecting === "slot" ||
    Boolean(session.offeredSlots.length && matchOffered(message, session.offeredSlots));
  const wantsBook =
    choosingSlot ||
    session.expecting === "contact" ||
    /\b(book|hold that|i'll take|schedule me|make (me )?an appointment)\b/i.test(message);

  if (wantsCancel) {
    return cancelFlow(store, session, message, sections, citations, tools, boundary !== null);
  }
  if (wantsReschedule) {
    return rescheduleFlow(store, session, message, now, sections, citations, tools);
  }
  if (wantsRefill || session.expecting === "refill") {
    return refillFlow(store, session, message, sections, citations, tools);
  }
  if (
    session.pendingConfirmation &&
    session.expecting === "slot" &&
    !wantsCancel &&
    !wantsInsurance &&
    !wantsRefill
  ) {
    return rescheduleFlow(store, session, message, now, sections, citations, tools);
  }

  if (wantsInsurance) {
    insuranceFlow(store, session, message, sections, citations, tools);
  }

  if (wantsProvider && (specialty || language || named || session.expecting === "specialty" || session.expecting === "provider" || /\b(who speaks|which doctor|which clinician|find a)\b/i.test(message))) {
    providerFlow(store, session, message, sections, tools);
  }

  const contactMode = session.expecting === "contact" || Boolean(session.pendingSlotId && findPhone(message));
  if (wantsSlots || (wantsBook && !contactMode && !matchOffered(message, session.offeredSlots) && !session.pendingSlotId)) {
    slotsFlow(store, session, message, now, sections, tools);
  }

  if (wantsBook || contactMode) {
    const booked = bookFlow(store, session, message, sections, tools);
    if (booked) {
      const prep = cite("new-patients", "arrive early photo ID");
      if (prep) {
        sections.push(prep.text);
        citations.push(...prep.citations);
      }
      return finish(store, session, {
        text: sections.join("\n\n"),
        citations,
        tools,
        suggestions: ["What should I bring to my first visit?", "What are your hours?"],
        emergency: false,
        refusal: false,
        handoff: false,
        expecting: null,
      });
    }
  }

  if (wantsCallback && !wantsBook) {
    return callbackFlow(store, session, message, sections, citations, tools);
  }

  const infoOnly =
    sections.length === (boundary ? 1 : 0) + (privacy ? 1 : 0) ||
    /\b(what|when|where|how|which|hours|policy|prepare|prep|telehealth|vaccine|lab|privacy|billing|cost|fee)\b/i.test(
      message,
    );
  if (infoOnly && !session.expecting) {
    const grounded = answerFromGuide(message);
    if (grounded) {
      sections.push(grounded.text);
      for (const item of grounded.citations) {
        if (!citations.some((existing) => existing.id === item.id)) citations.push(item);
      }
    }
  }

  if (!sections.length && tools.length === 0 && citations.length === 0) {
    return staffHandoff(
      store,
      session,
      "low_confidence",
      `${abstainCopy()} I flagged a staff handoff so a person can follow up.`,
    );
  }

  if (!sections.length) sections.push(abstainCopy());

  const suggestions = suggest(session);
  return finish(store, session, {
    text: sections.join("\n\n"),
    citations,
    tools,
    suggestions,
    emergency: false,
    refusal: Boolean(boundary),
    handoff: false,
    expecting: session.expecting,
  });
}

function staffHandoff(
  store: ClinicStore,
  session: Session,
  category: HandoffCategory,
  text?: string,
): TurnResult {
  const summary = conversationSummary(session);
  const copy =
    text ??
    (category === "sensitive"
      ? sensitiveCopy()
      : category === "frustration"
        ? frustrationCopy()
        : humanHandoffCopy());
  store.addHandoff({
    sessionId: session.id,
    category,
    note:
      category === "low_confidence"
        ? "Retrieval confidence was too low to answer from the patient guide."
        : "A person needs to pick up this conversation.",
    summary,
  });
  store.addAudit({
    actor: "guide",
    action: "staff_handoff",
    resource: category,
    detail: `Flagged a ${category} handoff. Summary stored on the ticket.`,
    sessionId: session.id,
  });
  return finish(store, session, {
    text: copy,
    citations: [],
    tools: [trace("flag_staff_handoff", { category }, { status: "flagged" })],
    suggestions: [],
    emergency: false,
    refusal: category === "sensitive",
    handoff: true,
    expecting: null,
  });
}

function handoff(store: ClinicStore, session: Session, kind: EmergencyKind): TurnResult {
  const category = kind === "crisis" ? "emergency_crisis" : "emergency_medical";
  store.addHandoff({
    sessionId: session.id,
    category,
    note:
      kind === "crisis"
        ? "Crisis keywords. Transcript was not copied into this handoff."
        : "Possible emergency keywords. Transcript was not copied into this handoff.",
    summary:
      kind === "crisis"
        ? "Suicidal-crisis keywords. The message was not copied."
        : "Possible emergency keywords. The message was not copied.",
  });
  const tool = trace(
    "flag_staff_handoff",
    { category },
    { status: "flagged", waits_for_clinic: false },
  );
  store.addAudit({
    actor: "guide",
    action: "emergency_handoff",
    resource: category,
    detail: "Flagged a staff handoff and returned 911 guidance. Message body was not copied.",
    sessionId: session.id,
  });
  return finish(store, session, {
    text: emergencyCopy(kind),
    citations: [],
    tools: [tool],
    suggestions: [],
    emergency: true,
    refusal: false,
    handoff: true,
    expecting: null,
  });
}

function insuranceFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  citations: Citation[],
  tools: ToolTrace[],
) {
  if (isSelfPay(message)) {
    session.insuranceNetwork = "self_pay";
    session.insurancePlan = "Self-pay";
    const result = {
      plan_query: "self-pay",
      matched_plan: null,
      network: "self_pay",
      note: "Self-pay visits are welcome. The desk quotes the fee before you come in.",
    };
    tools.push(trace("check_insurance", { plan_name: "self-pay" }, result));
    store.addAudit({
      actor: "guide",
      action: "insurance_check",
      resource: "self-pay",
      detail: "Checked self-pay. No member ID collected.",
      sessionId: session.id,
    });
    sections.push(
      "Self-pay visits are welcome. Synthetic demo fees are $180 for a new-patient office visit, $120 for a follow-up, and $90 for a video visit. The desk confirms the fee before you arrive.",
    );
    const billing = cite("billing", "self-pay fee");
    if (billing) citations.push(...billing.citations);
    if (!session.specialty) session.expecting = "specialty";
    return;
  }

  const query = extractPlanQuery(message);
  if (!query) {
    const grounded = answerFromGuide("which insurance plans are in network");
    if (grounded) {
      sections.push(grounded.text);
      citations.push(...grounded.citations);
    }
    sections.push("Which plan should I check? A plan name is enough — not the member ID.");
    return;
  }

  const result = checkInsurance(query);
  session.insurancePlan = result.matched_plan ?? query;
  session.insuranceNetwork = result.network;
  tools.push(trace("check_insurance", { plan_name: query }, result));
  store.addAudit({
    actor: "guide",
    action: "insurance_check",
    resource: result.matched_plan ?? "unknown-plan",
    detail: `Network status ${result.network}. Member ID was not collected.`,
    sessionId: session.id,
  });
  sections.push(result.note);
  const card = cite("insurance", "insurance card member ID");
  if (card && result.network === "in") {
    sections.push(card.text);
    citations.push(...card.citations);
  }
  if (!session.providerId && !session.specialty) session.expecting = "specialty";
}

function providerFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  tools: ToolTrace[],
) {
  const specialty = session.specialty;
  const language = session.language;
  if (!specialty && !language && !session.providerId) {
    session.expecting = "specialty";
    sections.push(
      "Which kind of visit are you looking for: family medicine, pediatrics, internal medicine, women's health, behavioral health, or cardiology?",
    );
    return;
  }
  if (session.providerId && matchProviderName(message)) {
    tools.push(
      trace(
        "find_provider",
        { specialty: session.specialty, language: session.language },
        { providers: [publicProvider(session.providerId)] },
      ),
    );
    store.addAudit({
      actor: "guide",
      action: "directory_read",
      resource: session.providerId,
      detail: "Read one clinician from the directory.",
      sessionId: session.id,
    });
    sections.push(providerSentence(session.providerId));
    session.expecting = "slots";
    if (!/\b(opening|openings|available|availability)\b/i.test(message)) {
      sections.push(`I can check ${visitLabel(session.visitType ?? "new_patient")} openings.`);
    }
    return;
  }

  const found = findProviders(specialty, language);
  tools.push(
    trace(
      "find_provider",
      { specialty, language },
      {
        relaxed: found.relaxed,
        providers: found.matches.map((provider) => publicProvider(provider.id)),
      },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "directory_read",
    resource: specialty ?? "any",
    detail: `Directory search returned ${found.matches.length} clinicians.`,
    sessionId: session.id,
  });
  if (!found.matches.length) {
    sections.push("I don't have a clinician for that specialty in the directory.");
    session.expecting = "specialty";
    return;
  }
  if (found.relaxed && language) {
    sections.push(
      `Nobody in ${specialty ? specialtyLabel(specialty).toLowerCase() : "that search"} speaks ${languageLabel(language)}. These clinicians do see that specialty:`,
    );
  }
  if (found.matches.length === 1) {
    session.providerId = found.matches[0].id;
    session.specialty = found.matches[0].specialty;
    sections.push(providerSentence(found.matches[0].id));
    session.expecting = "slots";
    sections.push(`Want me to check ${visitLabel(session.visitType ?? "new_patient")} openings?`);
    return;
  }
  session.providerId = null;
  session.expecting = "provider";
  sections.push(
    found.matches
      .map((provider) => providerSentence(provider.id))
      .join(" "),
  );
  sections.push("Which clinician should I check?");
}

function publicProvider(id: string) {
  const provider = getProvider(id)!;
  return {
    id: provider.id,
    name: `${provider.shortName}, ${provider.credentials}`,
    specialty: provider.specialtyLabel,
    languages: provider.languages,
    campus: CAMPUSES[provider.campus].label,
  };
}

function slotsFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  now: Date,
  sections: string[],
  tools: ToolTrace[],
) {
  const provider = session.providerId ? getProvider(session.providerId) : undefined;
  if (!provider) {
    session.expecting = session.specialty ? "provider" : "specialty";
    sections.push("Tell me the specialty or the clinician, and I'll look up openings.");
    return;
  }
  const visitType = session.visitType ?? (session.isNewPatient ? "new_patient" : "follow_up");
  session.visitType = visitType;
  if (!provider.visitTypes.includes(visitType)) {
    sections.push(
      `${provider.shortName} does not offer a ${visitLabel(visitType)}. I can look at ${provider.visitTypes.map(visitLabel).join(", ")} instead.`,
    );
    return;
  }
  const weekday = mentionedWeekday(message);
  const slots = buildSlots({
    provider,
    visitType,
    now,
    taken: store.takenSlotIds(),
    weekday,
    limit: 5,
  });
  session.offeredSlots = slots;
  tools.push(
    trace(
      "get_available_slots",
      {
        provider: provider.shortName,
        visit_type: visitType,
        date_range: weekday == null ? "next 14 days" : "requested weekday",
      },
      { slots: slots.map((slot) => ({ id: slot.id, label: slot.label })) },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "schedule_read",
    resource: provider.id,
    detail: `Read ${slots.length} open ${visitType} slots.`,
    sessionId: session.id,
  });
  if (!slots.length) {
    sections.push(
      `I don't see an open ${visitLabel(visitType)} with ${provider.shortName} in that window. Another weekday or another clinician may have room.`,
    );
    session.expecting = "provider";
    return;
  }
  session.expecting = "slot";
  sections.push(
    `Here are the next ${visitLabel(visitType)} openings with ${provider.shortName}: ${slots.map((slot) => slot.label).join("; ")}. Tell me which one to hold. I'll only ask for a name and a callback number.`,
  );
}

function bookFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  tools: ToolTrace[],
): boolean {
  const picked =
    matchOffered(message, session.offeredSlots) ??
    session.offeredSlots.find((slot) => slot.id === session.pendingSlotId);
  if (!picked && session.offeredSlots.length) {
    session.expecting = "slot";
    sections.push("Which of those openings should I hold?");
    return false;
  }
  if (!picked) {
    session.expecting = "slots";
    if (!sections.some((section) => section.includes("openings"))) {
      sections.push("I can hold a time after I show you the openings.");
    }
    return false;
  }
  if (store.takenSlotIds().has(picked.id)) {
    sections.push("That time was just taken. Ask me to show openings again.");
    session.pendingSlotId = null;
    session.expecting = "slots";
    return false;
  }
  const phone = findPhone(message);
  const name = parsePersonName(message);
  if (!name || !phone) {
    session.pendingSlotId = picked.id;
    session.expecting = "contact";
    const missing = !name && !phone ? "a name and a callback number" : !name ? "the name" : "a callback number";
    sections.push(
      `I can hold ${picked.label}. I still need ${missing}. I won't ask for a date of birth or a member ID.`,
    );
    return false;
  }
  const provider = getProvider(picked.providerId);
  if (!provider) return false;
  const appointment = store.book({
    providerId: provider.id,
    visitType: picked.visitType,
    slotId: picked.id,
    start: picked.start,
    label: picked.label,
    patientName: name,
    phone,
    isNewPatient: session.isNewPatient || picked.visitType === "new_patient",
    insurancePlan: session.insurancePlan,
  });
  session.lastConfirmation = appointment.confirmationCode;
  session.pendingSlotId = null;
  session.offeredSlots = [];
  session.expecting = null;
  tools.push(
    trace(
      "book_appointment",
      {
        provider: provider.shortName,
        visit_type: picked.visitType,
        slot: picked.label,
        patient_name: name,
        phone,
      },
      {
        confirmation_code: appointment.confirmationCode,
        status: "booked",
        approved_clinically: false,
      },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "appointment_write",
    resource: appointment.confirmationCode,
    detail: `Booked ${provider.shortName} at ${picked.label}. Phone stored on the appointment only.`,
    sessionId: session.id,
  });
  const campus = CAMPUSES[provider.campus];
  sections.push(
    `You're booked. Confirmation ${appointment.confirmationCode} for ${name} with ${provider.shortName}, ${visitLabel(picked.visitType)}, ${picked.label}, at the ${campus.label} (${campus.address}). The desk has a callback number ending in ${last4(phone)}. This holds a time. It does not diagnose anything or guarantee benefits.`,
  );
  return true;
}

function cancelFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  citations: Citation[],
  tools: ToolTrace[],
  refusedAdvice: boolean,
): TurnResult {
  const code = message.match(/\bCG-\d{4}\b/i)?.[0];
  if (!code) {
    sections.push("What is the confirmation code? It looks like CG-1002.");
    return finish(store, session, {
      text: sections.join("\n\n"),
      citations,
      tools,
      suggestions: [],
      emergency: false,
      refusal: refusedAdvice,
      handoff: false,
      expecting: null,
    });
  }
  const appointment = store.findAppointment(code);
  if (!appointment || appointment.status !== "booked") {
    sections.push(`I can't find an active visit for ${code.toUpperCase()}.`);
  } else {
    appointment.status = "cancelled";
    tools.push(
      trace(
        "cancel_appointment",
        { confirmation_code: appointment.confirmationCode },
        { status: "cancelled" },
      ),
    );
    store.addAudit({
      actor: "guide",
      action: "appointment_cancel",
      resource: appointment.confirmationCode,
      detail: "Cancelled a synthetic appointment.",
      sessionId: session.id,
    });
    sections.push(
      `${appointment.confirmationCode} is cancelled. The time is open for someone else. I didn't need a reason.`,
    );
  }
  return finish(store, session, {
    text: sections.join("\n\n"),
    citations,
    tools,
    suggestions: ["Show openings again"],
    emergency: false,
    refusal: refusedAdvice,
    handoff: false,
    expecting: null,
  });
}

function rescheduleFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  now: Date,
  sections: string[],
  citations: Citation[],
  tools: ToolTrace[],
): TurnResult {
  const code =
    message.match(/\bCG-\d{4}\b/i)?.[0] ??
    session.pendingConfirmation ??
    session.lastConfirmation ??
    undefined;
  const appointment = code ? store.findAppointment(code) : undefined;
  if (!appointment || appointment.status !== "booked") {
    sections.push("I need the confirmation code of the visit you want to move, like CG-1002.");
    return finish(store, session, {
      text: sections.join("\n\n"),
      citations,
      tools,
      suggestions: [],
      emergency: false,
      refusal: false,
      handoff: false,
    });
  }
  const provider = getProvider(appointment.providerId)!;
  const slots = buildSlots({
    provider,
    visitType: appointment.visitType,
    now,
    taken: store.takenSlotIds(),
    weekday: mentionedWeekday(message),
    limit: 5,
  }).filter((slot) => slot.id !== appointment.slotId);
  const picked = matchOffered(message, slots);
  if (!picked) {
    session.offeredSlots = slots;
    session.providerId = provider.id;
    session.visitType = appointment.visitType;
    session.expecting = "slot";
    session.lastConfirmation = appointment.confirmationCode;
    session.pendingConfirmation = appointment.confirmationCode;
    tools.push(
      trace(
        "get_available_slots",
        { provider: provider.shortName, visit_type: appointment.visitType, date_range: "reschedule" },
        { slots: slots.map((slot) => ({ id: slot.id, label: slot.label })) },
      ),
    );
    sections.push(
      slots.length
        ? `I can move ${appointment.confirmationCode}. Open times with ${provider.shortName}: ${slots.map((slot) => slot.label).join("; ")}.`
        : `I don't see another ${visitLabel(appointment.visitType)} with ${provider.shortName} in the next two weeks.`,
    );
    return finish(store, session, {
      text: sections.join("\n\n"),
      citations,
      tools,
      suggestions: slots.slice(0, 3).map((slot) => slot.label),
      emergency: false,
      refusal: false,
      handoff: false,
      expecting: "slot",
    });
  }
  const previous = appointment.label;
  appointment.slotId = picked.id;
  appointment.start = picked.start;
  appointment.label = picked.label;
  tools.push(
    trace(
      "reschedule_appointment",
      { confirmation_code: appointment.confirmationCode, slot: picked.label },
      { status: "booked", label: picked.label },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "appointment_reschedule",
    resource: appointment.confirmationCode,
    detail: `Moved ${previous} to ${picked.label}.`,
    sessionId: session.id,
  });
  sections.push(
    `${appointment.confirmationCode} is now ${picked.label} with ${provider.shortName}. The earlier time was released.`,
  );
  session.expecting = null;
  session.offeredSlots = [];
  session.pendingConfirmation = null;
  return finish(store, session, {
    text: sections.join("\n\n"),
    citations,
    tools,
    suggestions: [],
    emergency: false,
    refusal: false,
    handoff: false,
    expecting: null,
  });
}

function refillFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  citations: Citation[],
  tools: ToolTrace[],
): TurnResult {
  const extracted = extractMedication(message);
  if (extracted) {
    session.pendingMedication = extracted.name;
    session.controlledSubstance = extracted.controlled;
  }
  const pharmacy = extractPharmacy(message);
  if (pharmacy) session.pendingPharmacy = pharmacy;
  const phone = findPhone(message);
  const name = parsePersonName(message);
  const policy = cite("refills", "refill ticket never approved");
  if (!session.pendingMedication || !name || !phone) {
    session.expecting = "refill";
    const missing = [
      !session.pendingMedication ? "the medication name" : null,
      !name ? "a name" : null,
      !phone ? "a callback number" : null,
    ].filter(Boolean);
    sections.push(
      `I can open a refill ticket for the care team. I still need ${missing.join(" and ")}. The ticket is not an approval, and nothing is sent to a pharmacy from this chat.`,
    );
    if (policy) citations.push(...policy.citations);
    return finish(store, session, {
      text: sections.join("\n\n"),
      citations,
      tools,
      suggestions: [],
      emergency: false,
      refusal: false,
      handoff: false,
      expecting: "refill",
    });
  }
  const ticket = store.addTicket({
    patientName: name,
    phone,
    medication: session.pendingMedication,
    pharmacy: session.pendingPharmacy,
    controlled: session.controlledSubstance,
  });
  tools.push(
    trace(
      "request_refill",
      {
        medication: session.pendingMedication,
        pharmacy: session.pendingPharmacy,
        patient_name: name,
        phone,
      },
      {
        ticket: ticket.ticketNumber,
        status: ticket.status,
        approved: false,
        sent_to_pharmacy: false,
        controlled: ticket.controlled,
      },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "refill_ticket_create",
    resource: ticket.ticketNumber,
    detail: `Opened a refill ticket. Approved=false. Controlled=${ticket.controlled}.`,
    sessionId: session.id,
  });
  sections.push(
    ticket.controlled
      ? `Ticket ${ticket.ticketNumber} is pending clinician review for a controlled medication. Chat did not approve it and did not send it to a pharmacy. The care team may require an in-person visit.`
      : `Ticket ${ticket.ticketNumber} is pending clinician review. This does not approve the refill. Allow two business days. Nothing was sent to a pharmacy.`,
  );
  if (policy) {
    sections.push(policy.text);
    citations.push(...policy.citations);
  }
  session.pendingMedication = null;
  session.expecting = null;
  return finish(store, session, {
    text: sections.join("\n\n"),
    citations,
    tools,
    suggestions: [],
    emergency: false,
    refusal: false,
    handoff: false,
    expecting: null,
  });
}

function callbackFlow(
  store: ClinicStore,
  session: Session,
  message: string,
  sections: string[],
  citations: Citation[],
  tools: ToolTrace[],
): TurnResult {
  const phone = findPhone(message);
  const name = parsePersonName(message);
  if (!name || !phone) {
    session.expecting = "callback";
    sections.push(
      "I can ask the front desk to call. I need a name and a callback number, and a short topic if you have one. No clinical details are required.",
    );
    return finish(store, session, {
      text: sections.join("\n\n"),
      citations,
      tools,
      suggestions: [],
      emergency: false,
      refusal: false,
      handoff: false,
      expecting: "callback",
    });
  }
  const topic = redact(message).slice(0, 160);
  const callback = store.addCallback({
    patientName: name,
    phone,
    topic,
  });
  tools.push(
    trace(
      "create_callback_request",
      { patient_name: name, phone, topic },
      { ticket: callback.ticketNumber, status: "open" },
    ),
  );
  store.addAudit({
    actor: "guide",
    action: "callback_create",
    resource: callback.ticketNumber,
    detail: "Created a front-desk callback. Phone stored on the ticket only.",
    sessionId: session.id,
  });
  sections.push(
    `Callback ${callback.ticketNumber} is with the front desk. They have a number ending in ${last4(phone)}. This is not an emergency line.`,
  );
  session.expecting = null;
  return finish(store, session, {
    text: sections.join("\n\n"),
    citations,
    tools,
    suggestions: [],
    emergency: false,
    refusal: false,
    handoff: false,
    expecting: null,
  });
}

function suggest(session: Session): string[] {
  if (session.expecting === "specialty") {
    return ["Family medicine", "Pediatrics", "Internal medicine", "Women's health"];
  }
  if (session.expecting === "provider") {
    const found = findProviders(session.specialty, session.language);
    return found.matches.slice(0, 3).map((provider) => provider.shortName);
  }
  if (session.expecting === "slots") {
    const provider = session.providerId ? getProvider(session.providerId) : undefined;
    return provider ? [`Show openings for ${provider.shortName}`] : ["Show openings"];
  }
  if (session.expecting === "slot") {
    return session.offeredSlots.slice(0, 3).map((slot) => slot.label);
  }
  return [];
}

export function startSession(
  store: ClinicStore,
  consent: boolean,
  meta?: { channel?: Session["channel"]; externalKey?: string | null },
): Session {
  const session = store.createSession(consent, meta);
  store.addAudit({
    actor: "patient",
    action: "session_start",
    resource: session.id,
    detail: consent ? "Consent recorded for a demo transcript." : "Session without consent.",
    sessionId: session.id,
  });
  store.commit();
  return session;
}
