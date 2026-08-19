revoke all on function public.ss_tg_quote_item_sync_contract() from public, anon, authenticated;
revoke all on function public.ss_tg_quote_sync_contract() from public, anon, authenticated;
revoke all on function public.ss_tg_quote_template_sync() from public, anon, authenticated;

drop policy if exists "office write equipment photos" on storage.objects;
create policy "office write equipment photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'equipment-photos' and public.ss_is_office());

drop policy if exists "staff manage service photos" on storage.objects;

create policy "staff read service photos"
on storage.objects for select to authenticated
using (bucket_id = 'service-photos' and public.ss_is_staff());

create policy "staff upload assigned service photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'service-photos'
  and (
    public.ss_is_office()
    or exists (
      select 1 from public.ss_visits v
      where v.tech_id = public.ss_my_staff_id()
        and v.customer_id::text = (storage.foldername(name))[1]
    )
  )
);

create policy "office update service photos"
on storage.objects for update to authenticated
using (bucket_id = 'service-photos' and public.ss_is_office())
with check (bucket_id = 'service-photos' and public.ss_is_office());

create policy "office delete service photos"
on storage.objects for delete to authenticated
using (bucket_id = 'service-photos' and public.ss_is_office());