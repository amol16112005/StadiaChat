/** Standard places of assistance for Ops planning & task assignment */

export const ASSISTANCE_LOCATIONS: {
  id: string;
  label: string;
  group: string;
}[] = [
  // Gates
  { id: "Gate 1", label: "Gate 1", group: "Gates" },
  { id: "Gate 2", label: "Gate 2", group: "Gates" },
  { id: "Gate 3", label: "Gate 3", group: "Gates" },
  { id: "Gate 4", label: "Gate 4", group: "Gates" },
  { id: "Gate 5", label: "Gate 5", group: "Gates" },
  { id: "Gate A", label: "Gate A", group: "Gates" },
  { id: "Gate B", label: "Gate B", group: "Gates" },
  { id: "Gate E", label: "Gate E", group: "Gates" },
  // Sections
  { id: "Section 108", label: "Section 108", group: "Sections" },
  { id: "Section 112", label: "Section 112", group: "Sections" },
  { id: "Section 118", label: "Section 118", group: "Sections" },
  { id: "Section 124", label: "Section 124", group: "Sections" },
  { id: "Section 130", label: "Section 130", group: "Sections" },
  { id: "Section 140", label: "Section 140", group: "Sections" },
  { id: "Section 148", label: "Section 148", group: "Sections" },
  // Facilities
  { id: "Guest Services", label: "Guest Services", group: "Facilities" },
  { id: "Ticket Resolution", label: "Ticket Resolution Desk", group: "Facilities" },
  { id: "Medical Post S", label: "Medical Post (South)", group: "Facilities" },
  { id: "Medical Post N", label: "Medical Post (North)", group: "Facilities" },
  { id: "Main Concourse", label: "Main Concourse", group: "Facilities" },
  { id: "Food Court", label: "Food / Concessions Cluster", group: "Facilities" },
  { id: "Team Store", label: "Team Store / Merch", group: "Facilities" },
  { id: "ADA Elevator G3", label: "ADA Elevator (Gate 3)", group: "Facilities" },
  { id: "West Plaza", label: "West Plaza", group: "Plazas" },
  { id: "South Plaza", label: "South Plaza", group: "Plazas" },
  { id: "Family Reunion", label: "Family Reunion Point", group: "Facilities" },
  { id: "General", label: "General / Floating", group: "Other" },
  { id: "Custom", label: "Custom location…", group: "Other" },
];

export const PLAN_PRIORITIES = [
  { id: "low" as const, label: "Low" },
  { id: "medium" as const, label: "Medium" },
  { id: "high" as const, label: "High" },
  { id: "critical" as const, label: "Critical" },
];

export const PLAN_STATUSES = [
  { id: "planned" as const, label: "Planned" },
  { id: "assigned" as const, label: "Assigned" },
  { id: "active" as const, label: "Active" },
  { id: "completed" as const, label: "Completed" },
  { id: "cancelled" as const, label: "Cancelled" },
];
