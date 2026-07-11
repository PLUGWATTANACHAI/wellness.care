# Partner Clinic Architecture

This document defines the first production-ready shape for Wellnest partner clinic booking.

## Customer UX Flow

```text
Home
-> Partner Clinics
-> Clinic detail page
   - clinic promotion
   - clinic service/package list
-> Date/time
-> Confirm clinic, service, slot, price
-> Payment
```

## Database Tables

```text
partner_clinics
partner_clinic_services
partner_clinic_slots
bookings.partner_clinic_id
bookings.booking_channel
```

Purpose:
- `partner_clinics`: clinic profile, location, public copy, promotion copy.
- `partner_clinic_services`: services/packages available at each clinic.
- `partner_clinic_slots`: clinic capacity by service and time.
- `bookings.partner_clinic_id`: links a booking to the clinic.
- `bookings.booking_channel`: separates home-service bookings from partner-clinic bookings.

## API Endpoints

```text
GET /partner-clinics
GET /partner-clinics/:id
GET /partner-clinics/:id/slots
POST /bookings
```

`POST /bookings` accepts optional `partnerClinicId`.

## MVP Logic Still Needed

- Reserve and decrement `partner_clinic_slots.booked_count` inside the same transaction as booking creation.
- Validate that requested `serviceId` belongs to `partner_clinic_services` for the selected clinic.
- Add admin CRUD for partner clinics, clinic services, promotions, and slots.
- Decide whether partner clinics receive jobs in the provider app or a separate clinic portal.
- Add clinic cancellation rules and payment settlement logic.

## Privacy Notes

- Clinic bookings should not require continuous provider location sharing unless a provider travels to the customer.
- Customer home address is still needed for account safety/profile flows, but clinic bookings should display the clinic address as the service location.
- Consent copy must distinguish in-home service from clinic visit service.
