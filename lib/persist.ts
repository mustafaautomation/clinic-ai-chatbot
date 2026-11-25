import fs from "fs";
import path from "path";
import { buildSlots, getProvider } from "@/lib/directory";
import { ClinicStore } from "@/lib/store";

const FILE = path.join(process.cwd(), "data", "runtime-store.json");

function seed(store: ClinicStore, now = new Date()) {
  const provider = getProvider("alvarez")!;
  const slots = buildSlots({
    provider,
    visitType: "follow_up",
    now,
    taken: new Set(),
    limit: 1,
  });
  const slot = slots[0];
  if (slot) {
    store.book({
      providerId: provider.id,
      visitType: "follow_up",
      slotId: slot.id,
      start: slot.start,
      label: slot.label,
      patientName: "Rowan Ellis",
      phone: "555-0199",
      isNewPatient: false,
      insurancePlan: "Aetna",
    });
  }
  store.addTicket({
    patientName: "Rowan Ellis",
    phone: "555-0199",
    medication: "lisinopril",
    pharmacy: "Cedar City Pharmacy",
    controlled: false,
  });
  store.addCallback({
    patientName: "Mina Cho",
    phone: "555-0177",
    topic: "Question about a synthetic statement balance.",
  });
  store.addHandoff({
    sessionId: "seed-drill",
    category: "emergency_medical",
    note: "Synthetic drill. No real patient. Category only.",
    summary: "Synthetic drill. The message body was not stored.",
  });
  store.addAudit({
    actor: "system",
    action: "seed_demo",
    resource: "synthetic",
    detail: "Loaded fictional desk records for the portfolio demo.",
  });
}

export function resetDemoStore(): ClinicStore {
  const store = getStore();
  store.resetRecords();
  seed(store);
  store.commit();
  return store;
}

export function getStore(): ClinicStore {
  const globalStore = globalThis as typeof globalThis & { __cgStore?: ClinicStore };
  if (!globalStore.__cgStore) {
    const store = new ClinicStore();
    if (fs.existsSync(FILE)) {
      store.load(JSON.parse(fs.readFileSync(FILE, "utf8")));
    } else {
      seed(store);
    }
    store.onChange = () => {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const data = store.dump();
      for (const session of data.sessions) {
        session.pendingConfirmation ??= null;
      }
      fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
    };
    store.commit();
    globalStore.__cgStore = store;
  }
  return globalStore.__cgStore;
}
