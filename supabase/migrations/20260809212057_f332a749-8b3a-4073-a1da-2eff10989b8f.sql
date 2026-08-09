insert into public.user_roles (user_id, role)
select '1789c042-dd3f-4bfc-874d-d41038075e1c'::uuid, 'admin'::app_role
where not exists (
  select 1 from public.user_roles
  where user_id = '1789c042-dd3f-4bfc-874d-d41038075e1c'::uuid and role = 'admin'::app_role
);

update public.ss_staff
set user_id = '1789c042-dd3f-4bfc-874d-d41038075e1c'::uuid, level = 'owner'::ss_level
where lower(email) = 'admin@savvyswim.com';

insert into public.ss_staff (email, full_name, level, user_id)
select 'admin@savvyswim.com', 'Savvy Admin', 'owner'::ss_level, '1789c042-dd3f-4bfc-874d-d41038075e1c'::uuid
where not exists (select 1 from public.ss_staff where lower(email) = 'admin@savvyswim.com');