import { query } from "../../core/db/client";

export interface PartnerClinicServiceDto {
  serviceId: string;
  name: string;
  priceTHB: number;
  durationMinutes: number;
}

export interface PartnerClinicDto {
  id: string;
  name: string;
  category: string;
  area: string;
  address: string;
  lat?: number;
  lng?: number;
  headline: string;
  description: string;
  promotionTitle: string;
  promotionBody: string;
  services: PartnerClinicServiceDto[];
}

export interface PartnerClinicSlotDto {
  id: string;
  clinicId: string;
  serviceId: string;
  startsAt: string;
  capacity: number;
  availableCount: number;
}

const demoPartnerClinics: PartnerClinicDto[] = [
  {
    id: "clinic_sathorn_wellness",
    name: "Sathorn Wellness Clinic",
    category: "Recovery clinic",
    area: "Sathorn · 1.8 km",
    address: "Empire Tower, Sathorn",
    lat: 13.7209,
    lng: 100.5307,
    headline: "Aroma recovery และ office stretch หลังเลิกงาน",
    description: "เหมาะกับลูกค้าที่ต้องการเข้าคลินิกพาร์ทเนอร์ใกล้ออฟฟิศหรือคอนโด",
    promotionTitle: "After-work recovery",
    promotionBody: "รับส่วนลดเปิดตัวสำหรับรอบ 18:00-21:00 ในวันธรรมดา",
    services: [
      { serviceId: "svc_beauty_90", name: "Aroma Recovery Session", priceTHB: 1590, durationMinutes: 90 },
      { serviceId: "svc_massage_90", name: "Neck & Shoulder Recovery", priceTHB: 1290, durationMinutes: 90 },
    ],
  },
  {
    id: "clinic_langsuan_recovery",
    name: "Langsuan Recovery Studio",
    category: "Recovery studio",
    area: "Langsuan · 2.4 km",
    address: "Langsuan Village, Chidlom",
    lat: 13.7419,
    lng: 100.5422,
    headline: "Therapy room และ wellness kit สำหรับการฟื้นฟู",
    description: "เหมาะกับแพ็กเกจดูแลตัวเองที่ต้องใช้ห้องบริการของคลินิก",
    promotionTitle: "Studio care bundle",
    promotionBody: "จอง service bundle พร้อม wellness kit ได้ในรอบเดียว",
    services: [
      { serviceId: "svc_product_sleep", name: "Wellness Kit Consultation", priceTHB: 690, durationMinutes: 0 },
      { serviceId: "svc_beauty_90", name: "Recovery Studio Session", priceTHB: 1590, durationMinutes: 90 },
    ],
  },
];

const demoSlots: PartnerClinicSlotDto[] = [
  slot("slot_sathorn_evening_1", "clinic_sathorn_wellness", "svc_beauty_90", 30, 2),
  slot("slot_sathorn_evening_2", "clinic_sathorn_wellness", "svc_massage_90", 54, 2),
  slot("slot_langsuan_morning_1", "clinic_langsuan_recovery", "svc_product_sleep", 26, 3),
  slot("slot_langsuan_evening_1", "clinic_langsuan_recovery", "svc_beauty_90", 58, 2),
];

export async function listPartnerClinics(): Promise<PartnerClinicDto[]> {
  if (!process.env.DATABASE_URL) return demoPartnerClinics;

  const clinics = await query<Omit<PartnerClinicDto, "services">>(
    `
      SELECT
        id,
        name,
        category,
        area_label AS area,
        address_text AS address,
        lat::float AS lat,
        lng::float AS lng,
        headline,
        description,
        promotion_title AS "promotionTitle",
        promotion_body AS "promotionBody"
      FROM partner_clinics
      WHERE active = TRUE
        AND partner_status = 'active'
      ORDER BY area_label, name
    `,
  );

  const services = await query<PartnerClinicServiceDto & { clinicId: string }>(
    `
      SELECT
        pcs.clinic_id AS "clinicId",
        pcs.service_id AS "serviceId",
        pcs.display_name AS name,
        pcs.display_price_thb AS "priceTHB",
        pcs.duration_minutes AS "durationMinutes"
      FROM partner_clinic_services pcs
      JOIN partner_clinics pc ON pc.id = pcs.clinic_id
      WHERE pcs.active = TRUE
        AND pc.active = TRUE
        AND pc.partner_status = 'active'
      ORDER BY pcs.display_price_thb, pcs.display_name
    `,
  );

  return clinics.map((clinic) => ({
    ...clinic,
    services: services.filter((service) => service.clinicId === clinic.id),
  }));
}

export async function getPartnerClinic(clinicId: string): Promise<PartnerClinicDto | undefined> {
  return (await listPartnerClinics()).find((clinic) => clinic.id === clinicId);
}

export async function listPartnerClinicSlots(clinicId: string): Promise<PartnerClinicSlotDto[]> {
  if (!process.env.DATABASE_URL) return demoSlots.filter((item) => item.clinicId === clinicId);

  return query<PartnerClinicSlotDto>(
    `
      SELECT
        id,
        clinic_id AS "clinicId",
        service_id AS "serviceId",
        starts_at AS "startsAt",
        capacity,
        GREATEST(0, capacity - booked_count) AS "availableCount"
      FROM partner_clinic_slots
      WHERE clinic_id = $1
        AND active = TRUE
        AND starts_at > now()
        AND booked_count < capacity
      ORDER BY starts_at
      LIMIT 20
    `,
    [clinicId],
  );
}

function slot(
  id: string,
  clinicId: string,
  serviceId: string,
  offsetHours: number,
  capacity: number,
): PartnerClinicSlotDto {
  return {
    id,
    clinicId,
    serviceId,
    startsAt: new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString(),
    capacity,
    availableCount: capacity,
  };
}
