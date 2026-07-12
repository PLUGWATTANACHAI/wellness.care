import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BookingStatus, UserRole } from "@wellnest/types";
import "./styles.css";

type ProviderJobStatus = Extract<
  BookingStatus,
  | "provider_offered"
  | "provider_accepted"
  | "provider_preparing"
  | "provider_on_the_way"
  | "arrived_at_lobby"
  | "service_started"
  | "completed"
>;

interface ProviderSession {
  id: string;
  name: string;
  role: Extract<UserRole, "provider">;
  verified: boolean;
}

interface ProviderJob {
  id: string;
  code: string;
  customerName: string;
  serviceName: string;
  durationMinutes: number;
  scheduledAt: string;
  area: string;
  exactAddress?: string;
  status: ProviderJobStatus;
  offerExpiresAt?: string;
  locationConsentAccepted: boolean;
}

interface SupportMessage {
  id: string;
  jobId: string;
  author: "provider" | "customer" | "support";
  authorName: string;
  body: string;
  createdAt: string;
  deliveryState: "sent" | "seen";
}

interface ProviderApiJob {
  id: string;
  code: string;
  customer: string;
  provider?: string;
  service: string;
  status: ProviderJobStatus;
  scheduledAt: string;
  totalTHB: number;
  offerExpiresAt?: string;
  offerStatus?: "offered" | "accepted" | "rejected" | "expired";
}

interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    role: string;
    name: string;
    phoneVerified: boolean;
  };
}

type ApiSyncStatus = "loading" | "live" | "fallback" | "saving" | "error";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://wellnest-api-staging.onrender.com";

const providerSession: ProviderSession = {
  id: "provider_demo_01",
  name: "Nira Wellness",
  role: "provider",
  verified: true,
};

const initialJobs: ProviderJob[] = [
  {
    id: "booking_1042",
    code: "WN-1042",
    customerName: "K. Mali",
    serviceName: "Aroma massage",
    durationMinutes: 90,
    scheduledAt: "2026-07-12T15:30:00+07:00",
    area: "Sathorn, Bangkok",
    exactAddress: "Sathorn Square lobby",
    status: "provider_offered",
    offerExpiresAt: "2026-07-12T14:55:00+07:00",
    locationConsentAccepted: false,
  },
  {
    id: "booking_1043",
    code: "WN-1043",
    customerName: "K. Arun",
    serviceName: "Office chair massage",
    durationMinutes: 60,
    scheduledAt: "2026-07-12T18:00:00+07:00",
    area: "Phrom Phong, Bangkok",
    status: "provider_offered",
    offerExpiresAt: "2026-07-12T16:10:00+07:00",
    locationConsentAccepted: false,
  },
];

const initialMessages: Record<string, SupportMessage[]> = {
  booking_1042: [
    {
      id: "msg_1042_01",
      jobId: "booking_1042",
      author: "support",
      authorName: "Wellnest Care",
      body: "Customer confirmed the lobby meeting point. Please accept the job before exact address is shown.",
      createdAt: "2026-07-12T14:20:00+07:00",
      deliveryState: "seen",
    },
    {
      id: "msg_1042_02",
      jobId: "booking_1042",
      author: "customer",
      authorName: "K. Mali",
      body: "I will wait near the reception desk.",
      createdAt: "2026-07-12T14:24:00+07:00",
      deliveryState: "seen",
    },
  ],
  booking_1043: [
    {
      id: "msg_1043_01",
      jobId: "booking_1043",
      author: "support",
      authorName: "Wellnest Care",
      body: "Office security requires provider name at check-in. Use support status if access is delayed.",
      createdAt: "2026-07-12T15:05:00+07:00",
      deliveryState: "seen",
    },
  ],
};

const providerStatusSteps: ProviderJobStatus[] = [
  "provider_accepted",
  "provider_preparing",
  "provider_on_the_way",
  "arrived_at_lobby",
  "service_started",
  "completed",
];

const statusLabels: Record<ProviderJobStatus, string> = {
  provider_offered: "Offered",
  provider_accepted: "Accepted",
  provider_preparing: "Preparing",
  provider_on_the_way: "On the way",
  arrived_at_lobby: "Arrived",
  service_started: "Service started",
  completed: "Completed",
};

const quickReplies = ["On my way", "Arrived at lobby", "Need support"];

let providerAccessToken = "";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function mapApiJob(job: ProviderApiJob): ProviderJob {
  return {
    id: job.id,
    code: job.code,
    customerName: job.customer,
    serviceName: job.service,
    durationMinutes: 90,
    scheduledAt: job.scheduledAt,
    area: "Customer service area",
    exactAddress: "Exact address appears after acceptance",
    status: job.status,
    offerExpiresAt: job.offerExpiresAt,
    locationConsentAccepted: false,
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-wellnest-role", "provider");
  if (providerAccessToken) headers.set("authorization", `Bearer ${providerAccessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Provider API failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function loginProvider() {
  const result = await apiRequest<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ role: "provider" }),
  });
  providerAccessToken = result.accessToken;
  return result;
}

async function fetchProviderJobs() {
  await loginProvider();
  const jobs = await apiRequest<ProviderApiJob[]>("/provider/jobs");
  return jobs.map(mapApiJob);
}

async function acceptProviderJob(jobId: string) {
  return apiRequest<{ bookingId: string; status: ProviderJobStatus }>(`/provider/jobs/${encodeURIComponent(jobId)}/accept`, {
    method: "POST",
  });
}

async function rejectProviderJob(jobId: string) {
  return apiRequest<{ bookingId: string; status: string }>(`/provider/jobs/${encodeURIComponent(jobId)}/reject`, {
    method: "POST",
  });
}

async function updateProviderJobStatus(jobId: string, status: ProviderJobStatus) {
  return apiRequest<{ bookingId: string; status: ProviderJobStatus }>(`/provider/jobs/${encodeURIComponent(jobId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

async function createProviderCommunication(jobId: string, body: string) {
  return apiRequest<SupportMessage>(`/bookings/${encodeURIComponent(jobId)}/communications`, {
    method: "POST",
    body: JSON.stringify({
      body,
      messageType: "provider_message",
      visibility: "customer_provider",
    }),
  });
}

function ProviderPilotApp() {
  const [jobs, setJobs] = useState(initialJobs);
  const [messagesByJobId, setMessagesByJobId] = useState(initialMessages);
  const [selectedJobId, setSelectedJobId] = useState(initialJobs[0]?.id ?? "");
  const [apiStatus, setApiStatus] = useState<ApiSyncStatus>("loading");
  const [apiNote, setApiNote] = useState("Connecting to provider API");

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );

  const selectedMessages = selectedJob ? (messagesByJobId[selectedJob.id] ?? []) : [];

  useEffect(() => {
    let cancelled = false;
    setApiStatus("loading");
    fetchProviderJobs()
      .then((apiJobs) => {
        if (cancelled) return;
        if (apiJobs.length) {
          setJobs(apiJobs);
          setSelectedJobId(apiJobs[0].id);
          setMessagesByJobId((currentMessages) =>
            apiJobs.reduce<Record<string, SupportMessage[]>>((nextMessages, job) => {
              nextMessages[job.id] = currentMessages[job.id] ?? [];
              return nextMessages;
            }, {}),
          );
          setApiStatus("live");
          setApiNote("Connected to provider job API");
          return;
        }

        setApiStatus("fallback");
        setApiNote("Provider API connected, no live jobs yet; showing pilot data");
      })
      .catch(() => {
        if (cancelled) return;
        setApiStatus("fallback");
        setApiNote("Provider API is not ready for this session; showing pilot data");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateJob(jobId: string, changes: Partial<ProviderJob>) {
    setJobs((currentJobs) => currentJobs.map((job) => (job.id === jobId ? { ...job, ...changes } : job)));
  }

  async function acceptJob(jobId: string) {
    setApiStatus("saving");
    updateJob(jobId, { status: "provider_accepted" });
    try {
      await acceptProviderJob(jobId);
      setApiStatus("live");
      setApiNote("Job accepted through provider API");
    } catch {
      setApiStatus("fallback");
      setApiNote("Accept is shown locally; backend could not confirm this pilot job");
    }
  }

  async function rejectJob(jobId: string) {
    setJobs((currentJobs) => {
      const remainingJobs = currentJobs.filter((job) => job.id !== jobId);
      setSelectedJobId(remainingJobs[0]?.id ?? "");
      return remainingJobs;
    });
    try {
      setApiStatus("saving");
      await rejectProviderJob(jobId);
      setApiStatus("live");
      setApiNote("Job rejected through provider API");
    } catch {
      setApiStatus("fallback");
      setApiNote("Reject is shown locally; backend could not confirm this pilot job");
    }
  }

  async function updateStatus(jobId: string, status: ProviderJobStatus) {
    updateJob(jobId, { status });
    try {
      setApiStatus("saving");
      await updateProviderJobStatus(jobId, status);
      setApiStatus("live");
      setApiNote("Status synced to provider API");
    } catch {
      setApiStatus("fallback");
      setApiNote("Status is shown locally; backend could not confirm this pilot job");
    }
  }

  async function appendProviderMessage(jobId: string, body: string) {
    const message: SupportMessage = {
      id: `msg_${jobId}_${Date.now()}`,
      jobId,
      author: "provider",
      authorName: providerSession.name,
      body,
      createdAt: new Date().toISOString(),
      deliveryState: "sent",
    };

    setMessagesByJobId((currentMessages) => ({
      ...currentMessages,
      [jobId]: [...(currentMessages[jobId] ?? []), message],
    }));

    try {
      setApiStatus("saving");
      await createProviderCommunication(jobId, body);
      setApiStatus("live");
      setApiNote("Provider message sent to communications API");
    } catch {
      setApiStatus("fallback");
      setApiNote("Message is shown locally; backend could not confirm this pilot message");
    }
  }

  function requestSupport(job: ProviderJob) {
    appendProviderMessage(job.id, `Support requested for ${job.code}: provider needs help with this booking.`);
  }

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Provider session">
        <div>
          <p className="eyebrow">Provider app foundation</p>
          <h1>Wellnest Provider</h1>
        </div>
        <div className="top-actions">
          <div className={`api-pill ${apiStatus}`}>
            <span>{apiStatus === "loading" ? "Connecting" : apiStatus === "saving" ? "Syncing" : apiStatus === "live" ? "Live API" : "Pilot fallback"}</span>
            <strong>{apiNote}</strong>
          </div>
          <div className="session-pill">
            <span>{providerSession.name}</span>
            <strong>{providerSession.role}</strong>
          </div>
        </div>
      </section>

      <section className="layout-grid">
        <aside className="panel inbox-panel" aria-label="Provider job inbox">
          <div className="panel-heading">
            <p className="eyebrow">Job inbox</p>
            <h2>{jobs.length} jobs</h2>
          </div>
          <nav className="provider-menu" aria-label="Provider pilot sections">
            <a href="#job-detail">Job detail</a>
            <a href="#support-messages">Support Messages</a>
          </nav>
          <div className="job-list">
            {jobs.map((job) => (
              <button
                className={`job-card ${job.id === selectedJob?.id ? "active" : ""}`}
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                type="button"
              >
                <span className="job-code">{job.code}</span>
                <strong>{job.serviceName}</strong>
                <span>{job.area}</span>
                <small>{statusLabels[job.status]}</small>
              </button>
            ))}
            {jobs.length === 0 ? (
              <div className="empty-state">
                <strong>No offered jobs</strong>
                <span>Provider remains separate from customer booking surfaces.</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="panel detail-panel" id="job-detail" aria-label="Provider job detail">
          {selectedJob ? (
            <>
              <div className="panel-heading split">
                <div>
                  <p className="eyebrow">Active workflow</p>
                  <h2>{selectedJob.code}</h2>
                </div>
                <span className="status-chip">{statusLabels[selectedJob.status]}</span>
              </div>

              <dl className="job-facts">
                <div>
                  <dt>Customer</dt>
                  <dd>{selectedJob.customerName}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>
                    {selectedJob.serviceName}, {selectedJob.durationMinutes} min
                  </dd>
                </div>
                <div>
                  <dt>Schedule</dt>
                  <dd>{formatTime(selectedJob.scheduledAt)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selectedJob.status === "provider_offered" ? selectedJob.area : selectedJob.exactAddress}</dd>
                </div>
              </dl>

              {selectedJob.status === "provider_offered" ? (
                <div className="action-row">
                  <button className="primary-button" onClick={() => acceptJob(selectedJob.id)} type="button">
                    Accept job
                  </button>
                  <button className="secondary-button" onClick={() => rejectJob(selectedJob.id)} type="button">
                    Reject
                  </button>
                </div>
              ) : (
                <div className="operations-stack">
                  <section className="operation-band">
                    <div>
                      <p className="eyebrow">Navigation</p>
                      <strong>Open map after acceptance</strong>
                    </div>
                    <button className="secondary-button" type="button">
                      Navigate
                    </button>
                  </section>

                  <section className="operation-band">
                    <div>
                      <p className="eyebrow">Location consent</p>
                      <strong>{selectedJob.locationConsentAccepted ? "Sharing approved" : "Consent required"}</strong>
                      <span>Visible only for the active booking and audited support access.</span>
                    </div>
                    <label className="switch">
                      <input
                        checked={selectedJob.locationConsentAccepted}
                        onChange={(event) => updateJob(selectedJob.id, { locationConsentAccepted: event.target.checked })}
                        type="checkbox"
                      />
                      <span>Share</span>
                    </label>
                  </section>

                  <section className="status-panel">
                    <p className="eyebrow">Status update</p>
                    <div className="status-grid">
                      {providerStatusSteps.map((status) => (
                        <button
                          className={selectedJob.status === status ? "status-button selected" : "status-button"}
                          key={status}
                          onClick={() => updateStatus(selectedJob.id, status)}
                          type="button"
                        >
                          {statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              <section className="support-panel" id="support-messages" aria-label="Support messages">
                <div className="panel-heading split">
                  <div>
                    <p className="eyebrow">Chat foundation</p>
                    <h2>Support Messages</h2>
                  </div>
                  <span className="status-chip">{selectedMessages.length} messages</span>
                </div>

                <div className="message-list">
                  {selectedMessages.map((message) => (
                    <article className={`message-bubble ${message.author}`} key={message.id}>
                      <div>
                        <strong>{message.authorName}</strong>
                        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                      </div>
                      <p>{message.body}</p>
                      <small>{message.deliveryState}</small>
                    </article>
                  ))}
                </div>

                <div className="quick-reply-panel" aria-label="Quick reply actions">
                  <p className="eyebrow">Quick reply</p>
                  <div className="quick-reply-grid">
                    {quickReplies.map((reply) => (
                      <button
                        className="secondary-button"
                        key={reply}
                        onClick={() => {
                          if (reply === "Need support") {
                            requestSupport(selectedJob);
                            return;
                          }

                          appendProviderMessage(selectedJob.id, reply);
                        }}
                        type="button"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state wide">
              <strong>Provider inbox is clear</strong>
              <span>The next step is wiring this standalone app to provider-only API routes.</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ProviderPilotApp />
  </React.StrictMode>,
);
