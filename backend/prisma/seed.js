// Seed: date inventate pentru dezvoltare și demo.
// ATENȚIE: șterge toate datele din tabele și le creează din nou.
// Rulare: npm run seed
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { dbWriteCheck } from '../src/lib/dbWriteGuard.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed-ul nu rulează în producție (NODE_ENV=production).');
  process.exit(1);
}
if (!process.env.SEED_PASSWORD) {
  console.error('Lipsește SEED_PASSWORD în .env');
  process.exit(1);
}

// Seed-ul ȘTERGE toate datele: rulează doar pe baza aleasă explicit în .env (DB_WRITE_HOST).
// Afișăm doar host-ul (fără parolă), ca să fie evident dacă e ramura Neon "dev" sau altceva.
const dbCheck = dbWriteCheck();
if (!dbCheck.allowed) {
  console.error(`Seed oprit, nu s-a șters nimic: ${dbCheck.reason}.`);
  console.error('Pune în .env DB_WRITE_HOST = host-ul bazei pe care vrei seed-ul (vezi .env.example).');
  process.exit(1);
}
console.log(`Seed pe baza de date: ${dbCheck.host}`);

const prisma = new PrismaClient();

const USERS = [
  { email: 'admin@puntobianco.demo', fullName: 'Elena Popescu', role: 'ADMIN' },
  { email: 'coordonator1@puntobianco.demo', fullName: 'Ana Ciobanu', role: 'COORDONATOR' },
  { email: 'coordonator2@puntobianco.demo', fullName: 'Mihai Rusu', role: 'COORDONATOR' },
  { email: 'backoffice@puntobianco.demo', fullName: 'Irina Lungu', role: 'BACK_OFFICE' },
  { email: 'cazari@puntobianco.demo', fullName: 'Victor Munteanu', role: 'MANAGER_CAZARI' },
  { email: 'sofer1@puntobianco.demo', fullName: 'Andrei Cojocaru', role: 'SOFER' },
  { email: 'sofer2@puntobianco.demo', fullName: 'Sergiu Botnaru', role: 'SOFER' },
  { email: 'contabil@puntobianco.demo', fullName: 'Natalia Ceban', role: 'CONTABIL' },
  { email: 'calitate@puntobianco.demo', fullName: 'Olga Moraru', role: 'CONTROL_CALITATE' },
];

// Data relativă la ziua rulării: day(2, 14, 30) = peste 2 zile, ora 14:30
function day(offset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// coordinator: 1 sau 2. companion.treatment lipsă = însoțitor fără tratament.
const VISITS = [
  {
    coordinator: 1,
    arrivalAt: day(-3, 14, 30), departureAt: day(4, 10, 0),
    patient: { firstName: 'Marco', lastName: 'Rossi', treatment: 'Implant dentar maxilar superior (2 implanturi)', availability: 'Disponibil toată ziua' },
    accommodation: { apartmentType: 'STUDIO', isFree: true, freeDays: 7, status: 'REZERVAT' },
    transfer: { direction: 'DUS_INTORS', isFree: true },
    backOfficeStatus: 'FINALIZAT',
  },
  {
    coordinator: 2,
    arrivalAt: day(-1, 11, 15), departureAt: day(6, 16, 45),
    patient: { firstName: 'Anna', lastName: 'Schmidt', treatment: 'Fațete ceramice frontale (8 dinți)', availability: 'Doar dimineața, până la 13:00' },
    companion: { firstName: 'Thomas', lastName: 'Schmidt', treatment: 'Igienizare profesională + albire', availability: 'Flexibil' },
    accommodation: { apartmentType: 'DOUA_DORMITOARE', isFree: true, freeDays: 5, status: 'REZERVAT' },
    transfer: { direction: 'DUS_INTORS', isFree: false },
    backOfficeStatus: 'INCEPUT',
  },
  {
    coordinator: 1,
    arrivalAt: day(1, 9, 40), departureAt: day(8, 18, 20),
    patient: { firstName: 'James', lastName: 'Walker', treatment: 'Coroane din zirconiu (4 dinți)', availability: 'Indisponibil în a treia zi (excursie)' },
    companion: { firstName: 'Emily', lastName: 'Walker' },
    accommodation: { apartmentType: 'UN_DORMITOR_DIVAN', isFree: false, status: 'NEPRELUCRAT' },
    transfer: { direction: 'SOSIRE', isFree: true },
  },
  {
    coordinator: 2,
    arrivalAt: day(2, 14, 30), departureAt: day(5, 12, 0),
    patient: { firstName: 'Sophie', lastName: 'Martin', treatment: 'Tratament endodontic molar + obturație', availability: 'După-amiaza, după 14:00' },
    transfer: { direction: 'DUS_INTORS', isFree: true },
  },
  {
    coordinator: 1,
    arrivalAt: day(4, 22, 10), departureAt: day(12, 6, 30),
    patient: { firstName: 'David', lastName: 'Cohen', treatment: 'Proteză fixă pe implanturi (All-on-4), maxilar inferior', availability: 'Disponibil toată ziua, exceptând sâmbăta' },
    companion: { firstName: 'Sarah', lastName: 'Cohen', treatment: 'Consultație + radiografie panoramică', availability: 'Disponibilă toată ziua' },
    accommodation: { apartmentType: 'DOUA_DORMITOARE_LIVING', isFree: true, freeDays: 7, status: 'NEPRELUCRAT' },
    transfer: { direction: 'DUS_INTORS', isFree: true },
  },
  {
    coordinator: 2,
    arrivalAt: day(5, 13, 5), departureAt: day(14, 10, 0),
    patient: { firstName: 'Michael', lastName: 'Johnson', treatment: 'Reabilitare orală completă – etapa 1 (extracții + implanturi)', availability: 'Flexibil' },
    accommodation: { apartmentType: 'STUDIO', isFree: false, status: 'NEPRELUCRAT' },
    transfer: { direction: 'PLECARE', isFree: false },
  },
  {
    coordinator: 1,
    arrivalAt: day(7, 10, 0), departureAt: day(10, 19, 30),
    patient: { firstName: 'Giulia', lastName: 'Bianchi', treatment: 'Extracție molar de minte + igienizare', availability: 'Dimineața' },
    accommodation: { apartmentType: 'STUDIO', isFree: true, freeDays: 3, status: 'NEPRELUCRAT' },
  },
  {
    coordinator: 2,
    arrivalAt: day(9, 14, 30), departureAt: day(16, 11, 15),
    patient: { firstName: 'Lukas', lastName: 'Müller', treatment: 'Implant unitar + coroană ceramică', availability: 'Disponibil toată ziua' },
    companion: { firstName: 'Maria', lastName: 'Müller' },
    accommodation: { apartmentType: 'UN_DORMITOR_DIVAN', isFree: true, freeDays: 7, status: 'NEPRELUCRAT' },
    transfer: { direction: 'DUS_INTORS', isFree: true },
  },
  {
    coordinator: 1,
    arrivalAt: day(12, 8, 50), departureAt: day(19, 15, 0),
    patient: { firstName: 'Oliver', lastName: 'Brown', treatment: 'Albire profesională + igienizare', availability: 'După-amiaza' },
  },
  {
    coordinator: 2,
    arrivalAt: day(14, 17, 25), departureAt: day(21, 9, 45),
    patient: { firstName: 'Claire', lastName: 'Dubois', treatment: 'Fațete compozit (6 dinți)', availability: 'Indisponibilă în prima zi după sosire' },
    companion: { firstName: 'Pierre', lastName: 'Dubois', treatment: 'Coroană zirconiu (1 dinte)', availability: 'Flexibil' },
    accommodation: { apartmentType: 'DOUA_DORMITOARE', isFree: false, status: 'NEPRELUCRAT' },
    transfer: { direction: 'SOSIRE', isFree: false },
  },
];

function personData(person, isCompanion) {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    isCompanion,
    availability: person.availability ?? null,
    ...(person.treatment && { treatment: { create: { description: person.treatment } } }),
  };
}

async function main() {
  // Ordinea contează: întâi tabelele care depind de altele
  await prisma.notification.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.accommodation.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD, 10);

  const users = {};
  for (const u of USERS) {
    users[u.email] = await prisma.user.create({ data: { ...u, passwordHash } });
  }
  const coordinators = {
    1: users['coordonator1@puntobianco.demo'],
    2: users['coordonator2@puntobianco.demo'],
  };

  for (const v of VISITS) {
    const coordinator = coordinators[v.coordinator];
    const status = v.backOfficeStatus ?? 'NEPRELUAT';

    await prisma.visit.create({
      data: {
        arrivalAt: v.arrivalAt,
        departureAt: v.departureAt,
        hasCompanion: Boolean(v.companion),
        coordinatorId: coordinator.id,
        createdById: coordinator.id,
        backOfficeStatus: status,
        backOfficeStartedAt: status !== 'NEPRELUAT' ? day(-2, 10) : null,
        backOfficeFinishedAt: status === 'FINALIZAT' ? day(-1, 17) : null,
        patients: {
          create: [personData(v.patient, false), ...(v.companion ? [personData(v.companion, true)] : [])],
        },
        ...(v.accommodation && {
          accommodation: {
            create: {
              ...v.accommodation,
              freeDays: v.accommodation.freeDays ?? null,
              reservedAt: v.accommodation.status === 'REZERVAT' ? day(-4, 12) : null,
            },
          },
        }),
        ...(v.transfer && { transfer: { create: v.transfer } }),
      },
    });
  }

  console.log(`Seed gata: ${USERS.length} utilizatori, ${VISITS.length} vizite.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
