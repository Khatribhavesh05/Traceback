# **App Name**: Traceback

## Core Features:

- Report Lost Item: Form to submit details of a lost item, including category, date, description, location, contact info, and an optional image.
- Report Found Item: Form to submit details of a found item, similar to the lost item form, including category, date, description, location, contact info, and an optional image.
- Image Upload: Optional image upload with size and format restrictions, progress indicator, and error handling.
- Matching Algorithm: Algorithm to find potential matches between lost and found items based on item category, description similarity (using a tool such as embeddings and vector similarity), and location.
- Display Matching Results: Display matching results in a clear, card-based UI, showing relevant information from both the lost and found item reports.
- Client-Side Storage: Store report data temporarily on the client-side to allow users to check their inputs before sending. Data persists for at most one browser session.

## Style Guidelines:

- Primary color: Soft Indigo (#667EEA) to convey calmness and reliability.
- Background color: Light gray (#F7FAFC) for a clean, light aesthetic.
- Accent color: Slate Blue (#4A5568) for form elements and important actions.
- Body and headline font: 'Inter' (sans-serif) for a modern, clean, and readable interface.
- Code Font: 'Source Code Pro' (monospace) only if the app were to display technical content such as debugging logs.
- Simple, outlined icons from a set like Material Design Icons for item categories and UI actions.
- Centered forms with clear spacing and a mobile-first, responsive design.
- Subtle fade-in animations and loading spinners for a smooth user experience.