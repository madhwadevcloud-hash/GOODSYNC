# Institute ERP System

A comprehensive Enterprise Resource Planning system for educational institutions with multi-tenant architecture, role-based access control, automated workflows, and complete school administration capabilities.

## 🏗️ System Architecture

### User Roles & Hierarchy
```
Super Admin (Platform Level)
├── Multi-School Management
├── Academic Configuration (Classes, Subjects, Tests)
├── School Creation & Administration
├── Platform-wide Settings & Analytics
└── Access Control Management

School Admin (School Level)
├── User Management (Teachers, Students, Parents)
├── Academic Operations (Attendance, Results, Assignments)
├── Fee Management (Structures, Payments, Receipts)
├── ID Card & Document Generation
├── Timetable Management
├── Student Promotion & Migration
├── Reports & Analytics
└── School Settings Configuration

Teacher (School Level)
├── Attendance Management (Session-based)
├── Assignment Creation & Grading
├── Result Entry & Management
├── Student Information Access
├── Timetable Viewing
└── Communication Portal

Student (School Level)
├── Academic Dashboard
├── Attendance & Results Viewing
├── Assignment Submission
└── Fee Status Tracking

Parent (School Level)
├── Child Progress Monitoring
├── Fee Payment & History
├── Communication with Teachers
└── Academic Reports Access
```

## ✨ Core Features

### 🎓 Academic Management
- **Multi-tenant Architecture**: Separate data isolation for each school
- **Class & Section Management**: Hierarchical class-section structure
- **Subject Management**: Class-wise subject mapping with teacher assignment
- **Academic Year Configuration**: Year-wise academic settings
- **Test Configuration**: Customizable test types and grading systems
- **Student Promotion**: Automated class promotion with data migration
- **Timetable Management**: Period-wise scheduling with teacher allocation

### 👥 User Management
- **Automated ID Generation**:
  - Students: `SCHOOL_CODE + YEAR + SEQUENCE` (e.g., NPS2024001)
  - Teachers: `SCHOOL_CODE + T + SEQUENCE` (e.g., NPST001)
  - Parents: `SCHOOL_CODE + P + SEQUENCE` (e.g., NPSP001)
- **Bulk Import/Export**: CSV-based user data management
- **Role-based Permissions**: Granular access control system
- **User Relationships**: Parent-student linking, teacher-subject mapping
- **Password Management**: Secure auto-generation and reset functionality

### 📊 Attendance System
- **Session-based Tracking**: Morning/Afternoon session support
- **Multiple Marking Methods**: Daily, weekly, monthly views
- **Real-time Statistics**: Attendance rate calculations
- **Visual Analytics**: Charts and graphs for attendance trends
- **Bulk Operations**: Mark attendance for entire class
- **Historical Records**: Complete attendance history with filters

### 📝 Results & Grading
- **Flexible Grading System**: Marks, grades, and percentages
- **Test-wise Result Entry**: Support for multiple test types
- **Subject-wise Performance**: Detailed subject analysis
- **Result Publishing**: Controlled result visibility
- **Performance Analytics**: Class-wise and student-wise reports
- **Grade Calculation**: Automated grade assignment based on marks

### 💰 Fee Management
- **Fee Structure Configuration**: Class-wise fee setup
- **Payment Processing**: Multiple payment modes support
- **Chalan/Receipt Generation**: PDF receipts with school branding
- **Payment History**: Complete transaction records
- **Fee Defaulter Reports**: Outstanding fee tracking
- **Discount Management**: Student-specific fee adjustments

### 🎫 ID Card System
- **Custom Template Design**: Upload custom ID card templates
- **Bulk Generation**: Generate ID cards for multiple students
- **Dual-side Support**: Front and back side templates
- **Orientation Options**: Landscape and portrait modes
- **Dynamic Field Placement**: Configurable text and photo positions
- **High-quality Output**: 300 DPI PNG images
- **Batch Download**: ZIP file export for bulk cards

### 📄 Document Templates
- **Admit Card/Hall Ticket**: Exam admit card generation
- **Certificates**: Achievement and participation certificates
- **ID Cards**: Student and staff identification cards
- **Fee Receipts**: Professional payment receipts
- **Custom Templates**: React-based template system

### 📧 Communication
- **Messaging System**: Internal messaging between roles
- **Announcements**: School-wide notifications
- **Parent Communication**: Direct teacher-parent messaging

### 📈 Reports & Analytics
- **Attendance Reports**: Class-wise and student-wise
- **Academic Performance**: Result analysis and trends
- **Fee Reports**: Collection and outstanding reports
- **User Statistics**: Role-wise user counts
- **Custom Reports**: Filterable and exportable data

## 🛠️ Technical Stack

### Backend
- **Runtime**: Node.js v16+
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs with salt rounds
- **File Upload**: Multer for multipart/form-data
- **Image Processing**: Sharp for ID card generation
- **PDF Generation**: PDFKit for receipts and documents
- **Archive Creation**: Archiver for ZIP file generation
- **CSV Processing**: csv-parse and csv-stringify

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Ant Design (antd)
- **Icons**: Lucide React, Ant Design Icons
- **Routing**: React Router DOM v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Notifications**: React Hot Toast, React Toastify
- **Printing**: React-to-Print
- **Testing**: Jest with React Testing Library

### Database Models (25 Models)
- User, School, Admission
- Class, Subject, ClassSubjects
- Attendance, Result, Assignment, Submission
- Timetable, TestDetails
- FeeStructure, StudentFeeRecord, Chalan
- IDCardTemplate, Message
- Counter (for ID generation)
- SuperAdmin

## 📁 Project Structure

```
ERP/
├── backend/
│   ├── config/              # Configuration files
│   ├── controllers/         # 33 API controllers
│   ├── middleware/          # Auth, permissions, validation
│   ├── models/              # 25 Mongoose models
│   ├── routes/              # 31 API route files
│   ├── utils/               # Helper utilities
│   │   ├── idGenerator.js
│   │   ├── passwordGenerator.js
│   │   ├── simpleIDCardGenerator.js
│   │   ├── gradeSystem.js
│   │   └── databaseManager.js
│   ├── scripts/             # Database scripts
│   └── server.js            # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── roles/
│   │   │   ├── admin/       # Admin dashboard & features
│   │   │   ├── superadmin/  # Super admin panel
│   │   │   ├── teacher/     # Teacher portal
│   │   │   └── student/     # Student portal
│   │   ├── components/      # Shared components
│   │   ├── api/             # API client services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript definitions
│   └── public/              # Static assets
│
└── MyApp/                   # Mobile app (React Native)
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login with role-based routing
- `POST /api/auth/register` - User registration

### Schools (Super Admin)
- `POST /api/schools` - Create new school
- `GET /api/schools` - List all schools
- `GET /api/schools/:id` - Get school details
- `PUT /api/schools/:id` - Update school
- `GET /api/schools/:schoolId/classes` - Get classes and sections

### Users & User Management
- `POST /api/users/teachers` - Add teacher
- `POST /api/users/students` - Add student with parent
- `POST /api/users/parents` - Add parent
- `GET /api/users` - Get users with filters
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/import` - Bulk import from CSV
- `GET /api/users/export` - Export users to CSV
- `PATCH /api/users/:id/reset-password` - Reset password
- `POST /api/users/promote` - Promote students to next class

### Admissions
- `POST /api/admissions` - Create admission
- `GET /api/admissions` - List admissions
- `PATCH /api/admissions/:id/approve` - Approve admission
- `PATCH /api/admissions/:id/reject` - Reject admission

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Attendance statistics
- `PUT /api/attendance/:id` - Update attendance
- `GET /api/attendance/student/:studentId` - Student attendance history

### Results
- `POST /api/results` - Create/update results
- `GET /api/results` - Get results with filters
- `GET /api/results/student/:studentId` - Student results
- `PATCH /api/results/:id/publish` - Publish results
- `DELETE /api/results/:id` - Delete result

### Assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - List assignments
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/submit` - Submit assignment

### Timetables
- `POST /api/timetables` - Create timetable
- `GET /api/timetables` - Get timetables
- `PUT /api/timetables/:id` - Update timetable
- `DELETE /api/timetables/:id` - Delete timetable

### Fees
- `POST /api/fees/structure` - Create fee structure
- `GET /api/fees/structure` - Get fee structures
- `POST /api/fees/payment` - Record payment
- `GET /api/fees/payments` - Payment history
- `GET /api/fees/defaulters` - Fee defaulters list

### Chalans/Receipts
- `POST /api/chalan` - Generate chalan
- `GET /api/chalan` - List chalans
- `GET /api/chalan/:id/pdf` - Download PDF receipt

### ID Cards
- `POST /api/idcard-templates` - Upload template
- `GET /api/idcard-templates` - List templates
- `POST /api/idcard-templates/generate` - Generate ID cards
- `POST /api/idcard-templates/download` - Download as ZIP

### Subjects (Super Admin)
- `POST /api/superadmin/subjects` - Create subject
- `GET /api/superadmin/subjects` - List subjects
- `PUT /api/superadmin/subjects/:id` - Update subject
- `DELETE /api/superadmin/subjects/:id` - Delete subject

### Classes (Super Admin)
- `POST /api/superadmin/classes` - Create class
- `GET /api/superadmin/classes` - List classes
- `PUT /api/superadmin/classes/:id` - Update class
- `POST /api/superadmin/classes/:id/sections` - Add sections

### Test Configuration (Super Admin)
- `POST /api/superadmin/tests` - Create test type
- `GET /api/superadmin/tests` - List test types
- `PUT /api/superadmin/tests/:id` - Update test type

### Reports
- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/results` - Result reports
- `GET /api/reports/fees` - Fee reports
- `GET /api/reports/analytics` - Dashboard analytics

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages` - Get messages
- `PATCH /api/messages/:id/read` - Mark as read

## 🔧 Setup Instructions

### Prerequisites
- Node.js v16 or higher
- MongoDB Atlas account (or local MongoDB)
- npm or yarn package manager

### Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Configure .env with:
# MONGODB_URI=your_mongodb_atlas_connection_string
# JWT_SECRET=your_secure_jwt_secret_key
# PORT=5000
# NODE_ENV=development

# Start development server
npm run dev

# Or start production server
npm start
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env file with:
# VITE_API_URL=http://localhost:5000

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Seeding (Optional)
```bash
cd backend
npm run seed              # Seed with sample data
npm run seed:reset        # Reset and seed database
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs with configurable salt rounds
- **JWT Authentication**: Secure token-based auth with expiration
- **Role-based Access Control**: Granular permission system
- **Input Validation**: Request data sanitization
- **CORS Protection**: Configured cross-origin policies
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **Session Management**: Secure token storage and refresh

## 🚀 Deployment

### Backend Deployment (Production)
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "erp-backend"
pm2 save
pm2 startup

# Environment variables
# Set production MongoDB URI
# Set strong JWT secret
# Configure CORS for production domain
```

### Frontend Deployment
```bash
# Build production bundle
npm run build

# Deploy to:
# - Vercel (recommended for React)
# - Netlify
# - Traditional hosting (serve dist folder)

# Configure environment variables in hosting platform
```

### Recommended Hosting
- **Backend**: Railway, Render, DigitalOcean, AWS EC2
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: MongoDB Atlas (managed)

## 📊 Key Workflows

### Student Admission Flow
1. Create admission application
2. Admin reviews and approves
3. System auto-generates Student ID
4. Creates parent account (if new)
5. Links student-parent relationship
6. Assigns to class and section
7. Generates fee structure

### Attendance Marking Flow
1. Teacher selects class and section
2. Chooses date and session
3. Marks present/absent for each student
4. System calculates attendance percentage
5. Updates student attendance records
6. Generates attendance reports

### Result Entry Flow
1. Admin configures test details
2. Teacher enters subject-wise marks
3. System calculates grades and percentages
4. Admin reviews and publishes results
5. Students/parents can view results
6. Generate result reports and analytics

### Fee Payment Flow
1. Admin creates fee structure for class
2. System assigns fees to students
3. Student/parent makes payment
4. Admin records payment with mode
5. System generates chalan/receipt PDF
6. Updates payment history
7. Tracks outstanding fees

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Backend tests (if configured)
cd backend
npm test
```

## 📈 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: API response caching for frequently accessed data
- **Lazy Loading**: Code splitting and lazy component loading
- **Image Optimization**: Sharp for efficient image processing
- **Pagination**: Large dataset pagination support
- **Query Optimization**: Efficient MongoDB aggregation pipelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Documentation

- **Issues**: Create an issue in the repository
- **Documentation**: Check individual .md files for specific features
- **Contact**: Reach out to the development team

## 🔄 Version History

- **v1.0.0** (2024): Initial release with core functionality
- **v1.1.0** (2024): Enhanced user management and admission system
- **v1.2.0** (2024): Role-based access control and security improvements
- **v1.3.0** (2025): ID card generation and template system
- **v1.4.0** (2025): Fee management and chalan system
- **v1.5.0** (2025): Advanced attendance tracking with sessions
- **v1.6.0** (2025): Student promotion and migration features

## 👨‍💻 Development Team

Institute ERP Team - Building the future of educational administration

---

**Note**: This is an active development project. Features and documentation are continuously updated.
