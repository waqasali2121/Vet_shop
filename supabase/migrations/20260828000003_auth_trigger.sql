-- Salman Farsy Veterinary Store POS - Auth User Profile Bootstrapping Trigger
-- Created: 2026-08-28

-- Trigger function to automatically create a public profile when a user signs up.
-- The first user to register is automatically granted the 'OWNER' role.
-- Subsequent users are initialized with the 'CASHIER' role (which can then be upgraded by the OWNER).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  assigned_role text;
begin
  -- Check if profiles is completely empty
  select count(*) = 0 into is_first_user from public.profiles;

  if is_first_user then
    assigned_role := 'OWNER';
  else
    assigned_role := 'CASHIER';
  end if;

  insert into public.profiles (id, email, first_name, last_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    assigned_role,
    true
  );
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger to auth.users table
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
