-- =====================================================================
-- reserva-app · Script de actualización
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- Es seguro volver a ejecutarlo (usa IF NOT EXISTS / DROP...IF EXISTS
-- en todas partes), así que si algo falla a mitad de camino puedes
-- corregir y correrlo de nuevo sin miedo a duplicar cosas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PLANES DE CUENTA (accounts)
--    esencial -> 1 profesional
--    equipo   -> hasta 3 profesionales
--    clinico  -> entre 3 y 5 profesionales
-- ---------------------------------------------------------------------

alter table public.accounts
  add column if not exists plan_name text not null default 'esencial',
  add column if not exists max_professionals int not null default 1;

-- Si tenías nombres de plan antiguos, los migramos a los nuevos:
update public.accounts set plan_name = 'esencial' where plan_name in ('básico', 'basico', 'independiente');
update public.accounts set plan_name = 'equipo'   where plan_name in ('plata');
update public.accounts set plan_name = 'clinico'  where plan_name in ('max', 'clínico');

-- Aseguramos que cada plan tenga un tope de profesionales coherente
alter table public.accounts drop constraint if exists accounts_plan_check;
alter table public.accounts add constraint accounts_plan_check check (
  (plan_name = 'esencial' and max_professionals = 1) or
  (plan_name = 'equipo'   and max_professionals between 1 and 3) or
  (plan_name = 'clinico'  and max_professionals between 3 and 5)
);

-- ---------------------------------------------------------------------
-- 2) FICHA CLÍNICA PODOLÓGICA (patients)
--    conditions / conditions_notes ya existían (checklist de patologías).
--    Se agregan tratamientos recomendados y control de evolución.
-- ---------------------------------------------------------------------

alter table public.patients
  add column if not exists conditions jsonb not null default '[]'::jsonb,
  add column if not exists conditions_notes text,
  add column if not exists treatment_recommendations jsonb not null default '[]'::jsonb,
  add column if not exists treatment_notes text,
  add column if not exists progress_level text not null default 'inicial',
  add column if not exists improvement_status text not null default 'sin_evaluar',
  add column if not exists estimated_duration_weeks int;

alter table public.patients drop constraint if exists patients_progress_level_check;
alter table public.patients add constraint patients_progress_level_check
  check (progress_level in ('inicial', 'en_tratamiento', 'buena_evolucion', 'estancado', 'alta'));

alter table public.patients drop constraint if exists patients_improvement_status_check;
alter table public.patients add constraint patients_improvement_status_check
  check (improvement_status in ('sin_evaluar', 'empeora', 'igual', 'mejora_leve', 'mejora_notoria', 'resuelto'));

-- ---------------------------------------------------------------------
-- 3) REGISTRO CRONOLÓGICO POR SESIÓN (clinical_notes)
--    Cada entrada ahora puede indicar qué tratamientos se aplicaron esa
--    sesión y el número de sesión (se autocalcula si no se envía).
-- ---------------------------------------------------------------------

alter table public.clinical_notes
  add column if not exists session_number int,
  add column if not exists treatments_applied jsonb not null default '[]'::jsonb,
  add column if not exists progress_level text,
  add column if not exists improvement_status text;

create or replace function public.set_clinical_note_session_number()
returns trigger
language plpgsql
as $$
begin
  if new.session_number is null then
    select count(*) + 1 into new.session_number
    from public.clinical_notes
    where patient_id = new.patient_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_session_number on public.clinical_notes;
create trigger trg_set_session_number
  before insert on public.clinical_notes
  for each row execute function public.set_clinical_note_session_number();

-- ---------------------------------------------------------------------
-- 4) JERARQUÍA: el dueño (owner) de la cuenta puede administrar los
--    datos de TODOS los profesionales de su misma cuenta (planes Equipo
--    y Clínico). Se hace con una función auxiliar + políticas RLS
--    adicionales, SIN tocar las políticas "_own" que ya existían.
-- ---------------------------------------------------------------------

create or replace function public.is_owner_of_professional(p_professional_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles owner_profile
    join public.profiles target_profile
      on target_profile.account_id = owner_profile.account_id
    where owner_profile.id = auth.uid()
      and owner_profile.role = 'owner'
      and target_profile.id = p_professional_id
  );
$$;

-- appointments
drop policy if exists "owner_equipo_appointments" on public.appointments;
create policy "owner_equipo_appointments" on public.appointments
  for all to authenticated
  using (professional_id = auth.uid() or public.is_owner_of_professional(professional_id))
  with check (professional_id = auth.uid() or public.is_owner_of_professional(professional_id));

-- availability
drop policy if exists "owner_equipo_availability" on public.availability;
create policy "owner_equipo_availability" on public.availability
  for all to authenticated
  using (professional_id = auth.uid() or public.is_owner_of_professional(professional_id))
  with check (professional_id = auth.uid() or public.is_owner_of_professional(professional_id));

-- blocked_slots
drop policy if exists "owner_equipo_blocked_slots" on public.blocked_slots;
create policy "owner_equipo_blocked_slots" on public.blocked_slots
  for all to authenticated
  using (professional_id = auth.uid() or public.is_owner_of_professional(professional_id))
  with check (professional_id = auth.uid() or public.is_owner_of_professional(professional_id));

-- patients
drop policy if exists "owner_equipo_patients" on public.patients;
create policy "owner_equipo_patients" on public.patients
  for all to authenticated
  using (professional_id = auth.uid() or public.is_owner_of_professional(professional_id))
  with check (professional_id = auth.uid() or public.is_owner_of_professional(professional_id));

-- clinical_notes (se relaciona por patient_id -> patients.professional_id)
create or replace function public.is_owner_of_patient(p_patient_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (p.professional_id = auth.uid() or public.is_owner_of_professional(p.professional_id))
  );
$$;

drop policy if exists "owner_equipo_clinical_notes" on public.clinical_notes;
create policy "owner_equipo_clinical_notes" on public.clinical_notes
  for all to authenticated
  using (public.is_owner_of_patient(patient_id))
  with check (public.is_owner_of_patient(patient_id));

-- ---------------------------------------------------------------------
-- Notas finales:
-- - Si tu función create_account_and_owner_profile() define un
--   plan_name por defecto distinto a 'esencial', actualízala manualmente
--   en Database → Functions para que use el nuevo nombre de plan.
-- - Los cupos de profesionales (max_professionals) los sigues editando
--   tú a mano en la tabla accounts, como ya lo hacías.
-- =====================================================================
