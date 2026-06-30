import { query } from "../../core/db/client";

export interface ServiceRow {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  priceTHB: number;
  active: boolean;
}

const demoServices: ServiceRow[] = [
  {
    id: "svc_massage_90",
    category: "Massage",
    name: "นวดคอ บ่า ไหล่ 90 นาที",
    durationMinutes: 90,
    priceTHB: 1290,
    active: true,
  },
  {
    id: "svc_beauty_90",
    category: "Beauty & Relax",
    name: "สปาเท้า + ทำเล็บ 90 นาที",
    durationMinutes: 90,
    priceTHB: 1590,
    active: true,
  },
  {
    id: "svc_product_sleep",
    category: "Wellness Products",
    name: "Aroma Sleep Set พร้อมจัดส่ง",
    durationMinutes: 0,
    priceTHB: 690,
    active: true,
  },
];

export async function listServices(): Promise<ServiceRow[]> {
  if (!process.env.DATABASE_URL) return demoServices;

  return query<ServiceRow>(
    `
      SELECT
        s.id,
        c.name AS category,
        s.name,
        s.duration_minutes AS "durationMinutes",
        s.price_thb AS "priceTHB",
        s.active
      FROM services s
      JOIN service_categories c ON c.id = s.category_id
      WHERE s.active = TRUE
      ORDER BY c.name, s.name
    `,
  );
}

