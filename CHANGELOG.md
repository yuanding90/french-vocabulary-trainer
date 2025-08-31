# French Vocabulary Trainer - Changelog & Progress Tracker

## Project Overview
French Vocabulary Trainer with comprehensive deck system, spaced repetition learning, and multiple study modes.

## Completed Changes

### ✅ Step 1: Choose Deck at the Top (Commit: eba8202)
**Date:** Current Session
**Changes:**
- Added prominent "Choose Deck" card at the very top of the dashboard
- Shows current deck name with difficulty level
- "Choose Deck" or "Change Deck" button
- Renamed old "Current Deck" section to "Deck Progress"
- Cleaned up layout and spacing

### ✅ Step 2: Compact Deck List (Commit: 0805657)
**Date:** Current Session
**Changes:**
- Changed from 2-column grid to single column layout (one deck per row)
- Added compact design with reduced padding
- Implemented colored progress bar visualization:
  - Unseen (gray)
  - Learning (orange) 
  - Strengthening (yellow)
  - Mastered (green)
- Immediate return to dashboard when deck is clicked (removed "Continue" button)
- Added numerical deck sorting (Deck 1, 2, 3... instead of 1, 10, 11)
- Progress stats displayed below each progress bar
- Total word count display on right side

## Previous Session Changes (Before Rollback)

### Database & Backend
- ✅ Created comprehensive vocabulary decks (16 decks) from local SQLite files
- ✅ Migrated vocabulary data to Supabase
- ✅ Set up user progress tracking tables
- ✅ Fixed RLS policies for production deployment
- ✅ Removed "French Basics" decks as requested
- ✅ Fixed user_progress table constraints for upsert operations

### Authentication
- ✅ Integrated Google OAuth sign-in
- ✅ Removed Apple sign-in option
- ✅ Fixed OAuth redirect URLs for Vercel deployment
- ✅ Updated auth callback route for SSR compatibility

### Deployment
- ✅ Deployed to Vercel successfully
- ✅ Fixed RLS unrestricted issues
- ✅ Created fresh Git repository
- ✅ Verified no sensitive data in commits

## Pending Changes (To-Do List)

### 🔄 Step 3: Move Learning Types to Bottom
**Status:** Ready to implement
**Changes needed:**
- Move "Learning Types Configuration" section to the bottom of the dashboard
- Keep current functionality intact

### 🔄 Step 4: Add Queue Status Section
**Status:** Ready to implement  
**Changes needed:**
- Add "Queue Status" section at the very bottom
- Display: Due Now, Due Soon, Practice, Unseen
- Show actual queue numbers (not always 0)
- Similar to French app HTML file reference

### 🔄 Step 5: Discovery Session Improvements
**Status:** Ready to implement
**Changes needed:**
- Remove progress bar on top
- Remove duplicate Learn/Know stats bars
- Put English translation below French word
- Remove "listen to pronunciation" button
- Add pronunciation icon next to French word
- Make font bigger for French sentence and English translation
- Add pronunciation icon for English translation
- Filter out words already learned

### 🔄 Step 6: Review Session Improvements
**Status:** Ready to implement
**Changes needed:**
- Implement flash card design with flip animation
- Put "not quite/correct" on top of French vocabulary
- Make status font smaller
- Remove duplicate French word on top
- Add pronunciation options for French word, translation, example sentence
- Add/Remove from Leeches option
- Show if word is already in Leeches list

### 🔄 Step 7: Dashboard Metrics Fixes
**Status:** Ready to implement
**Changes needed:**
- Review box: Show Due Now/Due Soon numbers in order
- Discovery box: Show Unseen numbers
- Fix queue numbers (currently showing 0)
- Change "Queue States" to "Queue Status"

### 🔄 Step 8: Deep Dive Session Improvements
**Status:** Ready to implement
**Changes needed:**
- Use dropdown menu for category selection
- Options: leeches, learning, strengthening, consolidating

### 🔄 Step 9: Visual Button Improvements
**Status:** Ready to implement
**Changes needed:**
- Start Review button (blue, Play icon)
- Start Discovery button (green, Target icon)  
- Start Deep Dive button (purple, Brain icon)

### 🔄 Step 10: Study Session SRS Logic
**Status:** Ready to implement
**Changes needed:**
- Implement proper SRS calculations
- Fix metrics calculation for dashboard
- Ensure user progress data is correctly processed

## Technical Notes

### Database Schema
- `vocabulary_decks`: Deck information
- `vocabulary`: Individual vocabulary words
- `deck_vocabulary`: Relationship between decks and words
- `user_progress`: Individual word progress for users
- `user_deck_progress`: Overall deck progress for users
- `study_sessions`: Session tracking

### Key Features Implemented
- Spaced Repetition System (SRS)
- Multiple study modes (Review, Discovery, Deep Dive)
- Progress tracking and visualization
- OAuth authentication
- Responsive design

### Known Issues
- Dashboard metrics sometimes show 0 (needs investigation)
- Queue numbers not updating correctly
- Some visual layout issues in study sessions

## Future Enhancements (Post-Core Features)
- [ ] Export progress data
- [ ] Statistics and analytics
- [ ] Custom deck creation
- [ ] Social features (leaderboards, sharing)
- [ ] Mobile app version
- [ ] Offline mode
- [ ] Multiple language support

## Development Environment
- **Framework:** Next.js 15.5.2 with TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with Google OAuth
- **Deployment:** Vercel
- **Styling:** Tailwind CSS
- **State Management:** Zustand

## Git History
- `c7226ec` - Initial commit: French Vocabulary Trainer with comprehensive deck system
- `03f04f3` - Add Google and Apple OAuth sign-in methods
- `877173f` - Fix OAuth redirect URLs to use Vercel domain
- `39c7cfb` - Add debugging and environment-aware redirect URLs
- `b22a57a` - Remove Apple sign-in option
- `ea9dc8f` - Force new deployment to clear cache
- `eba8202` - Step 1: Choose Deck at the top
- `0805657` - Step 2: Compact Deck List

---
*Last Updated: Current Session*
*Next Step: Step 3 - Move Learning Types to Bottom*
