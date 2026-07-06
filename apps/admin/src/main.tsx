import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface AdminBooking {
  id: string;
  code: string;
  customer: string;
  provider?: string;
  service: string;
  status: string;
  scheduledAt: string;
  totalTHB: number;
  assignmentPolicy?: string;
  assignmentScore?: number;
  offerExpiresAt?: string;
  offerStatus?: "offered" | "accepted" | "rejected" | "expired";
}

interface AdminLocationAccess {
  id: string;
  bookingId: string;
  accessLevel: "exact";
  reasonCode: string;
  expiresInMinutes: number;
  location: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
    stale: boolean;
    lastUpdatedSecondsAgo: number;
  };
}

interface AuditLogItem {
  id: string;
  action: string;
  entityId: string;
  actor: string;
  reasonCode: string;
  detail: string;
  createdAt: string;
}

interface AdminPayment {
  id: string;
  bookingCode: string;
  customer: string;
  amountTHB: number;
  status: string;
  provider: string;
  paymentMethod: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  role: string;
  name: string;
  phone?: string;
  email?: string;
}

interface BookingTimelineItem {
  id: string;
  bookingId: string;
  status: string;
  actor: string;
  title: string;
  body: string;
  createdAt: string;
}

interface BookingCommunicationItem {
  id: string;
  bookingId: string;
  actor: string;
  actorRole: string;
  messageType: "customer_message" | "provider_message" | "admin_note" | "support_note" | "incident_note";
  visibility: "all_parties" | "customer_provider" | "admin_internal";
  body: string;
  createdAt: string;
}

interface AdminServiceOption {
  id: string;
  name: string;
  category: string;
}

interface AdminProviderOperationsItem {
  id: string;
  name: string;
  onlineStatus: string;
  verified: boolean;
  serviceRadiusMeters: number;
  skills: string[];
  skillIds: string[];
  workingHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    active: boolean;
  }>;
  leaveWindows: AdminProviderLeaveWindow[];
}

interface AdminProviderLeaveWindow {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  active: boolean;
  createdAt: string;
}

interface AdminReassignmentCandidate {
  providerId: string;
  providerName: string;
  rating?: number;
  distanceMeters: number;
  serviceRadiusMeters: number;
  activeJobCount: number;
  assignmentScore: number;
  hasActiveOffer: boolean;
}

interface AdminProviderOfferHistoryItem {
  id: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  offerStatus: "offered" | "accepted" | "rejected" | "expired";
  rankPosition: number;
  assignmentScore: number;
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
  manualActor?: string;
  manualReason?: string;
}

interface AdminSupportCaseItem {
  id: string;
  bookingId: string;
  bookingCode: string;
  customer: string;
  provider?: string;
  reporter: string;
  reporterRole: "customer" | "provider";
  reasonCode: "support_request" | "unsafe_message" | "arrival_issue" | "payment_issue";
  status: "open" | "in_review" | "resolved";
  messageType: "support_note" | "incident_note";
  body: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LoginResult {
  accessToken: string;
  user: {
    name: string;
    role: string;
  };
}

function AdminApp() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [providerOps, setProviderOps] = useState<AdminProviderOperationsItem[]>([]);
  const [serviceOptions, setServiceOptions] = useState<AdminServiceOption[]>([]);
  const [timeline, setTimeline] = useState<BookingTimelineItem[]>([]);
  const [communications, setCommunications] = useState<BookingCommunicationItem[]>([]);
  const [reassignmentCandidates, setReassignmentCandidates] = useState<AdminReassignmentCandidate[]>([]);
  const [offerHistory, setOfferHistory] = useState<AdminProviderOfferHistoryItem[]>([]);
  const [supportCases, setSupportCases] = useState<AdminSupportCaseItem[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedReassignmentProviderId, setSelectedReassignmentProviderId] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [workingStart, setWorkingStart] = useState("08:00");
  const [workingEnd, setWorkingEnd] = useState("22:00");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");
  const [communicationBody, setCommunicationBody] = useState("");
  const [communicationType, setCommunicationType] = useState<"admin_note" | "support_note" | "incident_note">("support_note");
  const [communicationVisibility, setCommunicationVisibility] = useState<"all_parties" | "admin_internal">("admin_internal");
  const [supportResolutionNote, setSupportResolutionNote] = useState("");
  const [reasonCode, setReasonCode] = useState("safety");
  const [reasonNote, setReasonNote] = useState("");
  const [locationAccess, setLocationAccess] = useState<AdminLocationAccess | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [locationStatus, setLocationStatus] = useState<"idle" | "saving" | "ready" | "error">("idle");
  const [providerOpsStatus, setProviderOpsStatus] = useState<"idle" | "saving" | "ready" | "error">("idle");
  const [supportCaseStatus, setSupportCaseStatus] = useState<"idle" | "saving" | "ready" | "error">("idle");
  const [adminSession, setAdminSession] = useState<LoginResult | undefined>();
  const [lastUpdated, setLastUpdated] = useState<string>("-");

  function adminHeaders(extraHeaders: Record<string, string> = {}) {
    return {
      ...extraHeaders,
      "x-wellnest-role": "admin",
      ...(adminSession?.accessToken ? { authorization: `Bearer ${adminSession.accessToken}` } : {}),
    };
  }

  function loadBookings() {
    setStatus("loading");
    fetch(`${API_BASE_URL}/admin/bookings`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load admin bookings");
        return response.json() as Promise<AdminBooking[]>;
      })
      .then((items) => {
        setBookings(items);
        setSelectedBookingId((current) => {
          const nextBookingId = current || items[0]?.id || "";
          if (nextBookingId) {
            loadTimeline(nextBookingId);
            loadCommunications(nextBookingId);
            loadReassignmentCandidates(nextBookingId);
            loadOfferHistory(nextBookingId);
          }
          return nextBookingId;
        });
        setLastUpdated(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  function loadAuditLogs() {
    fetch(`${API_BASE_URL}/admin/audit-logs`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load audit logs");
        return response.json() as Promise<AuditLogItem[]>;
      })
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]));
  }

  function loadPayments() {
    fetch(`${API_BASE_URL}/admin/payments`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load payments");
        return response.json() as Promise<AdminPayment[]>;
      })
      .then(setPayments)
      .catch(() => setPayments([]));
  }

  function loadUsers() {
    fetch(`${API_BASE_URL}/admin/users`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load users");
        return response.json() as Promise<AdminUser[]>;
      })
      .then(setUsers)
      .catch(() => setUsers([]));
  }

  function applySelectedProvider(provider: AdminProviderOperationsItem | undefined) {
    if (!provider) return;

    setSelectedProviderId(provider.id);
    setSelectedSkillIds(provider.skillIds);
    const firstActiveHour = provider.workingHours.find((hour) => hour.active) || provider.workingHours[0];
    setWorkingStart(firstActiveHour?.startTime ?? "08:00");
    setWorkingEnd(firstActiveHour?.endTime ?? "22:00");
  }

  function loadProviderOperations() {
    fetch(`${API_BASE_URL}/admin/provider-operations`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load provider operations");
        return response.json() as Promise<{ providers: AdminProviderOperationsItem[]; services: AdminServiceOption[] }>;
      })
      .then((result) => {
        setProviderOps(result.providers);
        setServiceOptions(result.services);
        const currentProvider = result.providers.find((provider) => provider.id === selectedProviderId) || result.providers[0];
        applySelectedProvider(currentProvider);
        setProviderOpsStatus("ready");
      })
      .catch(() => setProviderOpsStatus("error"));
  }

  function loadSupportCases() {
    fetch(`${API_BASE_URL}/admin/support-cases`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load support cases");
        return response.json() as Promise<AdminSupportCaseItem[]>;
      })
      .then((items) => {
        setSupportCases(items);
        setSupportCaseStatus("ready");
      })
      .catch(() => {
        setSupportCases([]);
        setSupportCaseStatus("error");
      });
  }

  function loadTimeline(bookingId = selectedBookingId) {
    if (!bookingId) {
      setTimeline([]);
      return;
    }

    fetch(`${API_BASE_URL}/bookings/${bookingId}/timeline`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load timeline");
        return response.json() as Promise<BookingTimelineItem[]>;
      })
      .then(setTimeline)
      .catch(() => setTimeline([]));
  }

  function loadCommunications(bookingId = selectedBookingId) {
    if (!bookingId) {
      setCommunications([]);
      return;
    }

    fetch(`${API_BASE_URL}/bookings/${bookingId}/communications`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load communications");
        return response.json() as Promise<BookingCommunicationItem[]>;
      })
      .then(setCommunications)
      .catch(() => setCommunications([]));
  }

  function loadReassignmentCandidates(bookingId = selectedBookingId) {
    if (!bookingId) {
      setReassignmentCandidates([]);
      setSelectedReassignmentProviderId("");
      return;
    }

    fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/reassignment-candidates`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load reassignment candidates");
        return response.json() as Promise<AdminReassignmentCandidate[]>;
      })
      .then((items) => {
        setReassignmentCandidates(items);
        setSelectedReassignmentProviderId((current) =>
          current && items.some((item) => item.providerId === current) ? current : items[0]?.providerId || "",
        );
      })
      .catch(() => {
        setReassignmentCandidates([]);
        setSelectedReassignmentProviderId("");
      });
  }

  function loadOfferHistory(bookingId = selectedBookingId) {
    if (!bookingId) {
      setOfferHistory([]);
      return;
    }

    fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/provider-offers`, {
      headers: adminHeaders(),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load provider offer history");
        return response.json() as Promise<AdminProviderOfferHistoryItem[]>;
      })
      .then(setOfferHistory)
      .catch(() => setOfferHistory([]));
  }

  async function requestLocationAccess() {
    if (!selectedBookingId) return;

    setLocationStatus("saving");
    setLocationAccess(undefined);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/bookings/${selectedBookingId}/location-access`, {
        method: "POST",
        headers: {
          ...adminHeaders({ "content-type": "application/json" }),
        },
        body: JSON.stringify({ reasonCode, reasonNote }),
      });

      if (!response.ok) throw new Error("Failed to request location access");

      setLocationAccess((await response.json()) as AdminLocationAccess);
      setLocationStatus("ready");
      loadAuditLogs();
    } catch {
      setLocationStatus("error");
    }
  }

  async function saveProviderOperations() {
    if (!selectedProviderId) return;

    setProviderOpsStatus("saving");
    try {
      const headers = adminHeaders({ "content-type": "application/json" });
      const skillsResponse = await fetch(`${API_BASE_URL}/admin/providers/${selectedProviderId}/service-skills`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ serviceIds: selectedSkillIds }),
      });
      if (!skillsResponse.ok) throw new Error("Failed to save provider skills");

      const hoursResponse = await fetch(`${API_BASE_URL}/admin/providers/${selectedProviderId}/working-hours`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          startTime: workingStart,
          endTime: workingEnd,
          dayOfWeeks: [1, 2, 3, 4, 5, 6, 7],
        }),
      });
      if (!hoursResponse.ok) throw new Error("Failed to save provider hours");

      loadProviderOperations();
      loadAuditLogs();
      setProviderOpsStatus("ready");
    } catch {
      setProviderOpsStatus("error");
    }
  }

  async function createLeaveWindow() {
    if (!selectedProviderId || !leaveStart || !leaveEnd) return;

    setProviderOpsStatus("saving");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/providers/${selectedProviderId}/leave-windows`, {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          startsAt: new Date(leaveStart).toISOString(),
          endsAt: new Date(leaveEnd).toISOString(),
          reason: leaveReason.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to create provider leave window");

      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      loadProviderOperations();
      loadAuditLogs();
      setProviderOpsStatus("ready");
    } catch {
      setProviderOpsStatus("error");
    }
  }

  async function deactivateLeaveWindow(leaveWindowId: string) {
    if (!selectedProviderId) return;

    setProviderOpsStatus("saving");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/providers/${selectedProviderId}/leave-windows/${leaveWindowId}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!response.ok) throw new Error("Failed to deactivate provider leave window");

      loadProviderOperations();
      loadAuditLogs();
      setProviderOpsStatus("ready");
    } catch {
      setProviderOpsStatus("error");
    }
  }

  async function processExpiredOffers() {
    setStatus("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/provider-offers/process-expired`, {
        method: "POST",
        headers: adminHeaders(),
      });
      if (!response.ok) throw new Error("Failed to process expired offers");
      loadBookings();
      loadAuditLogs();
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function reassignProvider() {
    if (!selectedBookingId || !selectedReassignmentProviderId || !reassignmentReason.trim()) return;

    setStatus("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/bookings/${selectedBookingId}/reassign-provider`, {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          providerId: selectedReassignmentProviderId,
          reasonNote: reassignmentReason.trim(),
        }),
      });
      if (!response.ok) throw new Error("Failed to reassign provider");

      setReassignmentReason("");
      loadBookings();
      loadTimeline(selectedBookingId);
      loadCommunications(selectedBookingId);
      loadReassignmentCandidates(selectedBookingId);
      loadOfferHistory(selectedBookingId);
      loadAuditLogs();
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function createCommunication() {
    if (!selectedBookingId || !communicationBody.trim()) return;

    setStatus("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${selectedBookingId}/communications`, {
        method: "POST",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          body: communicationBody.trim(),
          messageType: communicationType,
          visibility: communicationVisibility,
        }),
      });
      if (!response.ok) throw new Error("Failed to create communication");

      setCommunicationBody("");
      loadCommunications(selectedBookingId);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function updateSupportCase(caseId: string, nextStatus: AdminSupportCaseItem["status"]) {
    if (nextStatus === "resolved" && !supportResolutionNote.trim()) return;

    setSupportCaseStatus("saving");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support-cases/${caseId}`, {
        method: "PATCH",
        headers: adminHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          status: nextStatus,
          resolutionNote: supportResolutionNote.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to update support case");

      setSupportResolutionNote("");
      loadSupportCases();
      loadCommunications(selectedBookingId);
      setSupportCaseStatus("ready");
    } catch {
      setSupportCaseStatus("error");
    }
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to login admin");
        return response.json() as Promise<LoginResult>;
      })
      .then(setAdminSession)
      .catch(() => setAdminSession(undefined));
  }, []);

  useEffect(() => {
    loadBookings();
    loadAuditLogs();
    loadPayments();
    loadUsers();
    loadProviderOperations();
    loadSupportCases();
  }, [adminSession?.accessToken]);

  const activeJobs = bookings.filter((booking) => booking.status.includes("provider")).length;
  const openSupportCases = supportCases.filter((item) => item.status !== "resolved").length;
  const selectedProvider = providerOps.find((provider) => provider.id === selectedProviderId);
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);

  return (
    <main className="shell">
      <header className="hero">
        <p>Admin Dashboard · Supabase connected</p>
        <h1>Wellnest Operations</h1>
        <span>{adminSession ? `Signed in as ${adminSession.user.name}` : "Signing in admin session..."}</span>
      </header>

      <section className="grid">
        <article>
          <p>Live bookings</p>
          <h2>{bookings.length}</h2>
          <span>{activeJobs} provider flow item(s)</span>
        </article>
        <article>
          <p>API status</p>
          <h2>{status === "ready" ? "Live" : status === "loading" ? "..." : "Check"}</h2>
          <span>{status === "error" ? "API connection issue" : "Reading Supabase-backed API"}</span>
        </article>
        <article>
          <p>Latest status</p>
          <h2>{bookings[0]?.status ?? "-"}</h2>
          <span>{bookings[0]?.code ?? "No booking loaded yet"}</span>
        </article>
        <article>
          <p>Database</p>
          <h2>Dev</h2>
          <span>Supabase project connected</span>
        </article>
        <article>
          <p>Support cases</p>
          <h2>{openSupportCases}</h2>
          <span>{supportCaseStatus === "error" ? "Needs refresh" : "Open or in review"}</span>
        </article>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Bookings</h2>
            <p>Last updated {lastUpdated}</p>
          </div>
          <button className="refreshButton" disabled={status === "loading"} onClick={loadBookings} type="button">
            {status === "loading" ? "Loading" : "Refresh"}
          </button>
          <button className="refreshButton" disabled={status === "loading"} onClick={processExpiredOffers} type="button">
            Process offers
          </button>
        </div>
        <div className="table">
          <div className="tableHead">
            <span>Code</span>
            <span>Customer</span>
            <span>Provider</span>
            <span>Status</span>
            <span>Schedule</span>
            <span>Total</span>
          </div>
          {bookings.map((booking) => (
            <div className="tableRow" key={booking.id}>
              <span>{booking.code}</span>
              <span>{booking.customer}</span>
              <span>
                {booking.provider ?? "Unassigned"}
                {booking.assignmentScore ? ` · ${(booking.assignmentScore * 100).toFixed(0)}%` : ""}
                {booking.offerStatus ? ` · ${booking.offerStatus}` : ""}
              </span>
              <span>
                <mark>{booking.status}</mark>
              </span>
              <span>{new Date(booking.scheduledAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span>฿{booking.totalTHB.toLocaleString("th-TH")}</span>
            </div>
          ))}
          {status === "loading" ? <p className="muted">Loading bookings...</p> : null}
          {status === "error" ? <p className="error">Could not load bookings. Start API at port 4000 and retry.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Support Triage</h2>
            <p>Track support and safety cases until they are resolved.</p>
          </div>
          <button className="refreshButton" onClick={loadSupportCases} type="button">
            Refresh
          </button>
        </div>
        <div className="supportTriageForm">
          <label>
            Resolution note
            <textarea
              onChange={(event) => setSupportResolutionNote(event.target.value)}
              placeholder="Required before resolving a case"
              rows={3}
              value={supportResolutionNote}
            />
          </label>
        </div>
        <div className="supportCaseList">
          {supportCases.map((item) => (
            <div className={`supportCaseItem ${item.status}`} key={item.id}>
              <div>
                <strong>
                  {item.bookingCode} · {item.reasonCode}
                </strong>
                <span>
                  {item.reporter} ({item.reporterRole}) · {item.customer}
                  {item.provider ? ` / ${item.provider}` : ""}
                </span>
                <small>{new Date(item.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</small>
              </div>
              <p>{item.body}</p>
              <div className="supportCaseFooter">
                <mark>{item.status}</mark>
                {item.resolutionNote ? <span>Resolved: {item.resolutionNote}</span> : null}
                <button
                  className="refreshButton"
                  disabled={item.status === "in_review" || item.status === "resolved" || supportCaseStatus === "saving"}
                  onClick={() => updateSupportCase(item.id, "in_review")}
                  type="button"
                >
                  Start review
                </button>
                <button
                  className="primaryButton"
                  disabled={item.status === "resolved" || !supportResolutionNote.trim() || supportCaseStatus === "saving"}
                  onClick={() => updateSupportCase(item.id, "resolved")}
                  type="button"
                >
                  Resolve case
                </button>
              </div>
            </div>
          ))}
          {supportCases.length === 0 ? <p className="muted">No support cases found.</p> : null}
          {supportCaseStatus === "error" ? <p className="error">Could not load support cases.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Manual Reassignment</h2>
            <p>Re-offer a booking to an eligible provider with an audit reason.</p>
          </div>
          <button className="refreshButton" onClick={() => loadReassignmentCandidates()} type="button">
            Refresh
          </button>
        </div>
        <div className="manualReassignGrid">
          <label>
            Booking
            <select
              value={selectedBookingId}
              onChange={(event) => {
                setSelectedBookingId(event.target.value);
                loadTimeline(event.target.value);
                loadCommunications(event.target.value);
                loadReassignmentCandidates(event.target.value);
                loadOfferHistory(event.target.value);
              }}
            >
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.code} · {booking.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Provider
            <select
              value={selectedReassignmentProviderId}
              onChange={(event) => setSelectedReassignmentProviderId(event.target.value)}
            >
              {reassignmentCandidates.map((candidate) => (
                <option key={candidate.providerId} value={candidate.providerId}>
                  {candidate.providerName} · {(candidate.assignmentScore * 100).toFixed(0)}% ·{" "}
                  {(candidate.distanceMeters / 1000).toFixed(2)} km
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <textarea
              onChange={(event) => setReassignmentReason(event.target.value)}
              placeholder="Required admin reason"
              rows={3}
              value={reassignmentReason}
            />
          </label>
          <button
            className="primaryButton"
            disabled={!selectedBookingId || !selectedReassignmentProviderId || !reassignmentReason.trim() || status === "loading"}
            onClick={reassignProvider}
            type="button"
          >
            Re-offer provider
          </button>
        </div>
        <div className="candidateList">
          {reassignmentCandidates.map((candidate) => (
            <div className="candidateItem" key={candidate.providerId}>
              <strong>{candidate.providerName}</strong>
              <span>
                Score {(candidate.assignmentScore * 100).toFixed(0)}% · {(candidate.distanceMeters / 1000).toFixed(2)} km ·{" "}
                {candidate.activeJobCount} active job(s)
              </span>
              <small>{candidate.hasActiveOffer ? "Active offer already exists" : "Eligible for manual re-offer"}</small>
            </div>
          ))}
          {selectedBooking && reassignmentCandidates.length === 0 ? (
            <p className="muted">No eligible provider found for {selectedBooking.code}.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Communication Notes</h2>
            <p>Customer, provider, support, and internal booking context.</p>
          </div>
          <button className="refreshButton" onClick={() => loadCommunications()} type="button">
            Refresh
          </button>
        </div>
        <div className="communicationForm">
          <label>
            Type
            <select value={communicationType} onChange={(event) => setCommunicationType(event.target.value as typeof communicationType)}>
              <option value="support_note">Support note</option>
              <option value="admin_note">Admin note</option>
              <option value="incident_note">Incident note</option>
            </select>
          </label>
          <label>
            Visibility
            <select
              value={communicationVisibility}
              onChange={(event) => setCommunicationVisibility(event.target.value as typeof communicationVisibility)}
            >
              <option value="admin_internal">Admin internal</option>
              <option value="all_parties">All parties</option>
            </select>
          </label>
          <label>
            Note
            <textarea
              onChange={(event) => setCommunicationBody(event.target.value)}
              placeholder="Add booking context or support note"
              rows={3}
              value={communicationBody}
            />
          </label>
          <button
            className="primaryButton"
            disabled={!selectedBookingId || !communicationBody.trim() || status === "loading"}
            onClick={createCommunication}
            type="button"
          >
            Add note
          </button>
        </div>
        <div className="communicationList">
          {communications.map((item) => (
            <div className="communicationItem" key={item.id}>
              <strong>
                {item.actor} · {item.messageType}
              </strong>
              <span>{item.body}</span>
              <small>
                {item.visibility} · {new Date(item.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
              </small>
            </div>
          ))}
          {selectedBooking && communications.length === 0 ? (
            <p className="muted">No communication notes found for {selectedBooking.code}.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Provider Offer History</h2>
            <p>Review every provider offer for the selected booking.</p>
          </div>
          <button className="refreshButton" onClick={() => loadOfferHistory()} type="button">
            Refresh
          </button>
        </div>
        <div className="offerHistoryList">
          {offerHistory.map((offer) => (
            <div className="offerHistoryItem" key={offer.id}>
              <strong>
                #{offer.rankPosition} · {offer.providerName}
              </strong>
              <span>
                {offer.offerStatus} · score {(offer.assignmentScore * 100).toFixed(0)}% · expires{" "}
                {new Date(offer.expiresAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <small>
                Created {new Date(offer.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                {offer.respondedAt
                  ? ` · responded ${new Date(offer.respondedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
              </small>
              {offer.manualReason ? (
                <small>
                  Manual by {offer.manualActor ?? "admin"} · {offer.manualReason}
                </small>
              ) : null}
            </div>
          ))}
          {selectedBooking && offerHistory.length === 0 ? (
            <p className="muted">No provider offer history found for {selectedBooking.code}.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Payments</h2>
            <p>Sandbox payments for MVP testing</p>
          </div>
          <button className="refreshButton" onClick={loadPayments} type="button">
            Refresh
          </button>
        </div>
        <div className="paymentList">
          {payments.map((payment) => (
            <div className="paymentItem" key={payment.id}>
              <strong>{payment.bookingCode}</strong>
              <span>{payment.customer}</span>
              <mark>{payment.status}</mark>
              <span>฿{payment.amountTHB.toLocaleString("th-TH")}</span>
              <small>{payment.provider} · {payment.paymentMethod}</small>
            </div>
          ))}
          {payments.length === 0 ? <p className="muted">No sandbox payments yet.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Accounts</h2>
            <p>Customer and provider profile records</p>
          </div>
          <button className="refreshButton" onClick={loadUsers} type="button">
            Refresh
          </button>
        </div>
        <div className="accountList">
          {users.map((user) => (
            <div className="accountItem" key={user.id}>
              <strong>{user.name}</strong>
              <mark>{user.role}</mark>
              <span>{user.phone ?? "-"}</span>
              <small>{user.email ?? "-"}</small>
            </div>
          ))}
          {users.length === 0 ? <p className="muted">No account records loaded yet.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Provider Operations</h2>
            <p>Manage service skills and working hours used by booking availability.</p>
          </div>
          <button className="refreshButton" onClick={loadProviderOperations} type="button">
            Refresh
          </button>
        </div>
        <div className="providerOpsGrid">
          <label>
            Provider
            <select
              value={selectedProviderId}
              onChange={(event) => {
                const provider = providerOps.find((item) => item.id === event.target.value);
                applySelectedProvider(provider);
              }}
            >
              {providerOps.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.onlineStatus}
                </option>
              ))}
            </select>
          </label>
          <div className="skillList">
            {serviceOptions.map((service) => (
              <label className="skillItem" key={service.id}>
                <input
                  checked={selectedSkillIds.includes(service.id)}
                  onChange={(event) => {
                    setSelectedSkillIds((current) =>
                      event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id),
                    );
                  }}
                  type="checkbox"
                />
                <span>{service.name}</span>
                <small>{service.category}</small>
              </label>
            ))}
          </div>
          <div className="workingHoursForm">
            <label>
              Start
              <input onChange={(event) => setWorkingStart(event.target.value)} type="time" value={workingStart} />
            </label>
            <label>
              End
              <input onChange={(event) => setWorkingEnd(event.target.value)} type="time" value={workingEnd} />
            </label>
            <button
              className="primaryButton"
              disabled={!selectedProviderId || providerOpsStatus === "saving"}
              onClick={saveProviderOperations}
              type="button"
            >
              {providerOpsStatus === "saving" ? "Saving" : "Save provider setup"}
            </button>
          </div>
          <div className="leaveManager">
            <div>
              <h3>Leave / holiday</h3>
              <p>Block dates that this provider should not receive bookings.</p>
            </div>
            <div className="leaveForm">
              <label>
                Starts
                <input onChange={(event) => setLeaveStart(event.target.value)} type="datetime-local" value={leaveStart} />
              </label>
              <label>
                Ends
                <input onChange={(event) => setLeaveEnd(event.target.value)} type="datetime-local" value={leaveEnd} />
              </label>
              <label>
                Reason
                <input
                  onChange={(event) => setLeaveReason(event.target.value)}
                  placeholder="Optional note"
                  type="text"
                  value={leaveReason}
                />
              </label>
              <button
                className="primaryButton"
                disabled={!selectedProviderId || !leaveStart || !leaveEnd || providerOpsStatus === "saving"}
                onClick={createLeaveWindow}
                type="button"
              >
                Add leave
              </button>
            </div>
            <div className="leaveList">
              {selectedProvider?.leaveWindows.map((leave) => (
                <div className="leaveItem" key={leave.id}>
                  <div>
                    <strong>
                      {new Date(leave.startsAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    </strong>
                    <span>
                      to {new Date(leave.endsAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <small>{leave.reason || "No note"}</small>
                  </div>
                  <button
                    className="ghostButton"
                    disabled={providerOpsStatus === "saving"}
                    onClick={() => deactivateLeaveWindow(leave.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {selectedProvider?.leaveWindows.length === 0 ? (
                <p className="muted">No active leave windows for this provider.</p>
              ) : null}
            </div>
          </div>
          {providerOpsStatus === "error" ? <p className="error">Provider setup save/load failed. Please retry.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <h2>Event Timeline</h2>
            <p>Booking status events for operations review</p>
          </div>
          <button className="refreshButton" onClick={() => loadTimeline()} type="button">
            Refresh
          </button>
        </div>
        <div className="timelineControls">
          <label>
            Booking
            <select
              value={selectedBookingId}
              onChange={(event) => {
                setSelectedBookingId(event.target.value);
                loadTimeline(event.target.value);
                loadCommunications(event.target.value);
                loadReassignmentCandidates(event.target.value);
                loadOfferHistory(event.target.value);
              }}
            >
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.code} · {booking.customer}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="timelineList">
          {timeline.map((event) => (
            <div className="timelineItem" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.body}</span>
              <small>
                {event.actor} · {event.status} · {new Date(event.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
              </small>
            </div>
          ))}
          {timeline.length === 0 ? <p className="muted">No timeline events loaded yet.</p> : null}
        </div>
      </section>

      <section className="safetyGrid">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Location Safety</h2>
              <p>Exact provider location requires a reason and creates an audit record.</p>
            </div>
          </div>
          <div className="safetyForm">
            <label>
              Booking
              <select
                value={selectedBookingId}
                onChange={(event) => {
                setSelectedBookingId(event.target.value);
                loadTimeline(event.target.value);
                loadCommunications(event.target.value);
                loadReassignmentCandidates(event.target.value);
                loadOfferHistory(event.target.value);
                }}
              >
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.code} · {booking.customer}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
                <option value="safety">Safety check</option>
                <option value="customer_support">Customer support</option>
                <option value="provider_support">Provider support</option>
                <option value="incident_review">Incident review</option>
              </select>
            </label>
            <label>
              Note
              <textarea
                onChange={(event) => setReasonNote(event.target.value)}
                placeholder="Short note for audit trail"
                rows={3}
                value={reasonNote}
              />
            </label>
            <button
              className="primaryButton"
              disabled={!selectedBookingId || locationStatus === "saving"}
              onClick={requestLocationAccess}
              type="button"
            >
              {locationStatus === "saving" ? "Requesting" : "Open tracked location"}
            </button>
          </div>
          {locationAccess ? (
            <div className="locationResult">
              <strong>
                {locationAccess.location.lat.toFixed(5)}, {locationAccess.location.lng.toFixed(5)}
              </strong>
              <span>
                Accuracy {locationAccess.location.accuracyMeters ?? "-"}m · {locationAccess.location.lastUpdatedSecondsAgo}s ago ·
                expires in {locationAccess.expiresInMinutes} min
              </span>
            </div>
          ) : null}
          {locationStatus === "error" ? (
            <p className="error">Location access failed. The booking may not have active provider tracking yet.</p>
          ) : null}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Safety Audit</h2>
              <p>Latest admin location access logs</p>
            </div>
            <button className="refreshButton" onClick={loadAuditLogs} type="button">
              Refresh
            </button>
          </div>
          <div className="auditList">
            {auditLogs.map((log) => (
              <div className="auditItem" key={log.id}>
                <strong>{log.action}</strong>
                <span>{log.entityId} · {log.reasonCode}</span>
                <span>{log.detail}</span>
                <small>
                  {log.actor} · {new Date(log.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </small>
              </div>
            ))}
            {auditLogs.length === 0 ? <p className="muted">No safety audit logs yet.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<AdminApp />);
