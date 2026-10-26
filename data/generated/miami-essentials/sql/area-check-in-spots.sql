-- Area quests: add check-in spots and publish (17 quests). Run once in the Supabase SQL editor.
-- Scoped to the Miami Essentials partner; aborts unless exactly 17 quests match. Idempotent.
begin;

create temp table _spots (id uuid primary key, action_prompt text, location_label text) on commit drop;
insert into _spots values
  ('a381c105-e7c1-57e0-b0a7-c3dd40facf0d'::uuid, $q$Check-in spot: NW 2nd Ave at NW 25th St, by the Wynwood Walls entrance (2520 NW 2nd Ave). Completion is verified within 150 m of it, so finish there and tap Complete. Walk the public sidewalks around NW 2nd Ave and find three different murals that catch your eye. Capture your favorite of the three in the app. Stay on sidewalks — no climbing, no private lots, and keep strangers out of the frame unless they agree. The ticketed Wynwood Walls garden is optional and not required. Collector bonus idea (not a second reward): keep going to ten.$q$, $q$Wynwood Walls block, NW 2nd Ave & NW 25th St$q$),
  ('b6afd6c6-b2fe-5d5d-b87e-9476d2d0e3e0'::uuid, $q$Check-in spot: SW 8th St at SW 15th Ave, by Máximo Gómez (Domino) Park. Completion is verified within 150 m of it, so finish there and tap Complete. Walk the sidewalk on SW 8th St between roughly SW 12th and 17th Ave and look down. Find Celia Cruz's star and four other stars. Capture a photo of Celia Cruz's star in the app and note the other four names. Stay on the sidewalk and watch for foot traffic and storefront entrances.$q$, $q$Calle Ocho at SW 15th Ave$q$),
  ('94c9735f-d3e8-5592-8dcd-602aca691e32'::uuid, $q$Check-in spot: Peacock Park, 2820 McFarlane Rd. Completion is verified within 150 m of it, so finish there and tap Complete. Explore Peacock Park and the surrounding public streets of Coconut Grove until you find a banyan that impresses you. Photograph it from a path or sidewalk. Don't climb the tree, stand inside its roots, or step into planted areas or private yards.$q$, $q$Peacock Park$q$),
  ('2f25c472-b03a-52ef-8296-f1694f2c1301'::uuid, $q$Check-in spot: the Art Deco Welcome Center, 1001 Ocean Dr. Completion is verified within 150 m of it, so finish there and tap Complete. Starting near the Art Deco Welcome Center on Ocean Drive, walk the district's public sidewalks on Ocean Drive and Collins Ave and find buildings in four colors: pink, mint, yellow and blue. Capture your favorite facade in the app and note the other three. Stay on public sidewalks and don't block hotel or restaurant entrances.$q$, $q$Art Deco Welcome Center$q$),
  ('bfe92456-8cf9-5b14-9db3-bae12d3068ec'::uuid, $q$Check-in spot: the South Pointe Park Pier entrance, 1 Washington Ave. Completion is verified within 150 m of it, so finish there and tap Complete. Check today's sunrise time and the park's posted opening hours first. Watch the sun come up from South Pointe Park — from the pier only if it's open at that hour, otherwise from the park's waterfront walk. Capture the sunrise in the app. Don't enter closed areas or climb railings.$q$, $q$South Pointe Park Pier$q$),
  ('7c0ed3dd-f1e6-53e7-a681-0e86f9fec64a'::uuid, $q$Check-in spot: the Lummus Park Beachwalk at 10th Street, across from the Art Deco Welcome Center. Completion is verified within 150 m of it, so finish there and tap Complete. Walk the beach or the Lummus Park Beachwalk and find five different lifeguard towers. Capture your favorite in the app and note the other four (color or nearby street). Don't climb towers, enter them, or distract lifeguards on duty, and keep beachgoers out of the frame unless they agree. Bring water and sun protection.$q$, $q$Lummus Park at 10th St$q$),
  ('1fe64bdb-f388-59b0-8263-b79ff9892fed'::uuid, $q$Check-in spot: the park's kayak ramp on the Rocky Mile Trail; launch and land there. Completion is verified within 150 m of it, so finish there and tap Complete. Enter the park (entry fee applies), rent or bring a kayak or paddleboard with required safety gear, and paddle a marked mangrove trail suitable for your skill. Capture a photo of the mangroves from your craft. Wildlife sightings are not required — give any animals space and never approach or feed them.$q$, $q$Oleta kayak ramp$q$),
  ('fc6a06c1-504d-58cd-a2ed-9c282e174c22'::uuid, $q$Check-in spot: the Lagoon Path beside the atoll pool. Completion is verified within 150 m of it, so finish there and tap Complete. Enter Matheson Hammock Park (parking fee applies) and find the atoll pool area. Photograph the pool and skyline from the shore or a path — entering the water is never required. If you do swim, only in designated, lifeguarded areas following current advisories.$q$, $q$Matheson Hammock atoll pool$q$),
  ('e840a7b2-f9e7-5257-84e3-079d151991d7'::uuid, $q$Check-in spot: the Miami Beach end of the Venetian Causeway, on Venetian Way. Completion is verified within 150 m of it, so finish there and tap Complete. Start on the Miami side and cross the Venetian Causeway on the sidewalk or bike lane to its Miami Beach end. Capture a photo of the bay view at the Miami Beach end. Use marked crossings, follow traffic rules, never walk in traffic lanes, and carry water.$q$, $q$Venetian Causeway, Miami Beach end$q$),
  ('dadfb861-1ca4-511b-bab3-9b75930fcdea'::uuid, $q$Check-in spot: the Light Tower in Bayfront Park, 301 Biscayne Blvd. Completion is verified within 150 m of it, so finish there and tap Complete. Visit Bayfront Park after sunset during open hours and find a skyline view you like. Capture it in the app. Stay in lit, open areas and keep strangers out of the frame unless they agree.$q$, $q$Bayfront Park Light Tower$q$),
  ('b7155548-b8e2-5268-9708-1e90a04cf713'::uuid, $q$Check-in spot: the center of Brickell Key, on Brickell Key Dr. Completion is verified within 150 m of it, so finish there and tap Complete. Cross the bridge to Brickell Key and walk the public waterfront path. Capture your favorite bay or skyline view. Stay on public paths and respect residential and private property.$q$, $q$Brickell Key, center of the island$q$),
  ('d9026833-921c-5e6d-8c78-0ae16311b110'::uuid, $q$Check-in spot: the Hobie Island Beach Park parking area on the Rickenbacker Causeway. Completion is verified within 150 m of it, so finish there and tap Complete. Visit Hobie Island Beach Park on the Rickenbacker Causeway around golden hour. Park only in designated areas, never stop on the causeway, and capture the sunset over the skyline from the beach.$q$, $q$Hobie Island Beach Park$q$),
  ('ec77306c-c4cf-5d15-8a0e-5e2dd1b9876c'::uuid, $q$Check-in spot: the Brickell Backyard on The Underline's M-Path, by the restrooms. Completion is verified within 150 m of it, so finish there and tap Complete. Explore a short open stretch of The Underline's Brickell Backyard, between the Miami River and SW 13th St. Photograph one garden or public-art detail worth stopping for. Use marked crossings and stay on open paths.$q$, $q$Brickell Backyard on the M-Path$q$),
  ('297aedfe-05b7-50d8-8cac-048777e3d62c'::uuid, $q$Check-in spot: Lincoln Road at Meridian Avenue. Completion is verified within 150 m of it, so finish there and tap Complete. Walk an open segment of the Lincoln Road pedestrian mall and find an interesting design detail that isn't a store logo — a pattern, shape, or piece of streetscape. Capture it. Follow posted pedestrian routes around any redevelopment work.$q$, $q$Lincoln Road at Meridian Ave$q$),
  ('ac71c45b-1fd6-5d7a-be99-0df354518a95'::uuid, $q$Check-in spot: Vizcaya's entrance on South Miami Avenue (3251 S Miami Ave). Completion is verified within 150 m of it, so finish there and tap Complete. With museum admission, find a permitted garden viewpoint and frame it through architecture or greenery without leaving the path. Capture it where photography is allowed, or submit a short description if photography is restricted. Don't climb, sit on statuary, or enter planted areas.$q$, $q$Vizcaya entrance, 3251 S Miami Ave$q$),
  ('91ed19c2-18dc-510e-a06e-fc2ffa6f78ad'::uuid, $q$Check-in spot: Fairchild's visitor entrance, 10901 Old Cutler Rd. Completion is verified within 150 m of it, so finish there and tap Complete. With garden admission, explore the visitor paths and find three different leaf shapes. Photograph your favorite plant without touching it, and optionally describe the other two shapes. No particular animal, bloom or seasonal exhibit is required.$q$, $q$Fairchild visitor entrance$q$),
  ('fa027223-299c-5ace-b8c5-70a046606429'::uuid, $q$Check-in spot: the Biscayne Nature Center, 6767 Crandon Blvd. Completion is verified within 150 m of it, so finish there and tap Complete. Start at the Biscayne Nature Center (free admission; park parking fee may apply). Follow a short, open nature route and photograph one coastal landscape or plant detail. Stay on paths and follow posted wildlife rules — no wildlife sighting required.$q$, $q$Biscayne Nature Center$q$);

do $$ begin
  if (select count(*) from public.quests q join _spots s using (id)
      where q.partner_id = 'c0d0c314-fd9c-57c7-8403-3b0c283d905b') <> 17 then
    raise exception 'expected 17 Miami Essentials area quests — nothing changed';
  end if;
end $$;

update public.quests q
   set action_prompt = s.action_prompt, location_label = s.location_label
  from _spots s
 where q.id = s.id and q.partner_id = 'c0d0c314-fd9c-57c7-8403-3b0c283d905b';

-- Oleta: move the anchor from the park centroid to the kayak ramp (OSM node 2728007023).
update public.venues
   set latitude = 25.913590, longitude = -80.130608
 where id = 'f89b4158-d25f-5d0f-af0b-b248ae0dc1a1' and partner_id = 'c0d0c314-fd9c-57c7-8403-3b0c283d905b';

update public.quests q
   set status = 'active'
  from _spots s
 where q.id = s.id and q.partner_id = 'c0d0c314-fd9c-57c7-8403-3b0c283d905b' and q.status = 'draft';

select q.title, q.status, q.location_label, q.verification_radius_m, v.latitude, v.longitude
  from public.quests q join _spots s using (id) join public.venues v on v.id = q.venue_id
 order by q.title;
commit;
