export type EmergencyKind = "crisis" | "medical";

const POLICY =
  /\b(policy|chatbot|assistant|how does (the|your)|what is your|what's your|what are the signs)\b/i;

const PERSONAL =
  /\b(i'm|i am|i have|i feel|i want|i think|i've been|having|can't breathe|cannot breathe|my chest|my face|my arm|my speech|he is|she is|they are|he's|she's|dad|mom|husband|wife|my child|someone is)\b/i;

const CRISIS =
  /\b(suicid|kill myself|killing myself|want to die|end my life|better off dead|self-harm|hurt myself|take my (own )?life)\b/i;

const MEDICAL =
  /chest pain|chest pressure|heart attack|can't breathe|cannot breathe|trouble breathing|shortness of breath|\bstroke\b|face is droop|facial droop|droop(?:ing)? face|slurred|arm weakness|one side of (?:my|his|her|their) body|unconscious|anaphyla|throat (?:is )?clos|severe bleeding/i;

export function detectEmergency(text: string): EmergencyKind | null {
  const crisis = CRISIS.test(text);
  const medical = MEDICAL.test(text);
  if (!crisis && !medical) return null;
  if (POLICY.test(text) && !PERSONAL.test(text) && !crisis) return null;
  if (crisis) return "crisis";
  return "medical";
}

export function emergencyCopy(kind: EmergencyKind): string {
  if (kind === "crisis") {
    return "If you may act on thoughts of suicide, or you are in immediate danger, call 911 now. In the United States you can also call or text 988, the Suicide & Crisis Lifeline, any time. Cedar Grove's chat cannot counsel you, assess risk, or tell you what to do next. I flagged a staff handoff so a person knows this chat stopped. Do not wait for the clinic if you are in danger.";
  }
  return "This sounds like it could be an emergency. Call 911 now if you are in the United States. Symptoms such as chest pain, trouble breathing, a drooping face, arm weakness, or trouble speaking need emergency services, not a clinic chat. I can't assess symptoms, give first-aid steps, or tell you whether it is safe to drive. I flagged a staff handoff so the desk knows the chat stopped. Do not wait for a callback.";
}

const DOSE =
  /\b(dose|dosage|milligram|\dmg\b|how much (ibuprofen|tylenol|acetaminophen|advil|motrin|aspirin|amoxicillin)|how many (ibuprofen|tylenol|pills))\b/i;
const TAKE =
  /\b(should i take|can i take|is it safe to (take|give)|what should i give|prescribe)\b/i;
const DIAGNOSE =
  /\b(diagnos|what(?:'s| is) wrong with me|do i have (a |an )?(strep|cancer|the flu|flu|covid|an infection|infection|diabetes|adhd|pneumonia|depression|anxiety)|is this (cancer|strep|contagious|an infection|serious)|interpret (my|these) (labs?|results|a1c)|my a1c|what does (this|my) (rash|pain|result|symptom))\b/i;

export function isMedicalAdvice(text: string): boolean {
  if (/\bdo you (take|accept)\b/i.test(text) && !TAKE.test(text)) {
    return DIAGNOSE.test(text) || DOSE.test(text);
  }
  return DOSE.test(text) || TAKE.test(text) || DIAGNOSE.test(text);
}

export function refusalCopy(): string {
  return "I can't diagnose conditions, interpret symptoms or lab results, or recommend medications or doses. A Cedar Grove clinician can evaluate this during a visit. If you may be having an emergency, call 911. If you are in a suicide crisis, call or text 988. I can help you book a visit, check a plan name, or ask the front desk to call you.";
}

export function injectionAttempt(text: string): boolean {
  return /\b(ignore (all |any |your )?(previous|prior|above) instructions|reveal (the |your )?system prompt|you are now|show (me )?all patients|dump (the )?(database|records)|print every (patient|appointment)|jailbreak)\b/i.test(
    text,
  );
}

export function injectionCopy(): string {
  return "I can't follow instructions to ignore clinic rules, reveal hidden prompts, or list patient records. I can help with Cedar Grove hours, insurance, scheduling, refill tickets, and the policies in the patient guide.";
}
