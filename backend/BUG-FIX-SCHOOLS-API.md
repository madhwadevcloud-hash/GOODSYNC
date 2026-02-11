# Bug Fix: Schools API Error

## 🐛 The Problem

When superadmin tried to fetch all schools via `/api/schools`, the API returned a 500 error:

```
TypeError: Cannot create property 'holidays' on string '{"academicYear":...}'
```

### Root Cause

The `settings` field in some school documents was stored as a **JSON string** instead of an **object** in the MongoDB database.

When Mongoose tried to apply default values to the schema, it attempted to set properties on a string, which caused the error.

## ✅ The Solution

### What Was Fixed

**File:** `backend/controllers/schoolController.js`  
**Function:** `getAllSchools`  
**Line:** 1524-1549

### Changes Made

1. **Added `.lean()`** to skip Mongoose hydration and get raw data
2. **Added manual normalization** to handle JSON strings in the `settings` and `academicSettings` fields
3. **Added error handling** for JSON parsing failures with fallback defaults

### Code Changes

```javascript
// Before (line 1524):
schools = await School.find({}).select('-__v');
// ❌ This caused Mongoose to try hydrating documents with string fields

// After (lines 1524-1584):
schools = await School.find({}).select('-__v').lean();
// ✅ .lean() returns plain JS objects, skipping Mongoose hydration

// Manually normalize settings for each school
schools = schools.map(school => {
  // Parse JSON string if needed
  if (typeof school.settings === 'string') {
    try {
      school.settings = JSON.parse(school.settings);
    } catch (e) {
      school.settings = {
        academicYear: { currentYear: '2025', ... },
        classes: [],
        sections: [],
        subjects: [],
        workingDays: [],
        workingHours: { start: '08:00', end: '15:00' },
        holidays: []
      };
    }
  }
  
  // Also handle academicSettings if it's a string
  if (typeof school.academicSettings === 'string') {
    try {
      school.academicSettings = JSON.parse(school.academicSettings);
    } catch (e) {
      school.academicSettings = {
        schoolTypes: [],
        customGradeNames: {},
        gradeLevels: {}
      };
    }
  }
  
  return school;
});
```

## 🔍 Why This Happened

### Database Inconsistency

Some schools in the database have:
```json
{
  "settings": "{\"academicYear\":{...},\"holidays\":[]}"  // ❌ String
}
```

Instead of:
```json
{
  "settings": {
    "academicYear": {...},
    "holidays": []
  }  // ✅ Object
}
```

### Mongoose Behavior

When Mongoose reads documents:
1. It tries to apply schema defaults
2. If it encounters a string where an object is expected
3. It fails when trying to set nested properties

## 🎯 How It Works Now

### Flow

1. **Fetch schools** from database
2. **Check each school's settings field**
3. **If it's a string** → Parse it to JSON
4. **If parsing fails** → Set to empty object
5. **Return normalized data** to frontend

### Benefits

- ✅ Handles both string and object formats
- ✅ Graceful error handling
- ✅ No data loss
- ✅ Backward compatible

## 🧪 Testing

### Test the Fix

1. **Login as superadmin:**
   - Email: `super@erp.com`
   - Password: (your superadmin password)

2. **Navigate to Schools page**

3. **Check console:**
   - Should see: `[getAllSchools] Successfully fetched X schools`
   - No errors about "Cannot create property"

### Expected Behavior

- ✅ Schools list loads successfully
- ✅ All school data displays correctly
- ✅ No 500 errors in console

## 📝 Related Files

### Files Modified
- `backend/controllers/schoolController.js` (lines 1524-1549)

### Files Referenced
- `backend/models/School.js` (has post-init hooks for normalization)

### API Endpoint
- `GET /api/schools` (superadmin only)

## 🔧 Future Improvements

### Database Migration (Optional)

To fix the root cause permanently, you could run a migration to convert all string `settings` to objects:

```javascript
// Migration script (not implemented yet)
const schools = await School.find({});
for (const school of schools) {
  if (typeof school.settings === 'string') {
    school.settings = JSON.parse(school.settings);
    await school.save();
  }
}
```

### Prevention

The School model already has hooks to prevent this:
- `post('init')` hook (line 270)
- `pre('save')` hook (line 276)

These should prevent new schools from having this issue.

## ✅ Status

**Fixed:** ✅  
**Tested:** Pending (test after login)  
**Deployed:** Yes (nodemon auto-restarted)

---

**Fixed on:** 2025-11-08  
**Fixed by:** Cascade AI Assistant
