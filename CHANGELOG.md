# French Vocabulary Trainer - Changelog & Progress Tracker

## Project Overview
French Vocabulary Trainer with comprehensive deck system, spaced repetition learning, and multiple study modes.

## Completed Changes

### ✅ PRIORITY 1: Deep Dive Session - Category Selection (Commit: 04bab3a)
**Date:** Current Session
**Changes:**
- Added dropdown menu for category selection on Dashboard (not in session)
- Options: leeches, learning, strengthening, consolidating
- Start Deep Dive button disabled until category is selected
- Passed deepDiveCategory prop to StudySession component
- Updated loadSessionWords to filter based on selected category

### ✅ PRIORITY 2: Review Session - Leeches Management (Commit: 3a8af20)
**Date:** Current Session
**Changes:**
- Added pronunciation options for all elements (French word, translation, example sentence)
- Added "Add to Leeches" button (red, AlertTriangle icon) for words not in leeches
- Added "Remove from Leeches" button (green, Check icon) for words already in leeches
- Implemented markWordAsLeech and removeWordFromLeech functions
- Removed repetitive stats display at bottom
- Enhanced Review Card layout with better organization

### ✅ PRIORITY 3: Dashboard Metrics Fixes (Commit: 535308b)
**Date:** Current Session
**Changes:**
- Added queue numbers to Review box (Due Now/Due Soon in order)
- Added queue numbers to Discovery box (Unseen count)
- Added debugging logs for queue calculation
- Fixed queue numbers display in session cards

### ✅ Step 4: Discovery Session Improvements (Commit: 578e1c8)
**Date:** Current Session
**Changes:**
- Removed progress bar on top
- Removed duplicate Learn/Know stats bars
- Put English translation below French word
- Removed "listen to pronunciation" button
- Added pronunciation icon next to French word
- Made font bigger for French sentence and English translation
- Added pronunciation icon for English translation
- Filtered out words already learned in discovery sessions
- Reorganized layout for better visual hierarchy

### ✅ NEW PRIORITY: Dashboard Layout Improvements (Commit: 397024c)
**Date:** Current Session
**Changes:**
- Removed Quick Actions bar entirely from landing page
- Moved Recent Activity below Current Deck and above Deck Progress
- Put Unseen/Leeches/Learning etc. inside Deck Progress section
- Added progress bar to Deck Progress
- Removed Total words/mastered/progress display
- Enhanced visualization buttons for Review/Discovery/Deep Dive with colors and icons

### ✅ Dashboard Layout: Recent Activity Positioning (Commit: e57791f)
**Date:** Current Session
**Changes:**
- Moved Recent Activity to the very top above Current Deck
- Made Recent Activity more compact with smaller text and shorter labels
- Added colored metrics (blue Today, green 7 Days, purple 30 Days, orange Streak)

### ✅ Dashboard Layout: Button Alignment & Header (Commit: 801d50f)
**Date:** Current Session
**Changes:**
- Aligned Start Review/Discovery/Deep Dive buttons horizontally using flexbox
- Added back "Recent Activity" header with Activity icon
- Used flex layout to ensure consistent button positioning across all session cards

### ✅ Step 5: Review Session Flash Card Design (Commit: 710a61b, c48598f, 366abdc)
**Date:** Current Session
**Changes:**
- Implemented flash card design with flip animation using CSS transforms
- Put "not quite/correct" status on top of French vocabulary with smaller font
- Removed duplicate French word from header
- Created card flip effect when "Check Answer" is clicked
- Increased font sizes on back side for better visibility (French: text-6xl, English: text-4xl, Example: text-xl)
- Fixed leech button size and border overlap issues
- Made leech buttons larger with better visual hierarchy (full-width, text-xl, larger icons)
- Removed Session Summary line from progress visualization for cleaner look

### ✅ Review Session Progress Visualization (Commit: 41f5ec4)
**Date:** Current Session
**Changes:**
- Added dynamic progress visualization at top of review sessions
- 6-column grid showing: Remaining, Again, Hard, Good, Easy, Reviewed
- Real-time updates as user progresses through session
- Color-coded categories matching rating button colors
- Removed redundant Session Summary line for cleaner look

### ✅ Review Session Fallback Hierarchy (Commit: 79f22b7)
**Date:** Current Session
**Changes:**
- Implemented three-tier fallback system for review sessions:
  1. Due Now words (overdue for review)
  2. Due Soon words (coming up in next 24 hours)
  3. Unseen words (never studied before)
- Added console logging to track which word category is being used
- Automatic fallback when no words available in higher priority tiers
- Integration with discovery sessions (reviewed words excluded from discovery)

### ✅ Step 1: Choose Deck at the Top (Commit: eba8202)
**Date:** Previous Session
**Changes:**
- Added prominent "Choose Deck" card at the very top of the dashboard
- Shows current deck name with difficulty level
- "Choose Deck" or "Change Deck" button
- Renamed old "Current Deck" section to "Deck Progress"
- Cleaned up layout and spacing

### ✅ Step 2: Compact Deck List (Commit: 0805657)
**Date:** Previous Session
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

### 🔄 Step 6: Study Session SRS Logic - COMPREHENSIVE FIXES
**Status:** Analysis Complete - Ready to implement
**Priority:** HIGH - Critical for proper spaced repetition

#### **Database Schema Updates:**
- [ ] **Add `repetitions` column to `user_progress` table**
  - Field: `repetitions INTEGER DEFAULT 0`
  - Purpose: Track how many times a word has been successfully reviewed
  - Required for proper SRS interval calculations

- [ ] **Create `rating_history` table**
  - Fields: `id`, `word_id`, `rating`, `timestamp`
  - Purpose: Track consecutive ratings for leech removal logic
  - Required for sophisticated leech management

#### **SRS Algorithm Fixes:**
- [ ] **Fix interval calculation for new words**
  - Current: Always uses `Math.floor(currentInterval * easeFactor)`
  - Required: 
    - `repetitions === 0`: `interval = 1`
    - `repetitions === 1`: `interval = 6`
    - `repetitions > 1`: `interval = Math.ceil(interval * ease_factor)`

- [ ] **Fix ease factor calculation**
  - Current: Simple increments/decrements
  - Required: Complex formula: `ease_factor + (0.1 - (5 - ratingValue) * (0.08 + (5 - ratingValue) * 0.02))`
  - Rating values: hard=3, good=4, easy=5

- [ ] **Fix hard rating logic**
  - Current: `Math.floor(currentInterval * 0.6)`
  - Required: `Math.max(1, Math.ceil(interval / 2))`

- [ ] **Add repetitions tracking to SRS logic**
  - Increment repetitions on 'good' or 'easy' ratings
  - Reset repetitions to 0 on 'again' rating
  - Use repetitions for interval calculations

#### **Leech Management Enhancements:**
- [ ] **Implement leech removal logic**
  - Remove from leeches after 2 consecutive 'easy' ratings
  - Only if interval >= 7 days
  - Reset `again_count` to 0

- [ ] **Add rating history tracking**
  - Log every rating with timestamp
  - Track last 10 ratings for leech removal decisions
  - Store in `rating_history` table

- [ ] **Implement leech spacing in queue building**
  - Separate leeches from regular words
  - Insert leeches every 3-5 regular words
  - Prevent leech fatigue

#### **Queue System Improvements:**
- [ ] **Enhance near future queue logic**
  - Current: Uses `isNearFuture()` function
  - Required: Check if due within next 24 hours
  - Add visual indicators for near future words

- [ ] **Fix queue numbers display**
  - Debug why metrics show 0
  - Ensure proper queue calculation
  - Add queue debug panel

#### **Code Structure Updates:**
- [ ] **Update `saveWordProgress` function**
  - Add repetitions logic
  - Implement proper SRS algorithm
  - Add rating history logging

- [ ] **Update `SessionQueueManager`**
  - Add leech spacing logic
  - Enhance queue building
  - Fix metrics calculation

- [ ] **Add leech removal functions**
  - `removeFromLeech()` function
  - Rating history analysis
  - Automatic leech removal

#### **Testing & Validation:**
- [ ] **Test SRS algorithm accuracy**
  - Compare intervals with HTML app
  - Verify ease factor calculations
  - Test leech removal logic

- [ ] **Test queue building**
  - Verify leech spacing
  - Test near future queue
  - Validate metrics calculation

- [ ] **Performance optimization**
  - Optimize database queries
  - Reduce unnecessary recalculations
  - Add caching where appropriate

### 🔄 Step 7: Additional UI Polish
**Status:** Ready to implement
**Changes needed:**
- Add loading states for better UX
- Improve error handling and user feedback
- Add confirmation dialogs for important actions
- Optimize performance for large decks

### 🔄 Step 8: Advanced Features
**Status:** Future implementation
**Changes needed:**
- Export progress data functionality
- Statistics and analytics dashboard
- Custom deck creation
- Social features (leaderboards, sharing)

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

### SRS Logic Analysis (Current Session)
**Date:** Current Session
**Analysis:** Compared our SRS implementation with the HTML app's proven algorithm

#### **Critical Differences Found:**
1. **Missing Repetitions Tracking**: Our app doesn't track `repetitions` field, which is essential for proper interval calculations
2. **Incorrect SRS Algorithm**: Our ease factor and interval calculations don't match the proven HTML app algorithm
3. **Missing Leech Removal**: No sophisticated leech removal logic with rating history tracking
4. **Basic Queue Building**: No leech spacing or advanced queue management
5. **Incomplete Near Future Logic**: Near future queue logic needs enhancement

#### **HTML App SRS Algorithm (Reference):**
```javascript
// Proper interval calculation
if (repetitions === 0) interval = 1;
else if (repetitions === 1) interval = 6;
else interval = Math.ceil(interval * ease_factor);

// Proper ease factor calculation
const ratingValue = { hard: 3, good: 4, easy: 5 }[rating];
ease_factor = Math.max(MIN_EASE_FACTOR, ease_factor + (0.1 - (5 - ratingValue) * (0.08 + (5 - ratingValue) * 0.02)));

// Leech removal logic
if (wasLeech && rating === 'easy' && interval >= 7) {
  const recentRatings = getRecentRatings(wordId);
  if (recentRatings.length >= 2 && recentRatings.slice(-2).every(r => r === 'easy')) {
    again_count = 0; // Remove from leeches
  }
}
```

#### **Impact:**
- Users may experience suboptimal spaced repetition intervals
- Leech words may not be properly managed
- Queue building may not provide optimal learning experience
- Metrics may be inaccurate due to incorrect calculations

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
- `710a61b` - Flash Card: Increase font sizes on back side for better visibility
- `c48598f` - Flash Card: Fix leech button size and border overlap issues
- `366abdc` - Remove Session Summary line from review progress visualization
- `41f5ec4` - Add dynamic progress visualization to review sessions
- `79f22b7` - Implement review session fallback hierarchy: Due Now → Due Soon → Unseen words
- `1dd3242` - Update CHANGELOG.md with all recent completed features and commits

---
*Last Updated: Current Session*
*Next Step: Step 3 - Move Learning Types to Bottom*
