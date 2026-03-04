Product Requirements Document
Product Name: PromptFlow (Working Title)
Product Type: Web-Based Intelligent Teleprompter System
1. Product Overview

PromptFlow is a web-based teleprompter system that transforms raw text into speech-optimized reading format and delivers a smooth, customizable scrolling experience for speakers, creators, and presenters.

Unlike traditional teleprompters that only scroll text, PromptFlow restructures content into a natural spoken flow.

2. Problem Statement

Most teleprompter tools:

Only display pasted text

Do not optimize text for speech

Lack intelligent pacing

Have rigid keyboard controls

Provide limited customization

Speakers struggle with:

Long sentences

Poor breathing structure

Awkward phrasing for speech

Inconsistent pacing

PromptFlow solves this by formatting text for spoken delivery before displaying it.

3. Goals & Objectives
Primary Goals

Convert written text into speech-friendly format

Provide smooth auto-scroll teleprompter interface

Allow full hotkey customization

Enable professional recording setup compatibility

Success Criteria

User can paste text and start reading in under 10 seconds

User can fully control playback via keyboard

Text is broken into readable speech segments

Scroll performance is smooth at 60fps

4. Target Users

YouTubers

Podcasters

Startup founders pitching

Students presenting

Online educators

Public speakers

5. Core Features (MVP)
5.1 Text Input & Processing
User Flow

User pastes raw text

Clicks “Format for Speech”

System processes text

Teleprompter view loads optimized script

Processing Rules (MVP - Rule-Based)

Max 8–12 words per line

Break long sentences into shorter segments

Add line break after punctuation (. , ? !)

Insert blank line between logical thought groups

Remove excessive whitespace

Optionally simplify overly long sentences

Future (Phase 2)

AI rewrite modes:

Conversational

Formal speech

Motivational

Educational

Podcast tone

5.2 Teleprompter Display Engine
Display Requirements

Full screen mode

Center reading zone

Fading text above and below active line

Smooth vertical scroll

Adjustable margins

Adjustable Settings

Scroll speed (0.1x – 3x)

Font size

Font family

Line spacing

Background color

Text color

Mirror mode (horizontal flip)

Dark mode / Light mode

5.3 Playback Controls
Default Shortcuts

Play / Pause → Space

Speed Up → Arrow Up

Slow Down → Arrow Down

Scroll Back → Arrow Left

Scroll Forward → Arrow Right

Restart → R

5.4 Custom Hotkey Assignment
Requirements

User can assign custom keys for:

Play/Pause

Speed Up

Speed Down

Scroll Back

Scroll Forward

Restart

Prevent duplicate key assignments

Allow reset to default

Save preferences to user profile

Ignore shortcuts when user is typing in input field

Technical Behavior

Use keydown event listener

Store key mappings in user settings

Prevent default browser conflicts

Support Bluetooth clickers (arrow keys / page up/down)

5.5 Auto-Scroll Engine
Functional Requirements

Smooth scroll animation (requestAnimationFrame)

Adjustable speed multiplier

Pause retains exact scroll position

Resume continues seamlessly

Scroll position persists if page refresh (optional)

Advanced Option (Phase 2)

Word-by-word highlight

Active reading line focus

“Hold Shift to temporarily slow speed” feature

6. Non-Functional Requirements

Smooth performance at 60fps

Works on:

Chrome

Safari

Edge

Firefox

Responsive layout

No visible scroll jitter

Works offline (optional PWA mode)

7. Technical Architecture
7.1 Frontend

Recommended:

Next.js or React

Tailwind CSS

Zustand or Context for state management

Key Modules:

TextProcessor

TeleprompterEngine

ScrollController

HotkeyManager

SettingsPanel

7.2 Backend (Optional for MVP)

If AI formatting is added:

Node.js / Express API

Endpoint: /format-text

Accepts raw text

Returns structured formatted script

Otherwise MVP can be fully client-side.

8. Data Model
User

id

email

password (hashed)

created_at

UserSettings

user_id

scroll_speed_default

font_size

theme

mirror_mode

hotkeys (JSON)

line_spacing

Script

id

user_id

raw_text

formatted_text

created_at

updated_at

9. UX Requirements

Minimal interface

Large readable typography

Clear visual feedback when:

Paused

Playing

Speed changed

Subtle overlay showing current speed

Keyboard shortcut reminder overlay (toggleable)

10. Future Enhancements

AI voice pacing suggestions

Voice detection to auto-scroll based on speech

Cloud script library

Collaborative editing

Script version history

Analytics (reading speed, pause frequency)

Export to PDF

Mobile companion remote control

Desktop app version (Electron)

11. Risks & Mitigation
Risk	Mitigation
Scroll jitter	Use requestAnimationFrame
Hotkey conflicts	PreventDefault + custom mapping
Long text lag	Virtualized rendering
Browser key restrictions	Allow remapping
12. Monetization (If SaaS)

Free:

Basic teleprompter

Limited formatting

Default hotkeys only

Pro:

AI formatting modes

Save scripts

Cloud sync

Custom hotkeys

Advanced display modes

Remote device control

13. MVP Scope (Build Order)

Text input

Rule-based formatter

Teleprompter display

Scroll engine

Speed control

Default hotkeys

Custom hotkey assignment

Save settings locally

That’s your first shippable version.