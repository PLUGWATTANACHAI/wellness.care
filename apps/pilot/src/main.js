import "./styles.css";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
let googleMapsLoadPromise;

const services = [
  {
    id: "massage",
    category: "Massage",
    name: "นวดผ่อนคลายที่คอนโด",
    duration: "90 นาที",
    price: 1290,
    accent: "teal",
  },
  {
    id: "aroma",
    category: "Aroma",
    name: "Aroma Recovery",
    duration: "120 นาที",
    price: 1890,
    accent: "rose",
  },
  {
    id: "product",
    category: "Product",
    name: "Wellness Care Kit",
    duration: "ส่งภายในวัน",
    price: 690,
    accent: "gold",
  },
];

const providers = [
  { name: "Mina", rating: "4.92", jobs: "318", eta: "18 นาที", status: "Available" },
  { name: "Narin", rating: "4.88", jobs: "204", eta: "24 นาที", status: "Nearby" },
];

const state = {
  serviceId: "massage",
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  time: "19:30",
  address: "The Line Sathorn, Tower A",
  addressQuery: "The Line Sathorn",
  placeName: "The Line Sathorn",
  placeId: "",
  placeLocation: "",
  mapStatus: googleMapsApiKey ? "พร้อมค้นหาสถานที่จาก Google Places" : "ใช้ปุ่มค้นหา Google Maps ได้ทันที",
  note: "แจ้งนิติบุคคลก่อนขึ้นอาคาร",
  payment: "promptpay",
  step: 1,
};

const savedBookings = JSON.parse(localStorage.getItem("wellnestPilotBookings") || "[]");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currency(value) {
  return value.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
}

function selectedService() {
  return services.find((service) => service.id === state.serviceId) || services[0];
}

function saveBooking() {
  const service = selectedService();
  const booking = {
    id: `WN-${Math.floor(10000 + Math.random() * 89999)}`,
    service: service.name,
    date: state.date,
    time: state.time,
    address: state.address,
    payment: state.payment,
    status: "Provider assigned",
    createdAt: new Date().toISOString(),
  };
  savedBookings.unshift(booking);
  localStorage.setItem("wellnestPilotBookings", JSON.stringify(savedBookings.slice(0, 5)));
  state.step = 4;
  render();
}

function setStep(step) {
  state.step = step;
  render();
}

function updateField(key, value) {
  state[key] = value;
  if (key === "address") {
    state.addressQuery = value;
    state.placeName = value;
    state.placeId = "";
    state.placeLocation = "";
  }
  render();
}

function googleMapsSearchUrl() {
  const query = state.placeLocation || state.address || state.addressQuery || "condominium Bangkok";
  const params = new URLSearchParams({ api: "1", query });
  if (state.placeId) params.set("query_place_id", state.placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function openGoogleMapsSearch() {
  window.open(googleMapsSearchUrl(), "_blank", "noopener,noreferrer");
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    state.mapStatus = "เครื่องนี้ไม่รองรับการใช้ตำแหน่งปัจจุบัน";
    render();
    return;
  }

  state.mapStatus = "กำลังขออนุญาตตำแหน่งจากเครื่อง";
  render();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      state.placeLocation = `${lat},${lng}`;
      state.address = `ตำแหน่งปัจจุบัน (${lat}, ${lng})`;
      state.addressQuery = state.address;
      state.placeName = "ตำแหน่งปัจจุบัน";
      state.placeId = "";
      state.mapStatus = "บันทึกพิกัดปัจจุบันแล้ว";
      render();
    },
    () => {
      state.mapStatus = "ยังไม่ได้รับอนุญาตใช้ตำแหน่ง สามารถพิมพ์ชื่อคอนโดหรือเปิด Google Maps ได้";
      render();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
  );
}

function loadGoogleMapsScript() {
  if (!googleMapsApiKey) return Promise.reject(new Error("Missing Google Maps API key"));
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const callbackName = "wellnestGoogleMapsReady";
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=weekly&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

async function initPlaceAutocomplete() {
  const host = document.querySelector("#googlePlaceAutocompleteHost");
  if (!host || host.dataset.ready === "true") return;

  if (!googleMapsApiKey) {
    host.innerHTML = '<p class="mapNotice">ยังไม่ได้ตั้ง Google Maps API key สำหรับ autocomplete ในแอพ ใช้ปุ่มเปิด Google Maps ด้านล่างได้ก่อน</p>';
    host.dataset.ready = "true";
    return;
  }

  host.innerHTML = '<p class="mapNotice">กำลังโหลด Google Places</p>';
  host.dataset.ready = "true";

  try {
    await loadGoogleMapsScript();
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    const placeAutocomplete = new PlaceAutocompleteElement();
    placeAutocomplete.placeholder = "ค้นหาชื่อคอนโด อาคาร หรือสถานที่";
    placeAutocomplete.className = "googlePlaceAutocomplete";
    placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
      state.placeName = place.displayName || "";
      state.address = place.formattedAddress || state.placeName || state.address;
      state.addressQuery = state.address;
      state.placeId = place.id || "";
      state.placeLocation = place.location ? `${place.location.lat()},${place.location.lng()}` : "";
      state.mapStatus = "เลือกสถานที่จาก Google Places แล้ว";
      render();
    });

    host.innerHTML = "";
    host.appendChild(placeAutocomplete);
  } catch {
    host.innerHTML = '<p class="mapNotice">โหลด Google Places ไม่สำเร็จ ใช้ปุ่มเปิด Google Maps หรือพิมพ์ที่อยู่เองได้</p>';
    state.mapStatus = "Google Places ยังไม่พร้อมใช้งาน";
  }
}

function serviceButton(service) {
  const active = service.id === state.serviceId;
  return `
    <button class="serviceTile ${active ? "selected" : ""}" data-action="service" data-service-id="${service.id}">
      <span class="category ${service.accent}">${service.category}</span>
      <strong>${service.name}</strong>
      <small>${service.duration} · ${currency(service.price)}</small>
    </button>
  `;
}

function providerCard(provider, index) {
  return `
    <article class="providerRow">
      <div class="avatar">${provider.name.slice(0, 1)}</div>
      <div>
        <strong>${provider.name}</strong>
        <span>${provider.status} · ${provider.jobs} jobs</span>
      </div>
      <div class="providerMeta">
        <strong>${provider.rating}</strong>
        <span>${provider.eta}</span>
      </div>
      ${index === 0 ? '<mark>Best match</mark>' : ""}
    </article>
  `;
}

function bookingHistory() {
  if (savedBookings.length === 0) {
    return '<p class="muted">ยังไม่มี booking ทดลองในเครื่องนี้</p>';
  }

  return savedBookings
    .map(
      (booking) => `
        <article class="historyRow">
          <div>
            <strong>${booking.id}</strong>
            <span>${booking.service}</span>
          </div>
          <div>
            <strong>${booking.time}</strong>
            <span>${booking.status}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function render() {
  const service = selectedService();
  const progressWidth = `${state.step * 25}%`;
  const safeAddress = escapeHtml(state.address);
  const safeMapStatus = escapeHtml(state.mapStatus);
  const safePlaceName = escapeHtml(state.placeName || state.address);
  const mapsUrl = googleMapsSearchUrl();
  document.querySelector("#app").innerHTML = `
    <main class="shell">
      <section class="topBar">
        <div>
          <p>Coins 240 · Points 1,850</p>
          <h1>Wellnest</h1>
        </div>
        <button class="iconButton" data-action="reset" aria-label="Reset booking">↻</button>
      </section>

      <section class="promoBand">
        <div>
          <span>Pilot Offer</span>
          <strong>ทดลองจองบริการที่คอนโด</strong>
          <p>เหมาะกับลูกค้าที่ไม่มีเวลาไปร้าน และต้องการดูสถานะผู้ให้บริการแบบใกล้เคียง real-time</p>
        </div>
        <div class="promoVisual">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>

      <section class="progressPanel">
        <div class="progressTrack"><span style="width:${progressWidth}"></span></div>
        <div class="steps">
          <button class="${state.step === 1 ? "active" : ""}" data-action="step" data-step="1">บริการ</button>
          <button class="${state.step === 2 ? "active" : ""}" data-action="step" data-step="2">วันเวลา</button>
          <button class="${state.step === 3 ? "active" : ""}" data-action="step" data-step="3">ยืนยัน</button>
          <button class="${state.step === 4 ? "active" : ""}" data-action="step" data-step="4">ติดตาม</button>
        </div>
      </section>

      <section class="contentGrid">
        <div class="mainPanel">
          ${state.step === 1 ? `
            <div class="sectionHeader">
              <div>
                <span>Step 1</span>
                <h2>เลือกบริการหลัก</h2>
              </div>
            </div>
            <div class="serviceGrid">${services.map(serviceButton).join("")}</div>
            <div class="recommendPanel">
              <strong>รายการแนะนำหลังเลือกบริการ</strong>
              <p>${service.id === "product" ? "เพิ่มการ์ดข้อความและบริการจัดส่งด่วน" : "เพิ่มประคบร้อนหรือออยล์สำหรับการพักผ่อนหลังเลิกงาน"}</p>
            </div>
            <button class="primaryButton" data-action="step" data-step="2">ถัดไป</button>
          ` : ""}

          ${state.step === 2 ? `
            <div class="sectionHeader">
              <div>
                <span>Step 2</span>
                <h2>เลือกวัน เวลา และสถานที่</h2>
              </div>
            </div>
            <div class="formGrid">
              <label>วันที่ใช้บริการ<input type="date" data-field="date" value="${state.date}" /></label>
              <label>เวลา<input type="time" data-field="time" value="${state.time}" /></label>
              <div class="wide mapSearchPanel">
                <label>ค้นหาสถานที่ / ชื่อคอนโด<input data-field="address" value="${safeAddress}" placeholder="พิมพ์ชื่อคอนโด อาคาร หรือที่อยู่" /></label>
                <div id="googlePlaceAutocompleteHost" class="autocompleteHost"></div>
                <div class="mapActions">
                  <button type="button" class="secondaryButton" data-action="open-maps">ค้นหาใน Google Maps</button>
                  <button type="button" class="secondaryButton" data-action="use-current-location">ใช้ตำแหน่งปัจจุบัน</button>
                </div>
                <p class="mapStatus">${safeMapStatus}</p>
              </div>
              <label class="wide">หมายเหตุถึงผู้ให้บริการ<textarea data-field="note">${escapeHtml(state.note)}</textarea></label>
            </div>
            <div class="mapPreview">
              <div class="pin"></div>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${safePlaceName}</a>
            </div>
            <button class="primaryButton" data-action="step" data-step="3">ตรวจสอบรายการ</button>
          ` : ""}

          ${state.step === 3 ? `
            <div class="sectionHeader">
              <div>
                <span>Step 3</span>
                <h2>ยืนยัน booking ทดลอง</h2>
              </div>
            </div>
            <div class="summaryList">
              <div><span>บริการ</span><strong>${service.name}</strong></div>
              <div><span>วันเวลา</span><strong>${state.date} · ${state.time}</strong></div>
              <div><span>สถานที่</span><strong>${safeAddress}</strong></div>
              <div><span>ยอดชำระทดลอง</span><strong>${currency(service.price)}</strong></div>
            </div>
            <fieldset class="paymentChoice">
              <legend>วิธีชำระเงินจำลอง</legend>
              <label><input type="radio" name="payment" value="promptpay" ${state.payment === "promptpay" ? "checked" : ""} /> PromptPay Sandbox</label>
              <label><input type="radio" name="payment" value="card" ${state.payment === "card" ? "checked" : ""} /> Card Sandbox</label>
            </fieldset>
            <button class="primaryButton" data-action="save">ยืนยัน booking</button>
          ` : ""}

          ${state.step === 4 ? `
            <div class="sectionHeader">
              <div>
                <span>Step 4</span>
                <h2>ติดตามผู้ให้บริการ</h2>
              </div>
            </div>
            <div class="trackingPanel">
              <div class="routeLine"><span></span><span></span><span></span></div>
              <div>
                <strong>Provider assigned</strong>
                <p>กำลังเดินทางไปยัง ${safeAddress}</p>
              </div>
              <mark>ETA 18 นาที</mark>
            </div>
            <div class="feedbackBox">
              <strong>หลังทดสอบเสร็จ</strong>
              <p>ให้ tester ตอบ feedback เรื่องความเข้าใจ flow, ความน่าเชื่อถือ, ราคา และจุดที่ติดขัด</p>
            </div>
          ` : ""}
        </div>

        <aside class="sidePanel">
          <h2>ผู้ให้บริการใกล้คุณ</h2>
          <div class="providerList">${providers.map(providerCard).join("")}</div>
          <h2>Booking ล่าสุด</h2>
          <div class="historyList">${bookingHistory()}</div>
        </aside>
      </section>
    </main>
  `;

  bindEvents();
  initPlaceAutocomplete();
}

function bindEvents() {
  document.querySelectorAll("[data-action='service']").forEach((button) => {
    button.addEventListener("click", () => updateField("serviceId", button.dataset.serviceId));
  });

  document.querySelectorAll("[data-action='step']").forEach((button) => {
    button.addEventListener("click", () => setStep(Number(button.dataset.step)));
  });

  document.querySelector("[data-action='save']")?.addEventListener("click", saveBooking);
  document.querySelector("[data-action='open-maps']")?.addEventListener("click", openGoogleMapsSearch);
  document.querySelector("[data-action='use-current-location']")?.addEventListener("click", useCurrentLocation);
  document.querySelector("[data-action='reset']")?.addEventListener("click", () => {
    state.step = 1;
    render();
  });

  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", (event) => updateField(input.dataset.field, event.target.value));
  });

  document.querySelectorAll("input[name='payment']").forEach((input) => {
    input.addEventListener("change", (event) => updateField("payment", event.target.value));
  });
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
