-- ==============================================================================
-- IV CONNECT — SEED: INDUSTRIAL VISIT 2026 (RAJASTHAN & DELHI)
-- ==============================================================================
-- Prerequisite: Run database/07_itineraries.sql first.
-- What this does:
--   Idempotently creates/replaces the published, active "Industrial Visit 2026"
--   itinerary (2026-12-05 to 2026-12-14) with Day 0..Day 9 and all stops.
--   After running this, upload Day Hero Photos directly in Admin -> Itinerary
--   Builder (/admin/itineraries) and adjust any TBC times as confirmed.
-- ==============================================================================

DO $$
DECLARE
  v_itinerary_id CONSTANT UUID := '20261205-0000-4000-8000-000000002026';
  v_day_id UUID;
BEGIN
  -- Ensure no other itinerary remains marked active
  UPDATE public.itineraries
  SET is_active = FALSE
  WHERE is_active = TRUE;

  -- Replace previous run of this seed if present (cascades days & stops)
  DELETE FROM public.itineraries
  WHERE id = v_itinerary_id;

  -- Create & publish the trip
  INSERT INTO public.itineraries (
    id,
    title,
    subtitle,
    start_date,
    end_date,
    status,
    is_active
  )
  VALUES (
    v_itinerary_id,
    'Industrial Visit 2026',
    'Kottayam → Ahmedabad → Udaipur → Pushkar → Jaipur → Agra → Delhi → Chennai → Kottayam',
    DATE '2026-12-05',
    DATE '2026-12-14',
    'published',
    TRUE
  );

  -- ----------------------------------------------------------------------------
  -- DAY 0 — 2026-12-05 | Kottayam – Departure
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 0, DATE '2026-12-05', 'Kottayam', 'Departure by Train (3 AC) towards Ahmedabad')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES (
    v_itinerary_id, v_day_id, 1, TIME '18:30', NULL, FALSE,
    'Board Train from Kottayam',
    'Kottayam Railway Station',
    'travel',
    'Board the train (3 AC) from Kottayam Railway Station and begin the overnight journey towards Ahmedabad.',
    TRUE
  );

  -- ----------------------------------------------------------------------------
  -- DAY 1 — 2026-12-06 | Train Journey
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 1, DATE '2026-12-06', 'Train Journey', 'Full day en route to Ahmedabad')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES (
    v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
    'Full-Day Train Journey towards Ahmedabad',
    'En route to Ahmedabad',
    'travel',
    'Full day travelling by train towards Ahmedabad. Overnight journey by train.',
    FALSE
  );

  -- ----------------------------------------------------------------------------
  -- DAY 2 — 2026-12-07 | Ahmedabad – Industrial Visit – Udaipur
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 2, DATE '2026-12-07', 'Ahmedabad', 'Industrial Visits & Travel to Udaipur')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, TIME '07:00', NULL, FALSE,
      'Arrival at Ahmedabad & Breakfast',
      'Ahmedabad',
      'travel',
      'Expected arrival at Ahmedabad, followed by fresh-up and breakfast.',
      FALSE
    ),
    (
      v_itinerary_id, v_day_id, 2, TIME '10:00', TIME '11:30', FALSE,
      'Industrial Visit: Odoo India Pvt. Ltd.',
      'Odoo India Pvt. Ltd., Infocity, Ahmedabad',
      'industry',
      'Industrial visit to Odoo India Pvt. Ltd., Infocity.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 3, TIME '11:30', TIME '12:00', FALSE,
      'Industrial Visit: Sense Electricals',
      'Sense Electricals, Ahmedabad',
      'industry',
      'Industrial visit to Sense Electricals.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 4, TIME '12:00', NULL, FALSE,
      'Depart Ahmedabad towards Udaipur',
      'Ahmedabad → Udaipur',
      'travel',
      'Depart from Ahmedabad towards Udaipur.',
      FALSE
    ),
    (
      v_itinerary_id, v_day_id, 5, TIME '16:00', NULL, FALSE,
      'Arrival at Udaipur & Hotel Check-in',
      'Udaipur',
      'stay',
      'Expected arrival at Udaipur. Hotel check-in, evening relaxation, and overnight stay.',
      FALSE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 3 — 2026-12-08 | Udaipur Sightseeing – Pushkar
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 3, DATE '2026-12-08', 'Udaipur', 'Udaipur Sightseeing & Pushkar Desert Camp')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
      'Udaipur Heritage Sightseeing',
      'City Palace, Lake Pichola, Bagore Ki Haveli, Ambrai Ghat, Saheliyon Ki Bari',
      'activity',
      'Explore the cultural heritage and scenic attractions of Udaipur: City Palace, Lake Pichola, Bagore Ki Haveli, Ambrai Ghat, and Saheliyon Ki Bari.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 2, NULL, NULL, TRUE,
      'Pushkar Sightseeing & Desert Camp',
      'Pushkar',
      'activity',
      'Pushkar sightseeing, local attractions, camel safari and desert activities, evening bonfire at the desert camp, and overnight stay at Pushkar.',
      TRUE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 4 — 2026-12-09 | Pushkar – Jaipur
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 4, DATE '2026-12-09', 'Jaipur', 'Pushkar to Jaipur (Pink City)')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
      'Breakfast & Departure towards Jaipur',
      'Pushkar → Jaipur',
      'travel',
      'Morning breakfast and departure from Pushkar towards Jaipur.',
      FALSE
    ),
    (
      v_itinerary_id, v_day_id, 2, NULL, NULL, TRUE,
      'Jaipur (Pink City) Sightseeing',
      'Hawa Mahal, Amber Fort, Jal Mahal, Patrika Gate',
      'activity',
      'Explore Jaipur, popularly known as the Pink City: Hawa Mahal, Amber Fort, Jal Mahal, Patrika Gate, plus optional Albert Hall Museum and Bhangarh Fort.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 3, NULL, NULL, TRUE,
      'Overnight Travel towards Agra',
      'Jaipur → Agra',
      'travel',
      'Overnight travel from Jaipur towards Agra.',
      FALSE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 5 — 2026-12-10 | Jaipur – Agra – Delhi
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 5, DATE '2026-12-10', 'Agra', 'Taj Mahal, Agra Fort & Travel to Delhi')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
      'Early Morning Departure to Agra',
      'Agra',
      'travel',
      'Early morning travel towards Agra.',
      FALSE
    ),
    (
      v_itinerary_id, v_day_id, 2, NULL, NULL, TRUE,
      'Agra Sightseeing: Taj Mahal & Agra Fort',
      'Taj Mahal, Agra Fort (Optional: Mehtab Bagh)',
      'activity',
      'Visit the Taj Mahal, Agra Fort, and optionally Mehtab Bagh.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 3, NULL, NULL, TRUE,
      'Depart Agra for Delhi & Overnight Stay',
      'Delhi',
      'stay',
      'After sightseeing in Agra, depart towards Delhi. Arrival at Delhi and overnight stay.',
      FALSE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 6 — 2026-12-11 | Delhi Sightseeing – Departure to Chennai
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 6, DATE '2026-12-11', 'Delhi', 'IIT Delhi, Sightseeing & Train to Chennai')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
      'Industrial Visit: IIT Delhi',
      'IIT Delhi',
      'industry',
      'Industrial and campus visit at IIT Delhi.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 2, NULL, NULL, TRUE,
      'Delhi Sightseeing & Local Markets',
      'Red Fort, Jama Masjid, Humayun''s Tomb, Qutab Minar',
      'activity',
      'Visit Red Fort, Jama Masjid, Humayun''s Tomb, Qutab Minar, and local markets.',
      TRUE
    ),
    (
      v_itinerary_id, v_day_id, 3, TIME '21:00', NULL, FALSE,
      'Board Train from Delhi towards Chennai',
      'Delhi',
      'travel',
      'Board the train from Delhi towards Chennai. Overnight journey by train.',
      FALSE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 7 — 2026-12-12 | Train Journey (Delhi – Chennai)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 7, DATE '2026-12-12', 'Train Journey', 'Full day en route to Chennai')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES (
    v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
    'Full-Day Train Journey towards Chennai',
    'En route to Chennai',
    'travel',
    'Full day travelling by train from Delhi towards Chennai. Overnight journey by train.',
    FALSE
  );

  -- ----------------------------------------------------------------------------
  -- DAY 8 — 2026-12-13 | Chennai Arrival
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 8, DATE '2026-12-13', 'Chennai', 'Arrival & Return Journey towards Kottayam')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES
    (
      v_itinerary_id, v_day_id, 1, TIME '07:00', NULL, FALSE,
      'Expected Arrival at Chennai & Breakfast',
      'Chennai',
      'travel',
      'Expected arrival at Chennai, followed by fresh-up and breakfast.',
      FALSE
    ),
    (
      v_itinerary_id, v_day_id, 2, NULL, NULL, TRUE,
      'Travel from Chennai towards Kottayam',
      'Chennai → Palakkad → Kottayam',
      'travel',
      'Travel from Chennai towards Kottayam (train till Palakkad and tourist bus for the rest of the journey).',
      FALSE
    );

  -- ----------------------------------------------------------------------------
  -- DAY 9 — 2026-12-14 | Chennai – Kottayam
  -- ----------------------------------------------------------------------------
  INSERT INTO public.itinerary_days (itinerary_id, day_number, date, title, subtitle)
  VALUES (v_itinerary_id, 9, DATE '2026-12-14', 'Kottayam', 'Early Morning Arrival at Saintgits')
  RETURNING id INTO v_day_id;

  INSERT INTO public.itinerary_stops (
    itinerary_id, day_id, sequence_no, start_time, end_time, time_tbc,
    title, location, category, description, is_highlight
  )
  VALUES (
    v_itinerary_id, v_day_id, 1, NULL, NULL, TRUE,
    'Early Morning Arrival at Kottayam',
    'Saintgits, Kottayam',
    'travel',
    'Early morning arrival back at Kottayam (Saintgits).',
    TRUE
  );
END $$;
