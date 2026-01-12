-- Seed Waypoint Explanation Templates
-- Research-backed explanations for key emotional transition patterns
-- Date: 2025-12-05

-- Template 1: Shame → Vulnerability (Brown 2012) - CRITICAL for shame healing
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Shame'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Vulnerability'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Self-Compassion'),
    
    'Vulnerability is the critical zero-crossing on the Connection axis where shame begins to heal. It represents the moment you risk being truly seen by a trusted other, shifting from isolation (-0.9 connection) toward positive connection (+0.6 connection).',
    
    'Shame cannot heal in isolation. Vulnerability must precede self-compassion because we first need to experience being seen and accepted by another before we can offer that same acceptance to ourselves. This is Brené Brown''s core finding on shame resilience.',
    
    'Vulnerability creates the relational foundation necessary for self-compassion. When someone else shows us we''re worthy of compassion despite our shame, we internalize that we can offer ourselves that same kindness.',
    
    ARRAY[
        'Shifted from isolation to openness with trusted other',
        'Reduced self-judgment and worthlessness feelings',
        'Began to feel safe being seen rather than hiding',
        'Connected with someone rather than withdrawing'
    ],
    
    'Shame thrives in secrecy and isolation. Vulnerability breaks the isolation that keeps shame alive. As Brown states: "If we share our shame story with the wrong person, they can easily become one more piece of flying debris in an already dangerous storm. If we share our story with someone who has earned the right to hear it, shame can''t survive."',
    
    ARRAY[
        'Self-kindness vs self-judgment',
        'Common humanity vs isolation (Neff''s components)',
        'Mindfulness vs over-identification',
        'Ability to offer yourself compassion'
    ],
    
    'Vulnerability creates the experiential foundation for self-compassion. When someone else shows us we''re worthy of compassion despite our shame, we internalize that we can offer ourselves that same kindness.',
    
    ARRAY[
        'Feeling less isolated or alone with your shame',
        'Willingness to share your struggle with a trusted person',
        'Reduced intensity of shame (not gone, but lessened)',
        'Beginning to feel safe enough to be seen',
        'Decreased fear of judgment or rejection',
        'Recognition that you''re not the only one who struggles'
    ],
    
    ARRAY[
        '⚠️ If completely alone: Find a safe, trusted person first',
        '⚠️ If shame triggers active: Pause, regulate arousal first',
        '⚠️ If trauma history: Work with trauma-informed therapist',
        '⚠️ Do not vulnerability-dump without consent',
        '⚠️ If dissociating: Ground first, be present before sharing'
    ],
    
    '[
        {
            "author": "Brené Brown",
            "year": 2012,
            "work": "Daring Greatly",
            "key_finding": "Vulnerability is the birthplace of connection, joy, belonging. Shame cannot survive being spoken."
        },
        {
            "author": "Kristin Neff",
            "year": 2003,
            "work": "Self-Compassion: An Alternative Conceptualization",
            "key_finding": "Self-compassion requires common humanity - vulnerability provides this experience."
        }
    ]'::jsonb,
    
    200  -- High priority
);

-- Template 2: Vulnerability → Compassion (Brown 2012)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Shame'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Vulnerability'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Compassion'),
    
    'Vulnerability is the gateway from shame to compassion. It shifts you from "I am bad" (shame) to "I am human and deserve kindness" (compassion). The connection axis jump (+1.5) is the therapeutic key.',
    
    'You cannot move from shame directly to compassion without vulnerability. Shame keeps you isolated and self-judging. Vulnerability opens you to connection, which then allows compassion (feeling WITH rather than FOR).',
    
    'Vulnerability enables the shift from self-judgment to compassion by allowing you to experience being worthy of love despite imperfection.',
    
    ARRAY[
        'Moved from hiding to being seen by safe other',
        'Experienced acceptance despite imperfection',
        'Reduced isolation and worthlessness',
        'Beginning to feel human and flawed is okay'
    ],
    
    'Brené Brown''s research shows shame requires secrecy, silence, and judgment. Vulnerability - being seen authentically - is the antidote. Only after experiencing this can we internalize compassion.',
    
    ARRAY[
        'Ability to feel WITH others (not just FOR them)',
        'Recognition of shared human experience',
        'Capacity to extend kindness to self and others',
        'Movement beyond pity to true compassion'
    ],
    
    'Once you''ve experienced that vulnerability brings connection (not rejection), you can extend that same acceptance to yourself and genuinely to others.',
    
    ARRAY[
        'Safe person has shown you acceptance',
        'Shame intensity has lessened',
        'You can see your humanity (not just your flaws)',
        'Connection feels possible, not terrifying',
        'Self-judgment has softened'
    ],
    
    ARRAY[
        '⚠️ Ensure you have a safe, trustworthy person',
        '⚠️ Don''t rush - shame healing takes time',
        '⚠️ If re-shamed by someone: This is about them, not you',
        '⚠️ Professional support helpful for deep shame work'
    ],
    
    '[
        {
            "author": "Brené Brown",
            "year": 2012,
            "work": "Daring Greatly",
            "key_finding": "Compassion is not a relationship between the healer and the wounded. It''s a relationship between equals."
        }
    ]'::jsonb,
    
    200
);

-- Template 3: Despair → Acceptance (Hayes - ACT Framework)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Despair'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Acceptance'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Peace'),
    
    'Acceptance is the release of struggle against what is. From despair''s "nothing will ever change" to acceptance''s "I can be with what is," this waypoint enables peace by ending the war with reality.',
    
    'Despair is resistance compounded by hopelessness. Acceptance must come before peace because you cannot find peace while actively fighting reality. This is the core of ACT (Acceptance & Commitment Therapy).',
    
    'Acceptance creates the foundation for peace by ending experiential avoidance. When we stop struggling with what is, peace becomes possible.',
    
    ARRAY[
        'Lessened the struggle against reality',
        'Reduced exhaustion from resistance',
        'Beginning to make space for what is',
        'Decreased need to control the uncontrollable'
    ],
    
    'Hayes (ACT) shows that experiential avoidance and struggle increase suffering. Acceptance - willingness to experience - is prerequisite for values-based action and peace.',
    
    ARRAY[
        'Ability to be with difficult experiences without struggle',
        'Reduced need to fix or change everything',
        'Space for what is, even if painful',
        'Foundation for peace and equanimity'
    ],
    
    'Acceptance doesn''t mean liking what is - it means ending the additional suffering of resistance. This creates the psychological space where peace can emerge.',
    
    ARRAY[
        'Noticing less internal struggle',
        'Feeling exhausted from fighting reality',
        'Willingness to try acceptance practices',
        'Recognition that resistance hasn''t worked',
        'Small moments of "okay with what is"'
    ],
    
    ARRAY[
        '⚠️ Acceptance ≠ resignation or giving up on change',
        '⚠️ Acceptance ≠ approving of what happened',
        '⚠️ If trauma: Acceptance requires safety first',
        '⚠️ Professional ACT therapy can help guide this process'
    ],
    
    '[
        {
            "author": "Steven Hayes",
            "year": 1999,
            "work": "Acceptance and Commitment Therapy",
            "key_finding": "Psychological flexibility through acceptance of internal experiences enables valued living."
        }
    ]'::jsonb,
    
    180
);

-- Template 4: Anger → Curiosity (Interrupt Rumination)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Anger'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Curiosity'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Understanding'),
    
    'Curiosity interrupts anger''s rumination loop. By shifting from "they''re wrong" to "I wonder why," curiosity opens the door to understanding and breaks the cycle of blame and resentment.',
    
    'Anger keeps us in righteous certainty and blame. Curiosity must come before understanding because it creates the mental flexibility needed to see other perspectives. You can''t understand while angry.',
    
    'Curiosity enables understanding by creating openness where anger creates closure. It shifts from "I know they''re wrong" to "I wonder what''s really happening here."',
    
    ARRAY[
        'Shifted from certainty to openness',
        'Lessened the grip of righteous anger',
        'Began to wonder rather than condemn',
        'Reduced rumination on grievances'
    ],
    
    'Anger activates the "I''m right, they''re wrong" narrative. Curiosity provides the cognitive flexibility necessary to move beyond this binary thinking toward genuine understanding.',
    
    ARRAY[
        'Ability to wonder "why" rather than just condemn',
        'Openness to multiple perspectives',
        'Capacity to hold complexity',
        'Movement toward understanding and empathy'
    ],
    
    'Curiosity creates the psychological space where understanding becomes possible. It doesn''t invalidate your anger - it transcends it.',
    
    ARRAY[
        'The intensity of anger has lessened',
        'You''re willing to explore "why"',
        'Interest in understanding emerges',
        'Less attachment to "being right"',
        'Able to tolerate ambiguity'
    ],
    
    ARRAY[
        '⚠️ If anger is protective: Honor its message first',
        '⚠️ If boundary violation: Assert boundary before curiosity',
        '⚠️ Curiosity doesn''t mean excusing harmful behavior',
        '⚠️ If trauma-based anger: Process with support first'
    ],
    
    '[
        {
            "author": "Brené Brown",
            "year": 2021,
            "work": "Atlas of the Heart",
            "key_finding": "Curiosity is the bridge from anger to empathy and understanding."
        }
    ]'::jsonb,
    
    150
);

-- Template 5: Anxiety → Awe (Perspective Shift)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Anxiety'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Awe'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Peace'),
    
    'Awe provides the perspective shift that reduces anxiety''s self-focused worry. By encountering something vast, you move from "catastrophic thinking about ME" to "wow, I''m part of something bigger." The reduction in self-focus is the therapeutic mechanism.',
    
    'Anxiety keeps attention narrowly focused on threats to self. Awe must come before peace because it breaks the self-focused rumination that maintains anxiety. You need the perspective shift first.',
    
    'Awe enables peace by reducing the intensity of self-focused concern. When you feel connected to something larger, your worries naturally find their proper proportion.',
    
    ARRAY[
        'Reduced catastrophic thinking about self',
        'Shift from "what if" loops to present moment',
        'Decreased self-focused attention',
        'Connection to something beyond immediate concerns'
    ],
    
    'Anxiety research shows self-focused attention maintains worry. Awe - the experience of vastness - reduces self-focus and anxiety. This creates space for peace.',
    
    ARRAY[
        'Perspective on worries (they seem smaller)',
        'Reduced urgency and catastrophizing',
        'Felt sense of being held by something larger',
        'Natural calming without effort'
    ],
    
    'Awe naturally reduces arousal and broadens perspective. This physiological and cognitive shift creates the conditions where peace emerges organically.',
    
    ARRAY[
        'Anxiety intensity has decreased slightly',
        'Willing to pause worry briefly',
        'Can access a moment of wonder',
        'Nature, art, or music feels appealing',
        'Some distance from anxious thoughts'
    ],
    
    ARRAY[
        '⚠️ If panic-level anxiety: Regulate arousal first',
        '⚠️ If safety concerns real: Address those before awe',
        '⚠️ Awe is accessible but requires momentary presence',
        '⚠️ Don''t force it - let awe arise naturally'
    ],
    
    '[
        {
            "author": "Dacher Keltner",
            "year": 2023,
            "work": "Awe: The New Science of Everyday Wonder",
            "key_finding": "Awe reduces self-focus, decreases anxiety, and promotes prosocial behavior."
        },
        {
            "author": "Brené Brown",
            "year": 2021,
            "work": "Atlas of the Heart",
            "key_finding": "Awe is a universal access point - available from almost any emotional state."
        }
    ]'::jsonb,
    
    170
);

-- Template 6: Grief → Acceptance → Peace
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Grief'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Acceptance'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Peace'),
    
    'Acceptance is the gateway from grief to peace. It represents the shift from "I don''t want this loss" to "this is the reality I''m living with." Acceptance doesn''t mean the loss is okay - it means you stop fighting that it happened.',
    
    'Grief involves protest against loss. Acceptance must precede peace because you cannot find peace while actively resisting reality. Acceptance acknowledges the loss without approving of it.',
    
    'Acceptance enables peace by ending the additional suffering of resistance. Grief''s pain remains, but the struggle against it ceases, creating space for peace.',
    
    ARRAY[
        'Lessened the fight against the loss',
        'Reduced "if only" and "what if" thinking',
        'Beginning to live with rather than against reality',
        'Moments of not being consumed by grief'
    ],
    
    'Grief research shows acceptance is not betrayal of the deceased or giving up. It''s acknowledging reality so you can integrate the loss and continue living.',
    
    ARRAY[
        'Capacity to hold loss without being destroyed by it',
        'Reduced struggle and resistance',
        'Space for peace alongside grief',
        'Ability to honor the loss while living'
    ],
    
    'Acceptance creates the psychological space where you can feel grief without being overwhelmed by it. This allows peace to coexist with ongoing love and loss.',
    
    ARRAY[
        'Exhausted from fighting reality',
        'Willingness to try "living with" rather than "fighting against"',
        'Small moments of acceptance',
        'Recognition that resistance adds suffering',
        'Readiness to honor loss differently'
    ],
    
    ARRAY[
        '⚠️ Acceptance takes time - no rushing grief',
        '⚠️ If complicated grief: Professional support helpful',
        '⚠️ Acceptance ≠ forgetting or moving on',
        '⚠️ You can accept and still feel pain'
    ],
    
    '[
        {
            "author": "David Kessler",
            "year": 2019,
            "work": "Finding Meaning: The Sixth Stage of Grief",
            "key_finding": "Acceptance is finding a way to live with grief, not eliminating it."
        }
    ]'::jsonb,
    
    160
);

-- Template 7: Envy → Gratitude (Reframe)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Envy'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Gratitude'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Joy'),
    
    'Gratitude interrupts envy''s scarcity mindset. By shifting attention from "what they have that I lack" to "what I have that brings value," gratitude creates abundance thinking that enables joy.',
    
    'Envy fixates on lack and comparison. Gratitude must come before joy because it shifts the fundamental lens from scarcity to abundance, from comparison to appreciation.',
    
    'Gratitude enables joy by retraining attention toward what''s good and valuable in your life, rather than what you lack relative to others.',
    
    ARRAY[
        'Shifted from scarcity to abundance mindset',
        'Reduced comparative thinking',
        'Increased awareness of what you have',
        'Lessened resentment about what others have'
    ],
    
    'Envy research shows it stems from upward social comparison and perceived scarcity. Gratitude practices directly counter this by focusing on present abundance.',
    
    ARRAY[
        'Natural positive emotions about your own life',
        'Reduced need for comparison',
        'Genuine happiness (not dependent on others lacking)',
        'Capacity for authentic joy'
    ],
    
    'Gratitude rewires attention patterns. Regular gratitude practice makes joy more accessible and reduces vulnerability to envy.',
    
    ARRAY[
        'Envy feels less consuming',
        'You can name things you''re grateful for',
        'Willing to shift attention to your own life',
        'Comparison thinking has lessened',
        'Able to appreciate without comparing'
    ],
    
    ARRAY[
        '⚠️ Gratitude ≠ toxic positivity or bypassing real concerns',
        '⚠️ If systemic inequality: Anger may be appropriate',
        '⚠️ Don''t use gratitude to shame yourself about envy',
        '⚠️ Start small - one thing at a time'
    ],
    
    '[
        {
            "author": "Robert Emmons",
            "year": 2007,
            "work": "Thanks! How Practicing Gratitude Can Make You Happier",
            "key_finding": "Gratitude increases wellbeing by shifting attention from what we lack to what we have."
        }
    ]'::jsonb,
    
    140
);

-- Template 8: Fear → Courage (Opposite Poles)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Fear'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Courage'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Confidence'),
    
    'Courage is not the absence of fear - it''s action despite fear. This waypoint represents the moment you choose to move forward even while afraid, which builds the foundation for confidence.',
    
    'Fear demands avoidance. Courage comes before confidence because confidence is built through courageous action in the face of fear. You can''t think your way to confidence - you must act your way there.',
    
    'Courage enables confidence by providing lived experience that "I can do hard things even when afraid." Each courageous act builds the evidence base for confidence.',
    
    ARRAY[
        'Chose action despite fear',
        'Faced rather than avoided the feared situation',
        'Experienced that fear won''t destroy you',
        'Began to trust yourself in difficulty'
    ],
    
    'Research on exposure therapy and values-based action shows courage (willingness + action) is the pathway through fear. Confidence emerges from repeated courageous experience.',
    
    ARRAY[
        'Belief in your capacity to handle challenges',
        'Reduced avoidance behaviors',
        'Trust in yourself',
        'Freedom from fear''s restrictions'
    ],
    
    'Courage provides the experiential evidence that you can handle what you fear. This lived experience becomes confidence - trust in your ability to cope.',
    
    ARRAY[
        'Fear is present but not paralyzing',
        'You value something more than avoiding fear',
        'Willing to take small courageous action',
        'Can imagine doing the thing you fear',
        'Support system in place'
    ],
    
    ARRAY[
        '⚠️ Start small - don''t jump to biggest fear',
        '⚠️ If trauma-based fear: Work with therapist',
        '⚠️ Courage ≠ recklessness (assess real risks)',
        '⚠️ If safety genuinely threatened: Wisdom over courage'
    ],
    
    '[
        {
            "author": "Brené Brown",
            "year": 2018,
            "work": "Dare to Lead",
            "key_finding": "Courage is a collection of four skill sets: vulnerability, living into our values, braving trust, rising from failure."
        }
    ]'::jsonb,
    
    150
);

-- Template 9: Guilt → Amends (Repair)
INSERT INTO waypoint_explanation_templates (
    from_emotion_id,
    waypoint_emotion_id,
    to_emotion_id,
    psychological_purpose,
    why_this_order,
    what_it_enables,
    previous_what_changed,
    previous_why_necessary,
    next_what_enabled,
    next_how_prepares,
    readiness_signs,
    warning_signs,
    research_citations,
    priority
) VALUES (
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Guilt'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Amends'),
    (SELECT id FROM atlas_definitions WHERE emotion_name = 'Relief'),
    
    'Amends is the behavioral bridge from guilt to relief. Guilt says "I did something bad." Amends says "I''m taking responsibility and repairing." This action-taking transforms guilt into growth.',
    
    'Guilt without amends can become rumination or shame. Amends must come between guilt and relief because relief without repair would be avoidance. Genuine amends allow for authentic relief.',
    
    'Amends enables relief by addressing the source of guilt through responsibility and repair. This transforms guilt from a stuck state to a growth opportunity.',
    
    ARRAY[
        'Moved from ruminating to action-taking',
        'Took responsibility without collapsing into shame',
        'Made repair attempts where possible',
        'Shifted from stuck to forward movement'
    ],
    
    'Guilt is the moral emotion that says we violated our values. Amends - making things right - is the natural resolution. Without repair, guilt becomes toxic. With repair, it becomes growth.',
    
    ARRAY[
        'Genuine relief (not just avoidance)',
        'Self-forgiveness becomes possible',
        'Restored relationships or integrity',
        'Freedom from guilt''s burden'
    ],
    
    'Amends create the psychological conditions for relief by addressing the actual cause of guilt. This is authentic resolution, not bypassing.',
    
    ARRAY[
        'Clear about what you did wrong',
        'Willingness to take responsibility',
        'Readiness to make repair (even if uncomfortable)',
        'Able to tolerate potential rejection of amends',
        'Motivated by repair, not just guilt relief'
    ],
    
    ARRAY[
        '⚠️ If amends would cause more harm: Don''t make them',
        '⚠️ If other person unsafe: Your recovery doesn''t require their forgiveness',
        '⚠️ Amends ≠ self-punishment',
        '⚠️ If guilt is shame disguised: Address shame first',
        '⚠️ Living amends (changed behavior) > verbal apology'
    ],
    
    '[
        {
            "author": "Harriet Lerner",
            "year": 2017,
            "work": "Why Won''t You Apologize?",
            "key_finding": "True amends require taking responsibility, expressing regret, and changing behavior."
        }
    ]'::jsonb,
    
    140
);

-- Log successful seed
SELECT COUNT(*) as "Waypoint Templates Seeded" FROM waypoint_explanation_templates;
