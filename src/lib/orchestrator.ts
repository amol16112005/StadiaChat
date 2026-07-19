import {
  addIncident,
  addMessage,
  getOpsLead,
  getStadiumProtocols,
  getUserById,
  updateIncident,
} from "./db";
import { newId } from "./id";
import type {
  AuthSession,
  ChatMessage,
  Incident,
  MessageAttachment,
  MessageCategory,
} from "./types";
import { isInStadiumFacilityQuery } from "./stadium-scope";
import { formatMemoryForAi } from "./memory";
import { matchProtocol, protocolBody } from "./protocol-match";
import {
  OUT_OF_SCOPE_TEMPLATE,
  classifyMessage,
  generateRemediationOptions,
  generateSafetyDirective,
  summarizeTask,
  translateText,
  complete,
} from "./xai";

const TIMER_DURATION_S = 300;

async function localized(
  text: string,
  targetLang: string,
  sourceLang = "en"
): Promise<string> {
  if (targetLang === sourceLang) return text;
  return translateText(text, targetLang, sourceLang);
}

export interface OrchestratorResult {
  category: MessageCategory;
  volunteerMessages: ChatMessage[];
  opsMessages: ChatMessage[];
  incident?: Incident;
}

export async function processVolunteerMessage(
  session: AuthSession,
  text: string,
  attachments?: MessageAttachment[]
): Promise<OrchestratorResult> {
  const stadiumId = session.stadium_id;
  const protocols = await getStadiumProtocols(stadiumId);
  const faqTitles = protocols
    .filter((p) => p.category === "faq")
    .map((p) => p.title);

  const hasPhoto = Boolean(attachments?.length);
  const body =
    text.trim() ||
    (hasPhoto
      ? "[Photo report] Volunteer attached image evidence — review attachment."
      : "");

  // Long-term memory layer (Mongo) — recent stadium/user events for context
  const memoryBlock = await formatMemoryForAi({
    stadium_id: stadiumId,
    user_id: session.user_id,
    limit: 12,
  });

  // Photo-only floor evidence defaults toward incident path if not clearly FAQ/emergency
  const classifyInput = [
    hasPhoto
      ? `${body}\n[Has photo attachment — may be floor condition / incident evidence]`
      : body,
    memoryBlock ? `\n${memoryBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const category = await classifyMessage(classifyInput, faqTitles);
  const now = new Date().toISOString();

  const inbound: ChatMessage = {
    id: newId("msg"),
    stadium_id: stadiumId,
    sender_id: session.user_id,
    sender_name: session.name,
    sender_role: "Volunteer",
    recipient_id: "broadcast_ops",
    text: body,
    language: session.preferred_language,
    category,
    ui_component: "text",
    attachments: attachments?.length ? attachments : undefined,
    created_at: now,
  };
  await addMessage(inbound);

  if (category === "B") {
    const reply: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: session.user_id,
      text: OUT_OF_SCOPE_TEMPLATE,
      language: "en",
      category: "B",
      ui_component: "text",
      created_at: new Date().toISOString(),
    };
    await addMessage(reply);
    return {
      category,
      volunteerMessages: [inbound, reply],
      opsMessages: [],
    };
  }

  if (category === "A") {
    const matched = matchProtocol(body, protocols, "faq");
    let answer: string;
    if (matched) {
      answer = protocolBody(matched, session.preferred_language);
    } else if (isInStadiumFacilityQuery(body)) {
      // In-stadium amenity with no exact SOP — still answer, don't fail closed
      const llm = await complete(
        `You are StadiaChat for FIFA World Cup 2026 stadium ops.
The volunteer/fan asked about an IN-STADIUM facility (food, concessions, merch, amenities, wayfinding).
Give a concise operational answer for this stadium. Never refuse as tourism. Never answer only about restrooms unless asked.
Language: ${session.preferred_language}. Preserve gate/section IDs.`,
        `Stadium: ${stadiumId}\nProtocols available: ${protocols.map((p) => p.title).join("; ")}\nQuery: ${body}`,
        { temperature: 0.25 }
      );
      answer =
        llm ||
        (await localized(
          "In-stadium facilities (food, shops, water, Guest Services) are on the main concourses—follow overhead signs from your section. For the nearest stall or desk, use Guest Services or ask a steward to point the route.",
          session.preferred_language
        ));
    } else {
      answer = await localized(
        hasPhoto
          ? "Photo received. No matching FAQ protocol — if this is a floor issue, rephrase as an incident (cleanup, hazard, inventory) so Ops Lead is alerted."
          : "No matching pre-set protocol found in this stadium document library. Rephrase with gate/section, or report as an incident if operational support is required.",
        session.preferred_language
      );
    }
    const reply: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: session.user_id,
      text: answer,
      language: session.preferred_language,
      category: "A",
      ui_component: "text",
      created_at: new Date().toISOString(),
    };
    await addMessage(reply);
    return {
      category,
      volunteerMessages: [inbound, reply],
      opsMessages: [],
    };
  }

  if (category === "C") {
    const options = await generateRemediationOptions(body, "normal");
    const incident: Incident = {
      id: newId("inc"),
      stadium_id: stadiumId,
      reporter_id: session.user_id,
      reporter_name: session.name,
      text: body,
      severity: "normal",
      status: "open",
      category: "C",
      remediation_options: options,
      created_at: now,
    };
    await addIncident(incident);

    const opsLead = await getOpsLead(stadiumId);
    const opsLang = opsLead?.preferred_language || "en";
    const alertText = await localized(
      `[INCIDENT${hasPhoto ? " + PHOTO" : ""}] ${session.name}: ${body}`,
      opsLang,
      session.preferred_language
    );

    const alert: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: "broadcast_ops",
      text: alertText,
      original_text: body,
      language: opsLang,
      category: "C",
      ui_component: "alert_card",
      remediation_options: options,
      incident_id: incident.id,
      attachments: attachments?.length ? attachments : undefined,
      created_at: new Date().toISOString(),
    };
    await addMessage(alert);

    const ack = await localized(
      hasPhoto
        ? "Photo and incident logged for your Stadium Operations Lead with remediation options."
        : "Incident logged and routed to your Stadium Operations Lead with remediation options.",
      session.preferred_language
    );
    const reply: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: session.user_id,
      text: ack,
      language: session.preferred_language,
      category: "C",
      ui_component: "text",
      incident_id: incident.id,
      created_at: new Date().toISOString(),
    };
    await addMessage(reply);

    return {
      category,
      volunteerMessages: [inbound, reply],
      opsMessages: [alert],
      incident,
    };
  }

  // Category D — Serious
  const emergency = matchProtocol(body, protocols, "emergency");
  if (emergency) {
    const steps = protocolBody(emergency, session.preferred_language);
    const reply: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: session.user_id,
      text: steps,
      language: session.preferred_language,
      category: "D",
      ui_component: "text",
      created_at: new Date().toISOString(),
    };
    await addMessage(reply);

    // Inform ops for awareness but do not block volunteer
    const opsNote: ChatMessage = {
      id: newId("msg"),
      stadium_id: stadiumId,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: "broadcast_ops",
      text: `[PROTOCOL AUTO-DEPLOYED] ${emergency.title} — reported by ${session.name}: ${body}`,
      language: "en",
      category: "D",
      ui_component: "text",
      attachments: attachments?.length ? attachments : undefined,
      created_at: new Date().toISOString(),
    };
    await addMessage(opsNote);

    return {
      category,
      volunteerMessages: [inbound, reply],
      opsMessages: [opsNote],
    };
  }

  // No protocol — escalate with 300s timer
  const options = await generateRemediationOptions(body, "serious");
  const deadline = new Date(Date.now() + TIMER_DURATION_S * 1000).toISOString();
  const incident: Incident = {
    id: newId("inc"),
    stadium_id: stadiumId,
    reporter_id: session.user_id,
    reporter_name: session.name,
    text: body,
    severity: "serious",
    status: "open",
    category: "D",
    remediation_options: options,
    timer_deadline: deadline,
    timer_duration: TIMER_DURATION_S,
    created_at: now,
  };
  await addIncident(incident);

  const opsLead = await getOpsLead(stadiumId);
  const opsLang = opsLead?.preferred_language || "en";
  const seriousText = await localized(
    `[SERIOUS - UNRESOLVED INCIDENT${hasPhoto ? " + PHOTO" : ""}] ${session.name}: ${body}`,
    opsLang,
    session.preferred_language
  );

  const seriousAlert: ChatMessage = {
    id: newId("msg"),
    stadium_id: stadiumId,
    sender_id: "system",
    sender_name: "StadiaChat Core",
    sender_role: "System",
    recipient_id: "broadcast_ops",
    text: seriousText,
    original_text: body,
    language: opsLang,
    category: "D",
    ui_component: "serious_alert",
    remediation_options: options,
    incident_id: incident.id,
    audio_alert: true,
    attachments: attachments?.length ? attachments : undefined,
    created_at: new Date().toISOString(),
  };
  await addMessage(seriousAlert);

  const volAck = await localized(
    "SERIOUS INCIDENT escalated to your Stadium Operations Lead. A reply will arrive shortly (within a few minutes) — either from your Operations Lead with instructions, or an automated GenAI safety directive that assesses the situation if Ops has not responded in time. Follow on-scene safety measures until then.",
    session.preferred_language
  );
  const reply: ChatMessage = {
    id: newId("msg"),
    stadium_id: stadiumId,
    sender_id: "system",
    sender_name: "StadiaChat Core",
    sender_role: "System",
    recipient_id: session.user_id,
    text: volAck,
    language: session.preferred_language,
    category: "D",
    ui_component: "text",
    incident_id: incident.id,
    created_at: new Date().toISOString(),
  };
  await addMessage(reply);

  return {
    category,
    volunteerMessages: [inbound, reply],
    opsMessages: [seriousAlert],
    incident,
  };
}

export async function processLeadTaskAssignment(
  session: AuthSession,
  volunteerId: string,
  command: string,
  options?: {
    location_tag?: string;
    location_detail?: string;
    priority?: import("./types").OpsPlanPriority;
    plan_id?: string;
  }
): Promise<ChatMessage> {
  if (session.user_role !== "Operations_Lead") {
    throw new Error("Only Operations Lead can assign tasks");
  }
  if (session.stadium_id !== (await getUserById(volunteerId))?.stadium_id) {
    throw new Error("Cross-stadium assignment forbidden");
  }

  const volunteer = await getUserById(volunteerId);
  if (!volunteer || volunteer.status !== "approved") {
    throw new Error("Volunteer not found or not approved");
  }

  const summarized = await summarizeTask(command);
  const location_tag =
    (options?.location_tag && options.location_tag !== "Custom"
      ? options.location_tag
      : options?.location_detail?.trim()) ||
    summarized.location_tag ||
    "General";
  const location_detail =
    options?.location_detail?.trim() ||
    (options?.location_tag === "Custom" ? options.location_detail : undefined);

  const task_title = summarized.task_title;
  const targetLang = volunteer.preferred_language;
  const title =
    targetLang === session.preferred_language
      ? task_title
      : await translateText(task_title, targetLang, session.preferred_language);

  const placeLine = location_detail
    ? `${location_tag} — ${location_detail}`
    : location_tag;

  const card: ChatMessage = {
    id: newId("msg"),
    stadium_id: session.stadium_id,
    sender_id: session.user_id,
    sender_name: session.name,
    sender_role: "Operations_Lead",
    recipient_id: volunteerId,
    text: title,
    original_text: command,
    language: targetLang,
    ui_component: "actionable_task_card",
    task_title: title,
    location_tag: placeLine,
    location_detail,
    priority: options?.priority || "medium",
    plan_id: options?.plan_id,
    accept_action: true,
    created_at: new Date().toISOString(),
  };
  await addMessage(card);
  return card;
}

export async function resolveIncidentByLead(
  session: AuthSession,
  incidentId: string,
  option?: string,
  customInstruction?: string
): Promise<{ incident: Incident; volunteerMessage: ChatMessage }> {
  if (session.user_role !== "Operations_Lead") {
    throw new Error("Only Operations Lead can resolve incidents");
  }

  const { getDb } = await import("./db");
  const db = await getDb();
  const incident = db.incidents.find((i) => i.id === incidentId);
  if (!incident || incident.stadium_id !== session.stadium_id) {
    throw new Error("Incident not found in this stadium tenancy");
  }
  if (incident.status !== "open") {
    throw new Error("Incident already closed");
  }

  const instruction =
    customInstruction?.trim() ||
    option?.trim() ||
    "Proceed per Operations Lead direction.";

  const reporter = await getUserById(incident.reporter_id);
  const targetLang = reporter?.preferred_language || "en";
  const body = await translateText(
    `Ops Lead instruction: ${instruction}`,
    targetLang,
    session.preferred_language
  );

  const updated = await updateIncident(incidentId, {
    status: "resolved",
    selected_option: option,
    custom_instruction: customInstruction,
    resolved_at: new Date().toISOString(),
  });

  const volunteerMessage: ChatMessage = {
    id: newId("msg"),
    stadium_id: session.stadium_id,
    sender_id: session.user_id,
    sender_name: session.name,
    sender_role: "Operations_Lead",
    recipient_id: incident.reporter_id,
    text: body,
    original_text: instruction,
    language: targetLang,
    ui_component: "text",
    incident_id: incidentId,
    created_at: new Date().toISOString(),
  };
  await addMessage(volunteerMessage);

  return { incident: updated!, volunteerMessage };
}

/** Safety override when 300s elapses without Lead action */
export async function processExpiredSeriousTimers(
  stadiumId?: string
): Promise<ChatMessage[]> {
  const { getDb } = await import("./db");
  const db = await getDb();
  const now = Date.now();
  const deployed: ChatMessage[] = [];

  const open = db.incidents.filter(
    (i) =>
      i.severity === "serious" &&
      i.status === "open" &&
      i.timer_deadline &&
      (!stadiumId || i.stadium_id === stadiumId) &&
      new Date(i.timer_deadline).getTime() <= now
  );

  for (const incident of open) {
    const directive = await generateSafetyDirective(incident.text);
    const reporter = await getUserById(incident.reporter_id);
    const targetLang = reporter?.preferred_language || "en";
    const body = await translateText(directive, targetLang, "en");

    await updateIncident(incident.id, {
      status: "safety_override",
      safety_directive: directive,
      resolved_at: new Date().toISOString(),
    });

    const msg: ChatMessage = {
      id: newId("msg"),
      stadium_id: incident.stadium_id,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: incident.reporter_id,
      text: body,
      original_text: directive,
      language: targetLang,
      category: "D",
      ui_component: "text",
      incident_id: incident.id,
      created_at: new Date().toISOString(),
    };
    await addMessage(msg);
    deployed.push(msg);

    const opsNotify: ChatMessage = {
      id: newId("msg"),
      stadium_id: incident.stadium_id,
      sender_id: "system",
      sender_name: "StadiaChat Core",
      sender_role: "System",
      recipient_id: "broadcast_ops",
      text: `[SAFETY OVERRIDE] 300s elapsed — directive auto-deployed for incident ${incident.id}`,
      language: "en",
      category: "D",
      ui_component: "text",
      incident_id: incident.id,
      created_at: new Date().toISOString(),
    };
    await addMessage(opsNotify);
  }

  return deployed;
}
